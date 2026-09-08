# Building matching: implemented and proposed

## What the prototype does today

The old Buildings view tested an average vertex position against 20 hand-drawn area groups in `data/pimlico-traces.json`. Those groups are not individual historical houses. Reference showed neutral modern buildings.

The new implementation is `app/proto/borough-plates/matching.js`:

1. An [RBush R-tree](https://github.com/mourner/rbush) indexes the draft areas by bounding box.
2. Nearby candidates are intersected with each loaded modern polygon using [polygon-clipping](https://github.com/mfogel/polygon-clipping), including holes and multipolygons.
3. Calculate modern coverage (intersection / modern area), historical coverage, and intersection over union (IoU).
4. Display a draft colour if modern coverage reaches 60% by default and exceeds the next candidate by 15 percentage points. The UI can change the coverage threshold. Other results remain partial, ambiguous or unmatched.
5. Retain competing candidates and their source IDs. No match is verified, even at 100% overlap.

The index accelerates candidate search; it does not register an image or establish building identity. The threshold is a display rule, not a calibrated confidence score. Areas use a local planar approximation centred on Pimlico. Vector tiles can split buildings, and exact geometry deduplication does not join fragments or resolve multiple zoom levels. Counts are loaded tile parts, not properties or unique houses. Only the current loaded tiles are examined.

In browser validation at the default pilot camera, only one loaded part met the default threshold, with 22 partial overlaps. This is evidence that the current draft source cannot support a convincing house-by-house reconstruction. Lowering the threshold is useful for inspection, not a remedy for inaccurate traces.

## The pipeline needed for property-level work (not yet implemented)

1. Acquire a sharper original with sheet identifier and reuse rights. Preserve the original pixels and catalogue provenance.
2. Register the sheet using distributed, stable street junctions. Fit the simplest adequate transform and measure error on held-out landmarks. Record residuals and local distortion; three fitting anchors alone cannot validate accuracy.
3. Extract individual historical footprint polygons and colour labels. Colour segmentation can suggest regions but must distinguish paper, annotation, streets and faded pigment. Review yellow and orange at full resolution. Retain uncertain and mixed labels.
4. Obtain complete modern polygons with stable IDs and source dates. Use a suitable metric CRS, such as British National Grid, for London geometry calculations.
5. Index bounding boxes with an R-tree (or a database spatial index). Rank actual polygon intersections using both directional coverages, IoU, distance, orientation and street/address evidence. Assess thresholds against reviewed examples. Grid indexing alone does not establish a correspondence.
6. Keep a relationship graph: one-to-one candidate, split, merged, demolished, rebuilt, missing and unresolved. Do not force a nearest-building match. Record manual decisions and the evidence behind them.
7. Render historical footprints as their own layer when modern geometry cannot represent the original houses. Extrusion height is separately sourced or explicitly illustrative; damage colour does not determine height.

A sharper image enables steps 1–3. It cannot by itself prove whether a modern house is the original building.

## Boundary source

The borough picker uses 32 boroughs plus the City of London from the [GLA boundary dataset](https://data.london.gov.uk/dataset/london-boroughs-e55pw), fetched from the GLA ArcGIS `apps/webmap_context_layer/MapServer/3` layer. The provider describes 2017/2018 boundary data; this is not a claim of a 2026 survey. The checked-in GeoJSON uses WGS84, five decimal places and a 0.0001-degree simplification tolerance for display. These boundaries are for navigation/masking, not property matching. Attribution: GLA / Ordnance Survey, Open Government Licence v3.

## Island partial-overlap display

The Paper island also offers Partial overlaps. `app/proto/london-island/damage-fragments.js` intersects each candidate source area with the modern roof, unions patches sharing a category, and subtracts regions where different categories conflict. Only those patches receive colour. This permits small intersections to be inspected without lowering the 60% whole-footprint matching threshold or assigning a class to an entire modern house. The Whole footprints view remains available for comparison. This is a rendering option over the same unverified data, not a new historical matching algorithm.

## Pimlico component benchmark (8 September 2026)

The active island pilot now uses `lib/pimlico-pilot.js` to clip an explicit study rectangle to Westminster and split disconnected MultiPolygon components before matching. Courtyard holes stay attached. This revealed 1,053 components inside 74 tile features (47 multi-component groups; largest 388). A feature ID cannot be treated as one house.

The earlier grouped unit yielded 1 candidate and 15 partial matches. Component matching yields 34 candidates and 55 partial matches; 964 components have no draft overlap. These denominators differ. No historical accuracy improvement is claimed. Other legacy prototypes still use their existing feature grouping.

Run `pnpm benchmark:pimlico` to regenerate `public/proto/london-island/benchmark.json`. It records source hashes, scope, per-part candidates, grouped comparison, address/height availability and deliberate ±3/±5 metre translation sensitivity. Three-metre shifts change 9–10 candidate assignments. There are no withheld registration checks or reviewed historical properties, so historical accuracy metrics remain null.

Read the [research report](../public/proto/london-island/pimlico-research.pdf) for the 30-property historical review protocol and cited source/model comparisons. Local part IDs are snapshot/crop identifiers, not persistent house IDs. Modern source IDs may apply to many disconnected components. No source image or address evidence was upgraded by this computation.

## Subsequent report fixes

The active island has now moved to complete Overture building records and linked 3D parts, with complete-geometry matching, stable source identities and per-record translation sensitivity. Current results are 1,688 building records / 1,697 components, 68 candidates and 86 partial overlaps; the old tile result above remains a historical baseline. See [Pimlico validation](pimlico-validation.md) for source reproduction, rendering semantics, the alignment checker and remaining evidence work.
