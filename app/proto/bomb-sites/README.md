# Bomb map exploration

Open `/proto/bomb-sites`. Keys 1–3 or left/right switch variants; R resets the current view. `?v=2` opens Buildings directly. Selection persists in the URL.

The retired Overlay / Explorer baseline has been removed; `?v=1` redirects to the Pimlico island homepage.
- Buildings: modern OpenStreetMap footprints coloured by an approximate spatial match to existing damage traces; optional raised buildings and draft boundary outlines.
- Swipe: synchronised modern maps, with draft damage on the left. Drag the divider or use the Reveal damage range control.
- Stacked: synchronised modern map planes, with draft damage above. Separation, tilt and rotation are adjustable. Pan and zoom with the controls.

Henry preferred Buildings on 8 September 2026 and requested a further round combining strong tilt with the original paper map. That exploration is at `/proto/paper-buildings`; the integrated Pimlico island is now the homepage. The remaining comparison variants stay here as independent tools.

## Limits

The existing Sheet 88 traces are approximate groups, not verified historical footprints. Building matching uses the average of a polygon’s outer-ring vertices, then a point-in-polygon check. Tile clipping, large or concave buildings, overlapping areas and imprecise traces may cause false matches. Counts describe loaded footprint parts, not unique addresses or bomb strikes. No survival/rebuilding status is inferred. Height falls back to an illustrative 8 m when unavailable.

The comparison variants use the same modern basemap, not two historical street surveys. A verified georeferenced historical raster or historical footprint dataset is still needed for a true then/now comparison.

## Verification

Before the homepage promotion, all four variants rendered in Chrome without console warnings/errors. Exercised footprint boundary and height toggles, place selection, plane separation and pan, swipe range endpoints and pointer drag, keyboard variant switching and reload persistence. Existing 19 tests and TypeScript checks pass. Mobile styles provided; mobile browser testing remains outstanding.
