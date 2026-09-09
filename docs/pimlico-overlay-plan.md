# Selected-area overlay pilot

Status: selection, alignment and the colour-area editor are implemented at
`/proto/london-island/compare/overlay`. The colour editor includes whole-building
assignment, mixed-colour stripes, 2D/3D previews, explicit replacement-site links
with all six colours, and a background whole-sheet region extractor. See
[Colour areas](pimlico-colour-tool.md). The small evaluation and adoption into the
main island map remain to be completed after reviewing the authored colours.

## Source and starting area

- Source: `.context/attachments/Gvxy1M/watermark.png`, 2060 × 1290 pixels.
- SHA-256: `b88fd0e140982425671b24ffaae38daa0949eafcea249b455786c22b24f26b18`.
- Start with the three previously discussed blocks around Cambridge Street,
  Alderney Street and Winchester Street, including the Russell House replacement
  site. They are visible near the centre-right, mostly above the watermark.
- Let the user draw/adjust this selection on the original sheet. Its exact pixel
  boundary is not yet measured or approved. Retain nearby junctions as alignment
  context even when they fall outside the colouring selection.
- Preserve the watermarked original. Mark obscured or unreadable regions as
  unknown for colour extraction; do not reconstruct their missing colours.
- The previous screenshot's 6 m east / 1 m south adjustment belongs to that
  screenshot. Keep its saved review intact; do not apply it to this image.

## First milestone: select, align, save

Use one overlay canvas on the compare page with a small control bar:

1. Select the working area on the full sheet. Store the selection in original
   image pixels so zooming/cropping the view cannot change its identity.
2. Overlay it on fixed modern building outlines. Provide opacity, move, rotate,
   scale and reset. Show the full sheet in an overview for orientation.
3. Offer paired landmark picking to calculate placement, with additional picks
   reserved for checking. Use unchanged junctions/corners around the selection;
   do not fit to replacement building shapes. Begin with a simple transform;
   expose an affine fit only if checks show it is needed.
4. Save the image identity/dimensions, source selection, transform, point pairs,
   geographic study boundary and local check results together. Reload must
   restore the same placement at any zoom.

Output: `data/pimlico-overlay.json`, separate from the existing manual
correspondence review. This first milestone is complete when selecting, aligning,
saving and reopening work. Colour extraction is the next milestone.

The tool also downloads the full JSON configuration and its embedded geographic
selection as a FeatureCollection. The saved matrix maps full-sheet source pixels
to a local east/south metre plane; its origin and scale constants are recorded.
The file retains the source identity, original-pixel selection, alignment model,
adjustments, point pairs, opacity/outline settings and view extents. The local save
endpoint validates the configuration and writes atomically. The source route
checks the supplied image hash and serves the original only in development.

Starting landmarks were transferred from the earlier screenshot with image
feature matching (191 inliers), retaining the earlier approximate geographic
coordinates. That helps initial positioning but is not an independent accuracy
check. Their provenance is stored in `data/pimlico-overlay-source.json`.

A local fit is valid only over the tested area. Retain that extent in the saved
data. Expand the checked area before using it elsewhere on the sheet; do not
silently treat a locally acceptable fit as a validated full-sheet alignment.

## Second milestone: colour regions and whole-object preview

1. Sample category colours from this image inside the selected area. Suggest
   regions, with colour tolerance and add/erase correction controls. Keep the
   source visible while correcting. Lettering, boundary ink, paper, green map
   markings and watermark text must not become damage categories. Black damage
   areas require particular inspection because linework is also dark.
2. Store reviewed colour regions in source pixels and derive their geographic
   geometry through the saved transform. Tiny unreadable distinctions remain
   unknown; do not enlarge them into invented property-level labels.
3. Intersect those regions with the current complete building components. Store
   category coverage, unclassified/obscured coverage and source IDs for each.
   Keep whole component geometry for rendering; do not cut roofs at colour edges
   or at the selected-area boundary. Objects extending beyond the study selection
   need enough observed coverage or remain unresolved.
4. Preview a dominant colour for clear cases and a mixed label for significant
   competing colours. Make the minimum coverage and mixed-category rule visible
   controls. A whole-object stripe treatment can display mixed categories later.
   Tiny slivers must not select a colour by themselves.
5. Label this view as historical area colours on modern buildings. Preserve
   known rebuilt-site relationships. A spatial colour assignment does not claim
   that the present building itself existed or suffered that damage.
6. Save alignment, region masks, display rules and derived building assignments
   together. Alignment changes recompute assignments automatically. Keep manual
   whole-building or section overrides as an optional exception workflow.

## Small evaluation before expanding

- Use fitting points distributed around the selected area and at least three
  additional check picks. Report check distances and local uncertainty separately
  from fitting error. Judge error against the narrow rows we want to distinguish.
- Review 12 modern objects/sites covering clear single colours, adjacent red and
  orange, mixed black and purple, replacement footprints, selection edges and
  obscured detail. Record disagreements and unresolved cases explicitly.
- Compare the automatic output to these visual review decisions. This measures
  agreement for the area-colouring task, not verified historical house identity.
- Test deliberate small alignment shifts to reveal colour assignments that are
  sensitive to placement. Label that as sensitivity, not measured accuracy.
- Expand to the next area only after inspecting these results. Reuse the sheet
  placement where supported by checks; add local corrections only where needed.

## Replacing the image later

Keep geographic anchors and the selected geographic study area. If the delivered
image is an exact known resize/crop, compose that pixel mapping with the existing
transform. Otherwise, pair the same geographic anchors on the new image and
recheck alignment. Store a new source hash/version rather than silently replacing
the old pixels. Re-extract colour regions at the better resolution and review
changed assignments; modern building IDs and geographic study boundaries remain
reusable.
