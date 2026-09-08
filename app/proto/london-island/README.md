# London island exploration

Open http://localhost:3020/proto/london-island?v=2 with `pnpm dev`.

| Picker | Direction | Trade-off |
| --- | --- | --- |
| Atlas | Previous boxed map, retained unchanged as a comparison | Conventional map behaviour |
| Paper | Warm freestanding landmass, editorial typography, original sheet as a paper object | Quieter contrast and limited overview label space |
| Pieces | Boroughs separated into physical pieces, searchable collection at left | Separation deliberately distorts geography |
| Night | Dark exhibition setting, centred title, illuminated map and evidence | Fine map detail is less prominent at overview scale |

Keys 1–4 and left/right switch styles, R remounts. Input fields, sliders and menus retain their own keys. No final style is selected yet.

## What works

- A Three.js scene, not a world map inside a styled container. Only borough geometry exists; map texture is clipped by the actual polygon mesh.
- Thirty-two real boroughs plus the City, physical sides, shadows and cartographic linework.
- Paper defaults to drag-to-pan, with an explicit Pan / Orbit switch. Scroll/pinch zooms; right-drag/two-finger movement pans within a bounded target radius. Focus the canvas and use arrow keys to pan without changing prototype variants. Buttons provide rotation, zoom and overview alternatives. The native borough selector is the keyboard alternative to mesh picking.
- Borough clicks/selects focus the corresponding model; Whole island restores the overview camera.
- A Pimlico close-up with modern building extrusions, a detailed modern map patch and conservative draft damage colours.
- Real DialKit 2.0 controls: thickness, borough separation, selected lift, tilt, bearing, building height multiplier, building visibility, damage colours, labels and lighting. The built-in Copy parameters action exports settings; per-style controls survive switches within the page session. They are not saved across browser reloads.
- The original screenshot opens in a source viewer with a full-size link and the archive catalogue record. It is deliberately not placed over the geography as an unregistered texture.

## Sources and limitations

`../borough-plates/boroughs.json`: GLA / OS borough boundaries, OGL v3; see `/docs/building-matching.md` for vintage/simplification.

`public/proto/london-island/context.json` and `pimlico.json`: captured from OpenFreeMap's OpenMapTiles-format OpenStreetMap snapshot `20260830_080001_pt`. Exact tile template, capture time and requested bounds are embedded in each file. Buildings use z14 vector tiles; city context uses z11. The capture script clips polygon data to the requested rectangle and filters linework. The actual scene clips its visible surface to borough polygons. No outside-world tiles are fetched during interaction.

Regenerate intentionally with `node app/proto/london-island/capture-data.mjs`. This contacts OpenFreeMap for bounded London data. Vector decoding packages are development dependencies; Three.js, DialKit and Motion are runtime dependencies confined to the new prototype imports.

Only Pimlico has 3D building data in this exploration (420 deduplicated/clipped footprint parts in the current captured version; 16 have some draft overlap). Modern heights use the tile source where available, falling back to an explicitly illustrative 8 metres; the DialKit multiplier exaggerates them. Borough slab depth and lift are presentation dimensions, not elevation data. Labels use borough bounding-box centres.

Damage matching reuses the previous R-tree and polygon intersection method against 20 provisional source areas: 60% coverage and a 15 percentage point lead. Only one footprint part meets those whole-footprint defaults. The new default Partial overlaps mode clips each source area to the intersecting roof geometry without assigning the whole building. Same-category intersections are unioned; conflicting categories remain neutral. These are geometric roof patches, not reconstructed historical houses. Both modes use unlit, un-tone-mapped damage colours so lighting does not wash out the key. No new historical property tracing or registration is claimed. Tile fragments do not establish unique building identity. See `/docs/building-matching.md` for the proposed historical matching pipeline.

The archive screenshot remains private and is served by the existing development-only route. It will not appear in a production server. Attribution is visible in the interface and source viewer.

## Rendering and checks

Geometry is built once per mounted style; building meshes are merged per borough/category. Dial changes update existing objects. Rendering is demand-driven, with no continuous animation loop or React state updates per frame. Hidden tabs stop painting. Pixel ratio is capped at 2, and GPU resources are disposed on unmount. The prototype requires WebGL and presents a retryable error if setup fails.

