# Pimlico island homepage

## Integrated Pimlico island — September 2026

Open http://localhost:3020. The homepage combines the saved map overlay with
the dirt underside merged from `origin/main`. Its implementation lives in
`components/pimlico-island/`. The old Explorer homepage and Paper, Pieces and
Night island variants have been removed. Earlier island URLs redirect home;
alignment, review and impact tools remain available under their existing URLs.

The new view contains 2,059 modern building components and their source building
parts across the captured Pimlico rectangle, streets, parks and both banks of the
Thames. Water is unioned across captured tile boundaries and subtracted from land,
then rendered as a recessed volume. The original speckled dirt configuration
(seed 416909661) follows the same cut rim, including every corner. The rectangle
is a display extent, not an official neighbourhood or borough boundary. Dirt
depth, land thickness and the river recess are illustrative.

- **Wartime sheet** places the original paper on land and roofs using
  `data/pimlico-overlay.json`. Opacity and whole-sheet / saved-selection controls
  let you compare it with modern geometry; water remains separate. Full-sheet
  placement is explicitly exploratory beyond the locally checked selection.
- **Damage colours** uses the saved colour mask, or the existing automatic
  classifier when no mask has been saved. It is confined to the saved selection,
  excludes the watermark mask, and retains historical colour regions on the
  ground as well as their exact intersections with modern roofs. It does not
  expand evidence to whole buildings or treat overlap as historical identity.
- **Modern map** removes the historical overlay. Buildings, water and dirt have
  independent visibility controls. Heights default to 1×, using source heights,
  3 m per recorded floor or the existing illustrative 8 m fallback.
- **Island**, **Overhead** and **Damage close-up** frame the complete model or the
  exact saved selection. Orbit/pan, rotation buttons, zoom, keyboard panning and
  mobile layouts are available. Geometry is batched and the same renderer is
  retained across appearance changes; it renders on interaction, not continuously.

Save changes in the alignment editor and reload the island to use them. This view
does not write to the alignment, building index, source images or other studies.
The original source is served by the existing development-only route; if it is
unavailable, the modern island remains usable with a visible explanation.

Validation: 111 tests across 18 files; typecheck and production build; browser
checks at 1440 × 1100 and 390 × 844 for all surface modes, source clipping,
opacity, visibility, height, camera controls and renderer retention. Geometry
tests cover land/water area conservation, river holes and rotated paper UVs.
Screenshots are in `output/playwright/pimlico-island-*.png`.
