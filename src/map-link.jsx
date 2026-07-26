"use client";

import { useEffect, useRef, useState } from "react";
import { TibiaMap } from "./react.jsx";

const MAP_HREF = /^https:\/\/tibiamaps\.io\/map#(\d+),(\d+),(\d+)(?::(\d))?$/;

/** True if this href is a tibiamaps.io position link we can render inline. */
export function isMapHref(href) {
  return MAP_HREF.test(href ?? "");
}

/**
 * Renders a tibiamaps.io position link as an inline popout map.
 * Falls back to a normal external link for anything unparsable.
 */
export function MapLink({ href, children }) {
  const m = MAP_HREF.exec(href ?? "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [open]);

  if (!m) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  }
  const [x, y, z] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const zoom = m[4] != null ? Math.min(4, Math.max(0, Number(m[4]))) : 2;

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={boxRef}>
      <a
        href={href}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        style={{ cursor: "pointer", textDecorationStyle: "dotted" }}
        title={`${x},${y} floor ${z} — click for map`}
      >
        {children} 🗺
      </a>
      {open && (
        <span
          style={{
            position: "absolute", left: 0, top: "1.6em", zIndex: 50,
            width: "min(420px, 80vw)", display: "block",
            background: "var(--bg, #1c1c1e)", borderRadius: 8, padding: 6,
            boxShadow: "0 8px 30px rgba(0,0,0,.45)",
          }}
        >
          <TibiaMap center={[x, y, z]} zoom={zoom} height={260}
            markers={[{ x, y, z }]} />
          <span style={{ display: "flex", justifyContent: "flex-end", padding: "4px 2px 0" }}>
            <a href={href} target="_blank" rel="noopener noreferrer"
               style={{ font: "11px system-ui", opacity: 0.7 }}>
              open on tibiamaps.io ↗
            </a>
          </span>
        </span>
      )}
    </span>
  );
}
