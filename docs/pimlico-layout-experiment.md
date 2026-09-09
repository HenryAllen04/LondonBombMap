# Pimlico: colour settings versus changed building layouts

## Finding

The current aligned paper places the middle of the I-shaped replacement over the
pale space between the historical coloured rows. This supports the user's
observation that the modern building occupies former open space. It is a visual
comparison of the supplied paper and current geometry, not independent historical
verification of the site's development.

The detector has found black regions, but 90.8% of their area lies outside the
loaded modern footprints in this selection. A building-only view therefore hides
most of that evidence. Lowering a whole-building coverage threshold cannot move
that evidence onto a replacement, establish a historical identity, or reconstruct
which old buildings stood there.

![Paper and modern outlines, with the replacement selected](../output/playwright/pimlico-02-courtyard-outlines.png)

## Controlled comparison

Run on 9 September 2026 using the saved alignment from
`2026-09-08T21:56:28.597Z`. Selection: x=1078, y=385, width=125, height=120 native
source pixels. Adjustment: east=0.9470157666715693 m,
north=-8.160835973710078 m, rotation=-0.9 degrees, scale=1.036.
Source SHA-256: `b88fd0e140982425671b24ffaae38daa0949eafcea249b455786c22b24f26b18`.

The same image, alignment, modern index and automatic palette version 1 were held
fixed. Each setting was changed through the browser and the full configuration
was downloaded for inspection. The source preview opacity was set to zero for
screenshots so the left panel shows the original paper. This is a sensitivity
experiment, not an accuracy benchmark: no independently labelled ground truth
was provided. Counts describe modern components intersecting the selection.

| Setting | Single | Mixed | Unresolved | I-shaped replacement |
| --- | ---: | ---: | ---: | --- |
| Coverage 35%, mixed share 20%, patch minimum 3 (default) | 20 | 6 | 19 | Unresolved |
| Coverage 25% | 23 | 6 | 16 | Entire object purple |
| Coverage 10% | 27 | 7 | 11 | Entire object purple |
| Patch minimum 1, otherwise default | 18 | 9 | 18 | Unresolved |
| Patch minimum 8, otherwise default | 23 | 3 | 19 | Unresolved |
| Mixed share 35%, otherwise default | 25 | 1 | 19 | Unresolved |

The replacement has 31.0% recognised purple coverage and 69.0% unclassified
coverage. Reducing the threshold changes whether the entire object is coloured;
it does not add evidence for the central open-space portion. Unclassified does
not mean historically undamaged.

The grey end beside the lower orange row is a separate component: 77.4% excluded
by the watermark band and 12.1% detected pink. At 10% minimum it becomes pink,
illustrating why a larger number of coloured objects is not a success measure.

[35% coverage](../output/playwright/pimlico-03-coverage-35.png) ·
[25% coverage](../output/playwright/pimlico-coverage-25.png) ·
[10% coverage](../output/playwright/pimlico-coverage-10.png) ·
[35% mixed share](../output/playwright/pimlico-06-mixed-share-35.png)

## Evidence outside today's footprints

The detected regions were intersected with the union of the loaded modern
footprints, using the current alignment. Percentages are area ratios, not
confidence or historical accuracy scores. Missing modern geometry, imperfect
alignment and colour classification errors can also affect these measurements.

| Detected colour | Outside modern footprints |
| --- | ---: |
| Black | 90.8% |
| Purple | 44.1% |
| Orange | 24.0% |
| Pink | 20.3% |
| Red | 17.5% |
| Yellow | 71.5% |

Yellow has only about 11 square metres detected under this alignment, so that
percentage is particularly sensitive to a few source pixels.

## Changes to the tool

- **Historical areas & outlines** is the default preview. It preserves detected
  historical regions even where no modern building intersects them.
- **Paper & outlines** shows the original paper at full opacity with unfilled
  modern outlines; modern fills no longer conceal the old layout in this view.
- Selecting a building highlights its footprint in both views and shows detected,
  unclassified, excluded and outside-selection coverage. The panel explains the
  whole-building result and specifically calls out the known replacement site.
- **Download historical areas** exports geographic regions independently from
  modern building assignments. Full configuration download retains the alignment,
  masks and settings needed to reproduce the result.
- Existing coverage defaults, saved alignment and project data are unchanged.

![Historical areas remain visible outside modern buildings](../output/playwright/pimlico-01-historical-areas.png)

## Opinion and next step for whole maps

Keep coverage at 35%, mixed share at 20% and minimum patch at 3 for this draft.
The experiment does not establish these as universal settings. Raising patch
size suppresses smaller colour distinctions; reducing it adds fragmentation.
Higher mixed share mostly conceals secondary colours. None fixes changed layouts.

For whole sheets, extract geographic historical regions first. Keep those regions
as the evidence layer independently of current buildings. Process the sheet in
bounded tiles, reconcile regions across tile edges and retain source references,
unknown areas and exclusions. Check alignment in multiple locations before
extending the current local fit across the sheet. The local correction editor is limited to 160,000 source pixels. A subsequent
build adds a separate background full-sheet extractor; see
[the current workflow](pimlico-colour-tool.md#extracting-the-whole-sheet).

Match surviving footprints to modern objects where appropriate. For replacements,
use a reviewed historical site boundary linking the old regions to today's
building. Do not expand or snap the damage colours to the nearest building: that
can cross courtyards and streets and manufacture a false spatial match.

Named modern sections can be useful display targets, but splitting a modern
building cannot recover old houses that stood outside it. The historical regions
must remain available beside any modern section or whole-building display.
The earlier named-section review editor is not yet connected to the automatic
colour workspace.

To test a larger image, first label a small held-out set of clear historical
patches, boundaries, courtyard replacements and unreadable areas. Measure colour
region agreement separately from modern-building correspondence. Count missed
historical regions and incorrect assignments as well as coloured buildings.

Validation: browser screenshots and exports for the six settings above, desktop
and 390 px mobile rendering without horizontal overflow or browser exceptions;
existing unit tests and a production build. Experiments did not save over the
user's alignment or publish any assignments to the main map.

## Follow-up implementation

The colour workspace now supports explicit historical-site links to modern
buildings, all six site colours in both 2D and 3D, reviewed/draft status, and a
provisional Russell House example. It also includes a separate full-sheet
extraction worker and preview. These features implement the region-first and
replacement-site recommendations above. Historical geometry remains unchanged;
no nearest-building or colour-expansion heuristic was added. See the
[current workflow](pimlico-colour-tool.md) for limits and saved output.

[Replacement with black and purple site colours](../output/playwright/pimlico-rebuilt-site-colours.png) ·
[3D replacement preview](../output/playwright/pimlico-rebuilt-site-3d.png) ·
[Whole-sheet extraction](../output/playwright/pimlico-full-sheet-extraction.png)
