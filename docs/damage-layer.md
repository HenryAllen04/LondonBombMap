# Pimlico damage preview

## What is implemented

Twenty provisional coloured areas over a modern map. The Today / Bomb damage control shows or hides the historical annotation without changing the map position. Each area is selectable and shareable; opacity can be adjusted. The original source sheet is available on demand.

The annotations are **simplified groups**, manually outlined from visible colours in the London Picture Archive public viewer. They are not individual building footprints or a complete survey. Placement and colour interpretation are unverified. No measured positional accuracy is claimed, and modern buildings must not inherit a damage classification from these shapes.

The default view labels them “draft areas”; the selected-area card and About explain their provisional status. Uncoloured areas are unassessed. The 3D option shows current OpenStreetMap building geometry with OpenFreeMap's supplied render heights, including any provider estimates. The historic annotation remains flat; no historical heights are invented.

## Source and authoring

- LCC sheet 88, catalogue `LCC_AR_TP_P_041_088`, record 346262.
- [Public viewer](https://www.londonpicturearchive.org.uk/zoom-item?i=343662).
- `data/pimlico-traces.json` holds the observed image-space polygons, category readings and three approximate control points.
- The coordinates refer to the inspected 1800 × 952 viewer frame, not to the purchased image. The free downloadable preview is only 400 × 287 pixels and is insufficient for individual buildings.
- Control points use garden-centre and bridge locations returned by Photon/OpenStreetMap on 8 September 2026. OSM way identifiers are retained in the JSON. These are approximate landmark matches; they are not a surveyed calibration.
- `lib/damage.ts` converts the source coordinates to WGS84 using an affine transformation and exposes GeoJSON to MapLibre. It retains source, sheet, category and `draft` status on each feature.
- The files in `.context/reference/` are private working references. They are not public site assets. The website uses the archive's own viewer until the licensed image is supplied.

## When the purchased file arrives

1. Keep the original and issued licence privately. Add the permitted web-size image through `NEXT_PUBLIC_ARCHIVE_IMAGE_URL` as described in the README.
2. Establish new control points in the delivered image's pixel coordinates. Use unchanged street intersections or identifiable surviving features; validate with additional points not used to fit the transformation.
3. Recheck all twenty outline groups and every colour. Refine them into actual historical building footprints where the source supports it; omit ambiguous buildings.
4. Replace the source pixel rings and control points in the JSON. Keep stable area IDs when the same area is revised so shared links continue to work.
5. Only remove the visible draft status after an actual review. Add reviewed-source metadata and coverage boundaries before expanding across London.

The paid sheet is ordered and awaiting Email/FTP fulfilment. Purchase does not make the current traces verified.
