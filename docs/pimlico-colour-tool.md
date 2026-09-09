# Colour areas

Open `/proto/london-island/compare/overlay` and choose **3 · Colour areas**.
The tool uses the saved alignment. It does not adjust placement while you sample
or brush colours, and it does not change the main island map automatically.

## Working with the selected area

Click **Auto colour this area** for an immediate first pass. It classifies source
pixels using the paper's damage palette, rejects pale paper and green markings,
filters thin dark ink, and keeps the watermark band unknown. It is a draft to
inspect, not a verification of damage or historical building identity. **Run auto
again** starts fresh, replacing manual samples and brush corrections; **Undo**
restores them together.

**Undo / Redo** are always in the header. ⌘Z (Ctrl+Z), ⇧⌘Z and Ctrl+Y work outside
text fields. History holds the last 60 edits, across tool steps, including automatic
passes, brushes, alignment changes and review notes. Saving keeps this session's
history; reloading starts a fresh history from the saved version.

Open **Manual corrections** to sample or brush; **Details & fine-tuning** contains
optional settings and reviews. With manual corrections closed, clicking the paper
cannot change colours.

1. Select Black, Purple, Red, Pink, Orange or Yellow, then click a clear patch of
   that colour on the left paper view. The sample uses the original image pixels,
   not the tinted overlay. By default it finds similar patches throughout the
   selection. Choose connected-patch reach for an isolated region.
2. Adjust colour tolerance and, if needed, minimum suggested patch size. Add
   samples for faded variants. Undo or remove accidental samples; pale paper and
   dark lettering can resemble damage fills.
3. Use Add brush, Erase brush and Mark unknown for corrections. Undo
   reverses the latest correction. Samples are reapplied before brush corrections,
   so tolerance changes retain deliberate edits. The conservative known watermark
   band stays excluded even when a correction passes over it.
4. Start with **2D buildings** and **Site-aware** (the default) to keep unknown
   areas neutral while showing colours on linked replacements. Use **Fill surfaces**
   for complete, clean building colours. Choose **Exact overlap** to colour only the part
   of each modern footprint that overlaps the historical colour. **Historical
   areas & outlines** shows the complete historical regions. Detected colours stay
   at their original mapped locations, including old buildings now outside modern
   footprints. **Paper & outlines** shows the untinted original beneath modern
   geometry. Clicking a building highlights the same footprint on both views and
   opens a coverage explanation below, including unknown, excluded and outside
   area. Known replacement sites have a specific explanation of changed layouts.
   Switch to **Whole buildings & stripes** to inspect assignments. Single colours fill the whole
   object, substantial competing colours produce stripes, and unresolved objects
   stay grey. The preview menu includes paper, outlines and selectable 3D objects.
   Stripes express category membership, not the original positions or proportions
   of those colours on the historical houses. Heights may be source estimates.
5. Adjust minimum coloured coverage and mixed share. Coverage uses the complete
   modern footprint, including holes and portions outside the selection. Mixed
   colours need the chosen share of coloured coverage and at least 5% of the whole
   footprint. Thresholds are display rules, not confidence scores.
6. Click an object or use the building selector to inspect category coverage,
   unknown/outside coverage and known replacement-site status. Record a visual
   check or correction note. Changing alignment, masks or rules clears visual
   checks because their basis changed. These checks do not verify historical
   building identity.

The colour editor works on at most 160,000 native source pixels at once. Select a
smaller area if needed. Changing the selection preserves samples and strokes;
**Refresh colour area** explicitly reruns them over the new selection. Recheck any
newly included streets before extending a local alignment.

## Saving and export

**Save to project** atomically writes `data/pimlico-overlay.json` with the original
alignment, a `colours` section and recomputed output. The colour configuration
stores the original-pixel grid, colour samples, correction strokes, run-length
encoded categorical mask, detection settings, display rules, source fingerprints
and visual reviews.

`artifact.colourAssignments` is a FeatureCollection of complete modern buildings
with stable component/source IDs, per-category coverage, single/mixed/unresolved
status, replacement relationships and visual reviews. Its metadata includes the
geographic colour-region FeatureCollection and unresolved/excluded regions.
`historicallyVerified` remains false. The saved transform links the source pixels
to the geographic output. Server export validates masks, bounds and building
fingerprints and recomputes assignments from the pinned geometry.

**Download** exports the full project configuration. **Download buildings
GeoJSON** exports just the building FeatureCollection. Main-map adoption can read
the same saved objects after their colours have been reviewed; saving does not
silently replace the existing historical layer.

The current watermarked crop is only 125 × 120 source pixels. Use it to test the
workflow and broad area colours. Small red/orange details and historical property
boundaries need the better source and explicit review.

## Comparing changed layouts

See [the settings experiment](pimlico-layout-experiment.md) for screenshots and
results on the I-shaped replacement. Coverage measures spatial intersection; a
replacement in the former courtyard cannot inherit the surrounding historical
rows simply by lowering the threshold. Named sections only help when a chosen
modern section is the intended display target. Historical regions must remain
independent of the modern geometry.

