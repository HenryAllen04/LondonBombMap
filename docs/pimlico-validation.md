# Pimlico implementation after the research report

The active pilot is `/proto/london-island?v=2`. The PDF is the initial research snapshot; `benchmark.json` and this document describe the subsequent implementation.

## Local correction from the supplied screenshots

Open `/proto/london-island/compare` to compare the source screenshot, modern Overture footprints, the previous four rectangles and the revised historical terrace segments at the same coordinates. Opacity is adjustable; clicking the map reports approximate latitude/longitude. The comparison and the 3D scene use the same saved study transform.

`data/pimlico-local-study.json` records the exact screenshot dimensions/checksum, three fitting road junctions, three separate check picks, OSM node URLs, fourteen simplified terrace segments and the Russell House site relationship. Four old groups (`p88-14` through `p88-17`) are replaced locally. The other sixteen legacy groups retain their old placement. This is a local improvement, not a recalibrated full sheet.

The local check RMSE is **2.6 m**, with maximum **4.2 m**. These are manual screenshot-to-OSM checks, not surveyed ground truth or the 12-fit/8-check registration gate. They do not establish individual historical house boundaries. The original empty measured-registration template remains pending.

Four old rectangle centres lie approximately **29–46 m east and 6–16 m south** of estimated corresponding historical row centres. Their geometry and categories also differ. `placementComparison` saves these probes and the calculation; these are approximate visual diagnostics, not a uniform translation to apply to all traces.

