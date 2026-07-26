"use client";

import { parseTibiaMapBlock } from "./parse.js";
import { TibiaMap } from "./react.jsx";

/**
 * AI Brain markdown fence plugin.
 *
 * AI Brain's plugin contract: an object with a `language` (the fence info
 * string it claims, e.g. ```tibiamap) and a React `Component` receiving the
 * raw fence body as `code`.
 */
function TibiaMapBlock({ code }) {
  const cfg = parseTibiaMapBlock(code);
  if (!cfg.center) {
    return <pre className="tibiamap-error">tibiamap: no coordinates given</pre>;
  }
  return (
    <TibiaMap
      center={[cfg.center.x, cfg.center.y, cfg.center.z]}
      zoom={cfg.zoom ?? 2}
      height={cfg.height ?? "300px"}
      markers={cfg.markers}
      route={cfg.route}
      static={cfg.static}
    />
  );
}

const tibiaMapPlugin = {
  language: "tibiamap",
  Component: TibiaMapBlock,
};

export default tibiaMapPlugin;
