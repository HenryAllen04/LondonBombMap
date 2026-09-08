# Paper surface on a dark background

The colour picker and Three.js materials require hex strings; CSS uses the existing OKLCH variables.

| File / setting | Before | After | Reason |
| --- | --- | --- | --- |
| `island.jsx`: Paper background | `#dde2df` | `#263633` | Darker backdrop requested by the user; separates the light model from the background. |
| `island.jsx`: Night background | `#121c1b` | `#182724` | Slightly lighter dark green retains separation from the panel surfaces. |
| `island.jsx`: Night model | `#b4c0b8` | `#eee8db` | Shares the warm paper model colour. |
| `scene.js`: map-detail palette | Style-dependent palette, including Night land `#3c4847` | Existing Paper palette: land `#eee8db`, roads `#c3b18f`, water `#799f99`, park `#c8cbb2` | Night’s dark texture was obscuring map detail. |
| `scene.js`: textured ground tint | Model colour multiplied into the texture | `#ffffff` with detail on; model colour with detail off | Avoids darkening the cartography twice. |
| `scene.js`: partial-overlap edges | None | Night `#dfbd82`; other styles `#8c512c` | Reveals intersecting footprints that do not qualify for a category fill. |
| `island.css`: Paper header/intro ink | Inherited `oklch(.29 .022 67)` | `oklch(.94 .018 87)` | Light text on the new dark backdrop. |
| `island.css`: Paper header/intro muted | Inherited `oklch(.47 .022 67)` | `oklch(.81 .018 87)` | Keeps secondary text readable. |
| `island.css`: Paper header/intro accent | Inherited `oklch(.43 .085 42)` | `oklch(.86 .075 80)` | Preserves visible interactive text on dark green. |
| `island.css`: mobile Paper information surfaces | Transparent | Existing `var(--is-paper)` | Retains readable dark text; matches desktop information cards. |
| `island.css`: Night navigation surface | Transparent | Existing `var(--is-paper)` | Keeps navigation distinct after moving it away from the inspector. |

The new comparison page uses dark green `oklch(.24 .018 185)` with paper ink `oklch(.94 .018 87)`, secondary ink `oklch(.83 .02 87)`, and teal modern outlines. The historical damage key is unchanged. Browser checks cover Paper and Night with map detail on, plus the mobile information surfaces.
