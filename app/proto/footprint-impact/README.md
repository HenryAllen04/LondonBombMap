# Footprint impact exploration

Open http://localhost:3020/proto/footprint-impact?v=3. Keys 1–4 and left/right switch directions. R remounts the active variant controls; camera arrow keys and native slider keys retain their normal behaviour. URL selection persists across reload.

| Direction | Axis | Best use | Cost |
| --- | --- | --- | --- |
| Current | Existing building-only renderer, unchanged | Baseline comparison using the same input evidence | Omits all historic evidence outside the model |
| Footprints | 2D geometric comparison with original-paper toggle | Inspect exact plan intersections and source alignment | Does not communicate height |
| Fragments | In-place 3D roof projection and striped ground fragments | See overlapping and missing areas in one physical location | Small fragments can be occluded from some angles |
| Layers | Exploded 3D decomposition | Explain how the three parts relate | Vertical offsets are illustrative, and require interpretation |

The view is an isolated prototype. Nothing in the existing map, overlay editor, or saved alignment imports this directory. No direction has been selected or promoted. Once a direction is chosen, record that decision and the rejected alternatives before integrating it.

## Materials and geometry

Uses the existing DM Sans font, borough-study tokens, plain CSS, Three.js and polygon-clipping. The Current variant imports the existing ObjectPreview without modifying it. The new scene is retained across picker changes, including visits to the 2D and Current variants. Fragments and Layers remember their own camera positions; numerical view controls update the renderer directly.

The server reads the saved `data/pimlico-overlay.json`, filters the current modern index to the selection and passes the existing Russell House trial boundary. If the saved alignment has no colour mask, the browser generates the same automatic draft mask as the colour editor from the original source image. It does not save the result or add the trial site link to the editor. Existing saved colour settings are reused when present. An incompatible source or a selection no longer containing the site produces a recoverable error.

All boolean operations use the same local metre coordinate system:

- H: union of classified damage regions, clipped to the trial site.
- M: union of all loaded modern footprints in that site.
- Shared ground: H ∩ M.
- Outside modern: H − M.
- No classified damage: M − H, which includes any excluded or unclassified evidence.

Colours remain in their source locations. Roof fragments are additionally clipped to each actual render piece and use that piece's base and height. Outside fragments have only a 0.35 m display thickness; no historical building heights are invented. The neutral layer has dotted roofs and outside damage is striped, so the relationship is communicated separately from the damage colour.

The Layers view raises overlap by a configurable display offset and the neutral remainder by twice that offset. No horizontal coordinates are altered. This is a counterfactual projection of mapped damage, not a blast simulation or evidence that an overlapping building survived. The detection regions are not verified historic building outlines; outside fragments may indicate missing buildings but can also reflect extraction error, alignment error or missing modern data.

## Source and limits

Source: user-supplied 2060 × 1290 wartime sheet, SHA-256 `b88fd0e140982425671b24ffaae38daa0949eafcea249b455786c22b24f26b18`, served by the existing local source route. Historical image © The London Archives (City of London); [LCC Sheet 88](https://www.londonpicturearchive.org.uk/view-item?i=343662). Modern Overture release 2026-08-19.0; OSM/Overture attribution remains visible.

The 9 September saved local alignment reports 10.3 m RMS residual against three manually estimated check landmarks, not independently verified control points. Russell House uses the modern index's illustrative 8 m fallback height. These limitations are available in the evidence dialog and described alongside the model. The work does not establish the historical cause or date of any building replacement.

The GeoJSON download preserves each category's overlap and outside fragments, the neutral modern remainder, plan areas, source hash, alignment parameters, landmark pairs, trial scope and metrics. It has no inferred blast radius or redistributed site colours.

## Verification — 9 September 2026

- `pnpm typecheck`: passed.
- `pnpm test`: 17 existing files / 107 tests passed.
- `pnpm exec next build`: passed. Existing generated assets were used so the index-generation script did not overwrite the working index.
- Browser checked all four views at 1440 × 1100 and 390 × 844, including original paper, modern outlines, plan zoom, camera controls, layer filtering, fragment details, evidence dialog / Escape, download, URL reload, keyboard switching, and reduced motion.
- Shared canvas identity and dimensions were preserved, and Fragments → Layers → Fragments restored camera and target coordinates to within 1e-8 m. Layer separation was exercised at 0 and 50 m.
- No application exceptions or console warnings/errors during verification. No horizontal overflow in any mobile variant.
- Exported plan-area checks, independently recomputed against the loaded modern index, passed within 0.0001 m²: shared + outside conserves the classified damage, shared + neutral covers the complete modern union, and the partitions are disjoint. A courtyard/hole check confirmed that empty courtyard space is not counted as occupied.

At the saved alignment, classified damage within the trial boundary is 1,816.916 m²: 339.107 m² overlaps modern geometry and 1,477.808 m² lies outside it (81.34%). Modern area without classified damage is 619.877 m². These are geometric area measurements, not an accuracy score or a whole-London estimate.

Screenshots: `output/playwright/footprint-impact-{current,footprints,fragments,layers,paper}.png` and `footprint-impact-mobile-{current,footprints,fragments,layers}.png`. Temporary browser and geometry verification scripts are in `.context/check-footprint-impact.js` and `.context/check-footprint-geometry.cjs`.
