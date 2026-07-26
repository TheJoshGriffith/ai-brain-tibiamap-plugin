# ai-brain-tibiamap-plugin

Renders the Tibia world map anywhere: a zero-dependency `<tibia-map>` web component, a thin
React wrapper, and a markdown fence plugin for [AI Brain](https://github.com/xtrmjosh/ai-brain).
Map tiles are hotlinked from the excellent [tibiamaps](https://tibiamaps.io) project
([tibia-map-data](https://github.com/tibiamaps/tibia-map-data)) — all map imagery © CipSoft,
curated by tibiamaps.

## Markdown syntax (AI Brain / anywhere you wire the plugin)

````markdown
```tibiamap
center: 32369,32241,7
zoom: 2
height: 320px
markers:
  - 32369,32241,7 | Djinn tower entrance
  - 32380,32250,7
route:
  - 32369,32241,7
  - 32380,32250,7
  - 32390,32255,6
static: false
```
````

Coordinates are absolute game coordinates (`x,y,floor`), the same you see on tibiamaps.io.
Floors: 7 = ground, lower numbers are above ground. All keys optional except at least one
coordinate; `center` defaults to the first marker/route point. `zoom` 0–4. A route drawn
across floors renders per-floor segments — use the floor buttons to follow it.
Everything degrades to a plain code block in renderers without the plugin.

## Web component

```html
<script type="module" src="https://esm.sh/ai-brain-tibiamap-plugin/element"></script>
<tibia-map center="32369,32241,7" zoom="2" style="height:320px"
           markers='[{"x":32369,"y":32241,"z":7,"label":"Djinn tower"}]'></tibia-map>
```

Attributes: `center="x,y,z"`, `zoom="0..4"`, `height`, `markers` (JSON array of
`{x,y,z,label?}`), `route` (JSON array of `{x,y,z}`), boolean `static`. Interactive by
default: drag to pan, wheel to zoom, floor buttons top-right, marker labels on hover.

## React

```jsx
import { TibiaMap } from "ai-brain-tibiamap-plugin/react";

<TibiaMap center={[32369, 32241, 7]} zoom={2} height={320}
          markers={[{ x: 32369, y: 32241, z: 7, label: "Djinn tower" }]}
          route={[{ x: 32369, y: 32241, z: 7 }, { x: 32380, y: 32250, z: 7 }]} />
```

## AI Brain plugin

```ts
// apps/web/lib/markdown-plugins.tsx
import tibiaMapPlugin from "ai-brain-tibiamap-plugin";
export const fencePlugins = [tibiaMapPlugin];
```

The plugin contract is `{ language: string, Component: React.FC<{ code: string }> }` —
AI Brain routes any fenced code block whose language matches to the plugin's component.

## Demo

Open `demo/index.html` in a browser (needs network access for tiles).