**Download historical areas** exports the detected geographic regions (including
excluded areas) without dropping those outside modern footprints. The full
configuration download remains the reproducible source for alignment and masks.

## Linking a replacement to its historical site

Click **Auto colour this area**, then **Preview Russell House site link** to see Russell
House linked to a provisional boundary around the old black/purple rows and open
space. This creates an undoable draft; the example boundary is not a surveyed
parcel or approved historical correspondence. Select **3D buildings** to see the
same site colours on the replacement's roofs and walls.

For another site, click a modern building and choose **Link historical site**.
Click at least three corners on the left paper. Include the historical rows and
the linked replacement; avoid crossing streets into unrelated sites. Click modern
buildings on the right to add or remove targets. **Undo corner** and **Cancel
boundary** affect the unfinished drawing; **Create site link** records one global
Undo operation. Redrawing a saved boundary can also change its target buildings.

Every detected category in a linked site contributes to the building display:
Black, Purple, Red, Pink, Orange and Yellow. The site breakdown lists all six,
including zero coverage. Site colours are not filtered by the building mixed-share
threshold. Stripe widths/positions indicate membership, not damage proportions or
historical locations. The original historical regions are unchanged. Colours are
not expanded or propagated to neighbouring buildings.

Choose **Rebuilt site**, **Surviving buildings**, or **Relationship uncertain**.
Rebuilt sites have a dashed gold outline and an explicit label when selected.
Add evidence notes and choose **Mark site link checked** after reviewing the
boundary and targets. Draft links remain visible in this authoring preview.
Changing alignment, masks, colour rules, site geometry, notes or targets returns
checks to draft. Undo restores the previous checks and geometry together.

**Save to project** includes `colours.sites` in `data/pimlico-overlay.json` and
recomputes geographic site features under `artifact.colourAssignments.metadata.sites`.
Each building retains its direct footprint coverage plus a separate `display`
object containing the linked categories, basis, site ID and rebuilt flag.
`display.paintEligible` requires a checked site with detected colours; it is a
permission to display a reviewed *site relationship*, not proof of historical
building identity. Main-map adoption is still separate. One component can link
to one site, and a site can link to several modern components. Site boundaries
must lie inside the current selected area and touch their linked buildings.

## Extracting the whole sheet

Open **Whole-sheet extraction** below fine-tuning, then **Extract full sheet**.
A background worker classifies 256 px tiles with a one-pixel halo, joins connected
regions across tile boundaries, removes small patches globally and unions each
region's geometry. It supports all six colours and excludes the watermark and
configured map margins. It uses the current minimum patch size and automatic
palette; selected-area manual samples, brushes and site links are not applied.

The result includes a full-sheet preview and **Download full-sheet GeoJSON**.
The download includes source identity, map frame, exclusions, native region pixel
counts, all six category totals, alignment and its locally selected area. Areas
beyond that local extent are explicitly described as extrapolated. Changing
alignment or extraction settings makes the result stale until extracted again.
Cancel terminates the worker without changing the selected-area document.
The result is a downloadable draft; **Save to project** saves the selected-area
configuration and site links, not this separate full-sheet download.

On the supplied 2060 × 1290 source, the framed extraction produced 1,459 regions
(including exclusions), about 1.9 MB of GeoJSON, in roughly one second in local
headless Chrome. This is a performance observation, not an accuracy score. The
frame is a conservative estimate in `data/pimlico-overlay-source.json` and needs
review when replacing the source. Printed symbols, faded colours and places
outside the checked alignment require review before making building links.

## Colouring part of a modern building

**2D buildings → Exact overlap** preserves the source-shaped sections; choose
**3D buildings** for separately extruded sections on roofs and walls. Every detected
colour is intersected with the modern footprint. The remainder stays grey,
including watermark-excluded, unclassified and outside-selection portions.
The whole-building coverage and mixed-share thresholds do not suppress these
partial matches. Site-link colours do not spread into these partitions either:
this mode uses only the direct geographic overlap.

Click a coloured or grey section (or focus it and press Enter/Space in the 2D
view). Its counterpart is highlighted on the source paper. The explanation names
the damage colour and its share of the complete modern footprint, distinguishes
replacement sites where recorded, and explains that grey means unknown. The
boundaries are source-derived estimates, not individual flats, storeys or original
walls. A grouped section may contain several disconnected patches of one colour.

**Download displayed sections** exports these derived geometries, parent IDs,
category, footprint coverage, unknown status and source metadata. They are also
recomputed on Save to project under
`artifact.colourAssignments.metadata.sections`. The original modern footprints
and historical regions remain available. Undoing a colour/alignment edit restores
the corresponding sections. The whole-building/site display modes remain in the
preview menu.

The bottom-right trapezoid example now shows pink (10.8%), purple (10.3%), orange
(0.8%) and red (0.4%) on the matching parts, with the rest grey, under the user's
alignment saved at 2026-09-09T11:18:51.860Z.

