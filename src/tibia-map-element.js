/**
 * <tibia-map> — zero-dependency web component that renders the Tibia world map
 * using tile data from the tibiamaps project (https://tibiamaps.io).
 *
 * Attributes:
 *   center   "x,y,z"          Map center + floor (game coords, e.g. "32369,32241,7")
 *   zoom     0..4             Zoom level (scales 1,2,7,20,40 px per sqm). Default 2.
 *   height   CSS size         Height of the element. Default 300px.
 *   markers  JSON             [{"x":..,"y":..,"z":..,"label":".."}, ...]
 *   route    JSON             [{"x":..,"y":..,"z":..}, ...] — polyline drawn in order
 *   static   (boolean)        Present = no pan/zoom/floor interaction
 *
 * Tiles are hotlinked from https://tibiamaps.github.io/tibia-map-data/ (see their
 * repo for licensing). Coordinate system and zoom scales follow tibiamaps/tibia-map.
 */
const TILE_URL = "https://tibiamaps.github.io/tibia-map-data/mapper/Minimap_Color_";
const ZOOM_SCALES = [1, 2, 7, 20, 40];
const BOUNDS = { xMin: 31744, xMax: 34304, yMin: 30976, yMax: 33024 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class TibiaMapElement extends HTMLElement {
  static observedAttributes = ["center", "zoom", "markers", "route", "height", "static"];

  #canvas; #ctx; #tiles = new Map(); #raf = null;
  #cx = 32368; #cy = 32198; #floor = 7; #zoom = 2;
  #markers = []; #route = [];
  #drag = null; #tooltip;

  connectedCallback() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host { display: block; position: relative; height: 300px; }
      canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated;
               background: #111; border-radius: 6px; }
      .tt { position: absolute; display: none; pointer-events: none; background: rgba(0,0,0,.85);
            color: #fff; font: 12px system-ui, sans-serif; padding: 3px 7px; border-radius: 4px; z-index: 2; }
      .floor { position: absolute; right: 6px; top: 6px; display: flex; flex-direction: column;
               gap: 2px; z-index: 1; }
      .floor button { width: 24px; height: 24px; border: 0; border-radius: 4px; cursor: pointer;
               background: rgba(0,0,0,.6); color: #fff; font-size: 12px; }
      .floor span { text-align: center; color: #fff; font: 11px system-ui; background: rgba(0,0,0,.6);
               border-radius: 4px; padding: 2px 0; }
      .attribution { position: absolute; left: 6px; bottom: 4px; font: 10px system-ui;
               color: rgba(255,255,255,.6); z-index: 1; }
      .attribution a { color: inherit; }
    </style>`;
    this.#canvas = document.createElement("canvas");
    root.appendChild(this.#canvas);
    this.#tooltip = document.createElement("div");
    this.#tooltip.className = "tt";
    root.appendChild(this.#tooltip);

    const attribution = document.createElement("div");
    attribution.className = "attribution";
    attribution.innerHTML = `<a href="https://tibiamaps.io" target="_blank" rel="noopener">© tibiamaps.io</a>`;
    root.appendChild(attribution);

    this.#ctx = this.#canvas.getContext("2d");
    this.#readAttributes();
    if (this.hasAttribute("height")) this.style.height = this.getAttribute("height");

    if (!this.hasAttribute("static")) this.#wireInteraction(root);
    new ResizeObserver(() => this.#resize()).observe(this);
    this.#resize();
  }

  attributeChangedCallback() {
    if (!this.#ctx) return;
    this.#readAttributes();
    if (this.hasAttribute("height")) this.style.height = this.getAttribute("height");
    this.#draw();
  }

  #readAttributes() {
    const center = (this.getAttribute("center") || "32368,32198,7").split(",").map(Number);
    if (center.length === 3 && center.every(Number.isFinite)) {
      [this.#cx, this.#cy, this.#floor] = center;
    }
    this.#zoom = clamp(parseInt(this.getAttribute("zoom") ?? "2", 10) || 0, 0, 4);
    try { this.#markers = JSON.parse(this.getAttribute("markers") || "[]"); } catch { this.#markers = []; }
    try { this.#route = JSON.parse(this.getAttribute("route") || "[]"); } catch { this.#route = []; }
  }

  #wireInteraction(root) {
    const floorBox = document.createElement("div");
    floorBox.className = "floor";
    const up = document.createElement("button"); up.textContent = "▲";
    const label = document.createElement("span");
    const down = document.createElement("button"); down.textContent = "▼";
    const fmt = (f) => (f === 7 ? "0" : f < 7 ? `+${7 - f}` : `-${f - 7}`);
    label.textContent = fmt(this.#floor);
    up.onclick = () => { this.#floor = clamp(this.#floor - 1, 0, 15); label.textContent = fmt(this.#floor); this.#tiles.clear(); this.#draw(); };
    down.onclick = () => { this.#floor = clamp(this.#floor + 1, 0, 15); label.textContent = fmt(this.#floor); this.#tiles.clear(); this.#draw(); };
    floorBox.append(up, label, down);
    root.appendChild(floorBox);

    this.#canvas.addEventListener("pointerdown", (e) => {
      this.#drag = { x: e.clientX, y: e.clientY, cx: this.#cx, cy: this.#cy };
      this.#canvas.setPointerCapture(e.pointerId);
    });
    this.#canvas.addEventListener("pointermove", (e) => {
      if (this.#drag) {
        const s = ZOOM_SCALES[this.#zoom];
        this.#cx = clamp(this.#drag.cx - (e.clientX - this.#drag.x) / s, BOUNDS.xMin, BOUNDS.xMax);
        this.#cy = clamp(this.#drag.cy - (e.clientY - this.#drag.y) / s, BOUNDS.yMin, BOUNDS.yMax);
        this.#draw();
      } else {
        this.#hover(e);
      }
    });
    this.#canvas.addEventListener("pointerup", () => (this.#drag = null));
    this.#canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.#zoom = clamp(this.#zoom + (e.deltaY < 0 ? 1 : -1), 0, 4);
      this.#draw();
    }, { passive: false });
  }

  #hover(e) {
    const rect = this.#canvas.getBoundingClientRect();
    const s = ZOOM_SCALES[this.#zoom];
    const gx = (e.clientX - rect.left - rect.width / 2) / s + this.#cx;
    const gy = (e.clientY - rect.top - rect.height / 2) / s + this.#cy;
    const hit = this.#markers.find((m) => m.z === this.#floor && m.label &&
      Math.hypot(m.x - gx, m.y - gy) * s < 8);
    if (hit) {
      this.#tooltip.textContent = hit.label;
      this.#tooltip.style.display = "block";
      this.#tooltip.style.left = `${e.clientX - rect.left + 12}px`;
      this.#tooltip.style.top = `${e.clientY - rect.top + 12}px`;
    } else {
      this.#tooltip.style.display = "none";
    }
  }

  #resize() {
    if (!this.#canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.#canvas.width = this.clientWidth * dpr;
    this.#canvas.height = this.clientHeight * dpr;
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.#draw();
  }

  #draw() {
    if (this.#raf) return;
    this.#raf = requestAnimationFrame(() => { this.#raf = null; this.#render(); });
  }

  #render() {
    const ctx = this.#ctx;
    const w = this.clientWidth, h = this.clientHeight;
    const s = ZOOM_SCALES[this.#zoom];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);

    const x0 = Math.floor(clamp(this.#cx - w / 2 / s, BOUNDS.xMin, BOUNDS.xMax) / 256);
    const x1 = Math.floor(clamp(this.#cx + w / 2 / s, BOUNDS.xMin, BOUNDS.xMax) / 256);
    const y0 = Math.floor(clamp(this.#cy - h / 2 / s, BOUNDS.yMin, BOUNDS.yMax) / 256);
    const y1 = Math.floor(clamp(this.#cy + h / 2 / s, BOUNDS.yMin, BOUNDS.yMax) / 256);

    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        const id = `${tx * 256}_${ty * 256}_${this.#floor}`;
        let img = this.#tiles.get(id);
        if (!img) {
          img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => this.#draw();
          img.src = `${TILE_URL}${id}.png`;
          this.#tiles.set(id, img);
        }
        if (img.complete && img.naturalWidth) {
          ctx.drawImage(img,
            Math.round((tx * 256 - this.#cx) * s + w / 2),
            Math.round((ty * 256 - this.#cy) * s + h / 2),
            Math.round(256 * s), Math.round(256 * s));
        }
      }
    }

    // Route polyline (only segments on the current floor).
    if (this.#route.length > 1) {
      ctx.lineWidth = Math.max(2, s * 0.6);
      ctx.lineJoin = ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(66,133,244,.9)";
      ctx.beginPath();
      let pen = false;
      for (const p of this.#route) {
        if (p.z !== this.#floor) { pen = false; continue; }
        const sx = (p.x + 0.5 - this.#cx) * s + w / 2;
        const sy = (p.y + 0.5 - this.#cy) * s + h / 2;
        pen ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
        pen = true;
      }
      ctx.stroke();
      // Start / end dots.
      const ends = this.#route.filter((p) => p.z === this.#floor);
      if (ends.length) {
        for (const [i, p] of [[0, ends[0]], [1, ends[ends.length - 1]]]) {
          ctx.fillStyle = i === 0 ? "#34a853" : "#ea4335";
          ctx.beginPath();
          ctx.arc((p.x + 0.5 - this.#cx) * s + w / 2, (p.y + 0.5 - this.#cy) * s + h / 2,
            Math.max(4, s * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Markers.
    for (const m of this.#markers) {
      if (m.z !== this.#floor) continue;
      const sx = (m.x + 0.5 - this.#cx) * s + w / 2;
      const sy = (m.y + 0.5 - this.#cy) * s + h / 2;
      ctx.fillStyle = "#ffcc00";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(4, s * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("tibia-map")) {
  customElements.define("tibia-map", TibiaMapElement);
}