The [Westminster-hosted Playle & Partners condition survey](https://www.westminster.gov.uk/media/document/_-2021-playle--partners-condition-survey-report), page 5, describes Russell House as a nine-storey I-shaped block built in 1962 at Cambridge, Charlwood and Alderney Streets. The modern association to Overture building `a37353db-6983-493e-804e-33e6491ef7cf` is a visual footprint match. The historical image shows two terrace rows at this site. Historical property IDs and individual dated incidents remain unreviewed. The modern height remains the provider-derived illustrative fallback; the survey description is not a measured height.

The benchmark is now labelled **geometry diagnostics and historical site review**. For each historical area it reports coverage by the union of modern footprints, area outside modern roofs, and related modern IDs. Zero modern overlap no longer makes a historical area disappear from the analysis. It can reflect replacement buildings, registration error or tracing error; it is not proof that an area was undamaged.

Whole-building display outlines **all 155 intersecting modern components**, including partial cases. Category fills use unioned areas of the same category, with the existing 60% coverage / 15-point margin. The documented Russell House replacement stays neutral. The ground layer remains visible, preserving historical areas where no modern roof exists. This is still an experimental visual comparison.

Private browser captures are in `.context/comparison/`: `previous-placement.png`, `revised-placement.png`, `paper-detail.png` and `night-detail.png`. The external modern-map reference is `.context/research/modern-osm-reference.png`. The original screenshot and downloaded council PDF remain private and are not committed. The comparison reference image endpoint is local-development-only.

## Source identity and complete geometry

The scene now uses [Overture's buildings and building parts](https://docs.overturemaps.org/guides/buildings/), release **2026-08-19.0**, downloaded on 8 September 2026. The buffered query is `[-0.151,51.4825,-0.129,51.4955]`. Complete source geometries, feature versions, provider records and parent/part relationships are retained in `public/proto/london-island/pimlico-overture.json`.

The crop contains 1,688 distinct building IDs / 1,697 polygon components. Source parts produce 1,906 render pieces, including uncovered parent surfaces. A building ID is a modern entity, not a wartime property or necessarily one address. Current source datasets include OpenStreetMap and Microsoft ML Buildings. Agreement with the former tile geometry is not independent validation where both derive from OSM.

`lib/modern-buildings.js` generates component keys from the provider ID and canonical full geometry. Reordering features or changing the crop does not change these keys. A changed geometry can change its component key while retaining the parent building ID. Full geometry remains separate from clipped display geometry. Matching uses the complete component, avoiding inflated coverage on crop-edge fragments. Same geometry under distinct source identities is retained rather than silently deduplicated.

3D parts retain parent links. Part-covered ground is subtracted from the parent extrusion to avoid rendering a solid parent block through the source roof shapes. Heights are explicitly source-supplied, estimated at 3 m per source floor, or illustrative 8 m fallback. Height sources are not independent surveying guarantees. No modern addresses have been established by this extract.

## Historical evidence and display

Historical draft areas now have their own ground layer by default. Modern buildings keep the shared neutral model colour. Draft roof overlaps and Draft whole buildings remain explicitly experimental comparisons. Hide modern buildings to inspect the underlying areas.

Matching still uses the 60% / 15 percentage-point display rule. Four deliberate 3 m translations identify fragile candidate assignments. After the local correction, the current source has 155 components with draft overlap: 70 candidates, 85 partial overlaps. Of the candidates, 23 change assignment in at least one translation. Forty components in total change candidate assignment. This measures sensitivity, not actual positional error.

The inspector keeps historical identity unreviewed and dated incidents unlinked. It exposes competing overlaps, both directional coverages, IoU, provenance, height assumptions and edge clipping. It never equates 100% coverage with verified damage.

## Reproduce the modern source

Install the [official Python client](https://docs.overturemaps.org/getting-data/overturemaps-py/) into a local environment:

```sh
python3 -m venv .context/maps-venv
.context/maps-venv/bin/pip install overturemaps==1.0.2
.context/maps-venv/bin/python scripts/capture-pimlico-overture.py --release 2026-08-19.0
pnpm benchmark:pimlico
```

The capture uses explicit release/bounds, checks CLI state metadata and IDs, and replaces the output only after both downloads succeed. Source hashes and capture metadata remain in the output. Overture buildings are ODbL; attribution and the complete captured source dataset are included. See [Overture attribution](https://docs.overturemaps.org/attribution/).

`pnpm index:pimlico` rebuilds `building-index.json`. Dev and production build also rebuild this index from local snapshots; no live Overture connection is needed at runtime. `pnpm benchmark:pimlico` rebuilds the index and the benchmark, retaining the earlier tile-based result as a named baseline with its own denominator. A greater number of candidates is not an accuracy improvement.

## Measure source registration

Open **Check source alignment** in the pilot, download the landmark template and import measured JSON. The import stays in the browser. Alternatively:

```sh
pnpm check:registration data/pimlico-registration.json
```

Each landmark has this form (values must come from actual source measurements):

```json
{
  "id": "unique-landmark-id",
  "role": "fit",
  "pixel": [123, 456],
  "grid": [530000, 179000],
  "sourceReference": "image reference and modern control source",
  "reviewer": "reviewer name"
}
```

These coordinates are a **schema example, not a real landmark**. `grid` is [easting, northing] in EPSG:27700; `pixel` uses the original image's coordinate frame consistently. Use `role: "check"` for independent landmarks excluded from fitting. Record the image ID, SHA-256 checksum and the median frontage width measured in the reviewed property sample.

The evaluator fits all fitting points using a normalised affine least-squares solve, rejects collinear geometry and duplicate landmarks, and computes fitting and held-out statistics separately. The proposed registration gate requires 12 fit points, 8 check points, image provenance and held-out P95 below half the measured frontage width. Reaching this numerical gate does not establish source quality, spatial representativeness, historical identity or incident location.

The supplied registration template is empty because the delivered image and independent landmarks are unavailable. Missing measurements remain null. The map still uses the three approximate preview anchors; importing a check does not silently alter the map. A reviewed transform must be applied when retracing the delivered image in its native coordinates.

## Remaining evidence work

Build the report's 30-property historical reference set from the original sheet, including surviving, redeveloped, mixed and unresolved cases. Historical site IDs must be independent of modern building IDs. Store source-versioned historical footprints and addresses, cumulative damage assessments, dated incidents and their crosswalk separately. Do not create a modern link for a demolished property merely by choosing the nearest roof.

This implementation does not invent that reference set or claim to have fixed the original registration. No archive order, model purchase or publishing action is performed by these tools.
