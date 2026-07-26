"use client";

import { useEffect, useRef } from "react";
import "./tibia-map-element.js";

/** React wrapper around the <tibia-map> web component. */
export function TibiaMap({ center, zoom, height, markers, route, static: isStatic }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (center) el.setAttribute("center", Array.isArray(center) ? center.join(",") : center);
    if (zoom != null) el.setAttribute("zoom", String(zoom));
    if (height) el.setAttribute("height", typeof height === "number" ? `${height}px` : height);
    el.setAttribute("markers", JSON.stringify(markers ?? []));
    el.setAttribute("route", JSON.stringify(route ?? []));
    if (isStatic) el.setAttribute("static", "");
    else el.removeAttribute("static");
  }, [center, zoom, height, markers, route, isStatic]);

  return <tibia-map ref={ref} />;
}