[2D sections and explanation](../output/playwright/pimlico-matched-sections.png) ·
[3D sections](../output/playwright/pimlico-matched-sections-3d.png)

The **3D buildings** menu option uses matched sections, carrying the same partial
colours as **2D buildings**. **3D whole buildings & stripes** is the
explicit alternative for whole-object/site-link colours. The two modes share the
same underlying source data but have different meanings; switching the camera
must not make the ordinary 3D option silently apply whole-building thresholds.

## Filling the building surfaces

**Fill surfaces** is available in both **2D buildings** and **3D
buildings**. **Site-aware** is now the default for a new colour workspace. It fills each matched modern object completely, using all of its
detected colours with clean straight divisions. **Exact overlap** restores the
previous source-shaped, partially grey version. All three techniques use the same
source data and are separate from the camera/view menu.

For a single detected colour, the full footprint gets that colour. For multiple
colours, their area-weighted locations determine their broad order across the
building, and their relative matched areas determine each colour's display area.
The building is divided with straight cuts along that order. Holes and separate
polygon components are retained; fills cannot extend beyond the object's geometry.
Small detected categories remain represented. Buildings with no matched colours
remain grey. A linked historical site supplies the evidence instead of direct
footprint overlap when present.

These are illustrative building fills, including where the source is unclassified,
excluded or outside the selected area. They do not establish additional damage.
The source masks, exact overlap geometries, exclusions and historical identity
status are unchanged. Click a filled section to see both its displayed share and
the actual matched coverage used to derive it. Straight display divisions are
not historical wall, property or flat boundaries.

The finish is stored as `colours.surfaceMode` (`filled`, `overlap` or `site-aware`); switching
it participates in Undo but does not invalidate historical-site checks because
the underlying evidence has not changed. Save/reload retains the choice.
`artifact.colourAssignments.metadata.filledSections` stores the inferred display
partitions, `sourceCoverage`, displayed `coverage`, evidence basis and source/site
IDs. The exact version remains under `metadata.sections`. **Download displayed
sections** exports the currently chosen finish.

For the highlighted pink/purple row, the current alignment gives approximately
55.9% direct pink overlap and 15.1% purple overlap. Filling the whole object yields
approximately 78.8% pink and 21.2% purple, with no grey gaps. This ratio is a display
choice, not a finding that the formerly unknown area suffered those damage levels.

[Filled surfaces in 2D](../output/playwright/pimlico-filled-surfaces-2d.png) ·
[Filled surfaces in 3D](../output/playwright/pimlico-filled-surfaces-3d.png)


### Comparing techniques in the 3D view

The preview now has three technique buttons, available in both 2D and 3D:

- **Exact overlap:** historical colour stays at its measured overlap with the modern footprint. Unknown portions remain grey.
- **Site-aware:** the suggested balance and default when no finish was saved. Exact overlap is used except for explicitly linked replacement buildings. Those show all colours from their authored historical site as illustrative complete sections. Draft links remain visibly labelled; uncertain and surviving-site links do not trigger extrapolation in this mode.
- **Fill surfaces:** the complete-object method described above, including extrapolation across unclassified, excluded and off-selection portions of a matched object.

The three techniques use the same extracted evidence and six-colour palette. They
change the display, not the original mask or modern footprint. **Preview Russell
House site link** adds the existing provisional boundary and selects Site-aware
without leaving 3D. It is an undoable draft, never an automatic historical verification.
Other replacements require their own authored links.

The 3D renderer and orbit camera remain mounted during technique and site-link
changes. **Fit 3D view** explicitly resets the camera. The paper/2D zoom controls
are labelled separately. The selected technique is saved and included in Undo;
**Download displayed sections** exports that technique with its evidence metadata.

For the saved local alignment tested on 9 September, Russell House has about
25.7% direct purple overlap and only 0.02% direct black overlap. Most of the black
is beside the replacement footprint. The provisional site supplies both colours,
producing roughly 60% purple / 40% black illustrative display sections. Those
ratios are not surveyed damage boundaries on today's building.

The bottom-right trapezoid has only about 22% detected colour; much of the rest is
unclassified, watermark-obscured or outside the crop. Site-aware keeps its unknown
remainder grey. Full fill colours that remainder as an explicit illustration.
The supplied modern polygon is solid: a pale area on the historical sheet does
not establish a courtyard in today's geometry. Correcting that geometry requires
checking a modern footprint independently.

Validation: 107 unit tests; production build; browser checks covering all three
techniques, an identical zoomed 3D screenshot after switching away and back,
all six categories on synthetic replacement sites, the real black/purple trial,
the neutral corner, export, Undo, actual save/reload and mobile layout. The saved
user configuration was restored byte-for-byte after the save test.

[Exact overlap](../output/playwright/pimlico-technique-exact.png) ·
[Site-aware](../output/playwright/pimlico-technique-site-aware.png) ·
[Full fill](../output/playwright/pimlico-technique-filled.png)