Validation: production build, 29 tests (including four new partial-roof cases for clipping, conflicts, same-category unions and courtyards), and browser checks of styles, borough selection, original-source dialog, Pimlico focus, DialKit and camera controls. The baseline remains on the picker; production routes are not promoted or replaced.

## Decision record

- Rejected: framing the map inside a rectangular plate; zooming out into the surrounding world.
- Accepted direction: London as a bounded 3D island with orbit and zoom.
- Still exploring: paper, separated borough pieces or night exhibit; thickness, spacing, lighting and camera values remain tunable.
- Next data decision: complete building coverage beyond Pimlico and a sharper, accurately registered historical sheet.

## Paper defaults selected by the user

- Form: thickness 0.1, separation 0, selected lift 0.75.
- Camera: tilt 67°, bearing 11°. Whole island returns to these angles.
- Surface: height multiplier 1, buildings/damage colours/labels enabled, light 3.3.
- Palette is still being explored. Current Paper starting point: background `#263633`, model colour `#eee8db`, both editable in DialKit’s Palette folder. The base map paper changed from `#e5d9bf` to `#eee8db` to separate it from the cooler backdrop. The tint affects map surfaces, not the damage key.
- Pan mode is the primary drag action for Paper; Orbit remains available.
- Partial overlaps is the default display, with a Whole footprints comparison button. The source data itself has not been made more accurate.

## Active Pimlico-only test (8 September 2026)

The active Paper/Pieces/Night picker now hides the London-wide Atlas comparison. Existing `?v=2`, `?v=3` and `?v=4` links retain their styles. Keys 1–3 select those styles; arrow keys cycle. Legacy prototypes remain available at their own routes.

Only the Pimlico test rectangle `[-0.15, 51.4835, -0.13, 51.4945]`, intersected with the GLA Westminster outline, exists in the scene. This is a study crop, not an official Pimlico or sheet boundary. Reset and zoom-out cannot reveal other boroughs. The scene fetches only the saved Pimlico detail file.

Model colour now controls land, slab sides and neutral buildings together. Map detail is now on by default, with a light paper texture in every style. Draft damage remains independently switchable. Selected footprint components have an outline and inspector, with a native selector as a keyboard alternative. Source feature IDs and local component IDs remain distinct.

The earlier counts above describe the pre-benchmark grouped data. Current shared preparation splits 74 tile features into 1,053 disconnected components. Matching finds 89 with any overlap, including 34 whole-footprint candidates. None is a verified historical property. Each component is selectable; rendering is still demand-driven, with individually selectable meshes and a single detailed surface texture.

Run `pnpm benchmark:pimlico`; open the generated JSON or the five-page research PDF from the pilot controls. See `/docs/building-matching.md` for the measured aggregation issue, experimental sensitivity and unmeasured historical accuracy. A delivered source sheet and independently reviewed historical cases are still required.

## Overture implementation after the research report

The active scene now loads the generated `building-index.json`, built from the pinned Overture source snapshot, alongside the existing map-detail texture data. It preserves complete footprints for matching, uses linked building parts for 3D rendering and shows source identity, height provenance and translation sensitivity. The default damage mode is Historical areas on the ground; experimental roof modes remain available. Modern buildings can be hidden directly in the pilot controls.

The source contains 1,688 modern building records / 1,697 components in the crop. Counts in earlier sections refer to the prior tile-based implementation. The benchmark preserves that named baseline. Check source alignment imports measured fit/check landmarks, reports held-out errors, and exports results without changing map coordinates. See `/docs/pimlico-validation.md` for commands, template schema and limits.

## Screenshot comparison and replacement sites

The current local correction replaces four legacy groups around Russell House with fourteen screenshot-traced historical terrace segments. `/proto/london-island/compare` overlays the source, modern geometry, previous placement and revised segments. The benchmark now distinguishes historical-site coverage from modern roof overlap. All intersecting components are outlined in whole-building mode; known replacement blocks stay neutral, and ground evidence remains visible. See `docs/pimlico-validation.md` for measurements and limits.
