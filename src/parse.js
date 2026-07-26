/**
 * Parser for `tibiamap` fenced-block bodies. Deliberately a tiny YAML-like
 * subset (no dependency) — see README for the full syntax.
 *
 *   center: 32369,32241,7
 *   zoom: 2
 *   height: 320px
 *   static: true
 *   markers:
 *     - 32369,32241,7 | Optional label
 *   route:
 *     - 32369,32241,7
 *     - 32380,32250,7
 */
export function parseTibiaMapBlock(body) {
  const out = { center: null, zoom: null, height: null, static: false, markers: [], route: [] };
  let list = null;
  for (const raw of String(body).split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const item = line.match(/^-\s*(.+)$/);
    if (item && list) {
      const point = parsePoint(item[1]);
      if (point) out[list].push(point);
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    list = null;
    switch (key) {
      case "markers":
      case "route":
        list = key;
        if (value) for (const part of value.split(";")) {
          const point = parsePoint(part);
          if (point) out[key].push(point);
        }
        break;
      case "center": out.center = parsePoint(value); break;
      case "zoom": out.zoom = parseInt(value, 10); break;
      case "height": out.height = /^\d+$/.test(value) ? `${value}px` : value; break;
      case "static": out.static = value === "true" || value === "yes"; break;
    }
  }
  // Default center: first marker, else first route point.
  if (!out.center) out.center = out.markers[0] ?? out.route[0] ?? null;
  return out;
}

/** "32369,32241,7 | label" → {x, y, z, label?} */
function parsePoint(text) {
  const [coords, ...rest] = String(text).split("|");
  const nums = coords.split(",").map((n) => parseInt(n.trim(), 10));
  if (nums.length < 3 || nums.some((n) => !Number.isFinite(n))) return null;
  const point = { x: nums[0], y: nums[1], z: nums[2] };
  const label = rest.join("|").trim();
  if (label) point.label = label;
  return point;
}
