# Paper and buildings: second exploration

Open `/proto/paper-buildings?v=2`. Keys 1–4 switch: Buildings (the unchanged prior baseline), Paper, Paired, Reference. R resets the view. Arrow keys switch unless focus is in a form field or the paper surface; on the paper, arrows pan and Enter inspects its centre.

## Direction received, 8 September 2026

Henry prefers the building view, particularly a strong tilt, and wants the original paper maps present. The previous 20 broad draft areas missed many yellow and orange houses. They are not a suitable basis for property-level claims. Continue exploring the building/paper combination; do not promote an inaccurate damage dataset.

- Paper: the supplied original crop is an intact, tilted image; flatten and magnify for reading.
- Paired: original crop beside neutral modern 3D buildings. Cameras are independent; there is no claimed georeferencing.
- Reference: the original crop in an expandable panel over the modern 3D map.
- Top colour guide: selectable explanations and a stepped dial, based on The London Archives’ published key. It explains the original ink; it does not filter or reclassify pixels.

No new house damage assignments or historical heights are invented. Modern buildings remain neutral in the new variants. Their heights come from the current map provider, with an 8 m fallback when absent.

## Source handling

The unchanged user attachment is served at `/proto/paper-buildings/source` in development only. The private attachment is not copied into public assets. A local PNG/JPEG/WebP under 80 MB can replace it through Sharper image. That image uses a browser object URL and is not uploaded; it remains available across variants during the current page session but resets on reload. Original sheet opens the archive directly: its embedded scripts raised cross-origin errors during review.

A sharper source is still required before careful historical footprint tracing, house-by-house colour review, and registration against stable street landmarks. Preserve uncertain or unreadable records as unknown. Only then investigate correspondence with today’s footprints, including rebuilt/replaced buildings.

## Verification

Rendered Paper, Paired and Reference in Chrome. Tested yellow/orange close-up, colour explanation selection, flattening, click inspection, reference expansion/reduction, and opening the archive source viewer (subsequently changed to a direct link to avoid the viewer’s cross-origin errors). Type checking passes. Browser automation denied fileChooser.setFiles; actual local image selection needs manual verification. Mobile layout rules exist but have not been tested on a device.

Colour key source: https://www.thelondonarchives.org/your-research/research-guides/second-world-war-bomb-damage
