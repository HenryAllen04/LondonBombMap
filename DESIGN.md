# London Before — provisional design system

Reference is the selected direction; the contained borough plate is still being explored.
Use a quiet paper workspace, a clearly bounded 3D map, and the original archive image within reach.
Colour represents historical evidence or an explicitly labelled draft candidate, never decoration.

## Scope and authority

- The implemented system lives in `app/proto/borough-plates/system/` and `app/proto/borough-plates/plates.css`.
- New exploration screens use this system. Do not infer design rules from `app/globals.css`, `components/`, or earlier prototypes: they are legacy baselines.
- Production has not been migrated. Do not import prototype components into production until a variant is selected for promotion.
- The current variants share one system: Atlas, Borough, Desk. The original Reference remains unchanged for comparison.

## Rules before editing

1. Read [tokens](docs/design/tokens.md) for colours, type, spacing and surfaces.
2. Read [components](docs/design/components.md) before adding a control, map container or source card.
3. Use semantic `--lb-*` tokens for product UI. Do not introduce raw UI colours. MapLibre paint, archival category colours and the fixed prototype controls/picker are explicit exceptions.
4. A map belongs inside `MapPlate`. Page margins remain visible at desktop widths; do not return to a full-viewport canvas.
5. Modern height is not historical height. Damage overlap is not historical identity. Keep evidence state visible on the plate and the building inspector.
6. Borough names and outlines come from the imported GLA data. Do not fabricate administrative boundaries. City of London is separate from the 32 boroughs.
7. Use native controls and 44px interactive targets. All filters need a text label; colour alone is insufficient.
8. Data metrics use tabular numbers. No overlap metric may be labelled “confidence” or “probability”.
9. Keep choices in JSX composition. Do not grow a component with layout flags such as `withLegend`, `withSource`, or `withSidebar`.
10. Prototype variant selection has no scene animation. Respect reduced-motion preferences for any future camera animation.

## Decisions received

- Preferred: Reference, 3D coloured buildings, stronger tilt, original paper map nearby.
- Preferred next direction: a map on a plate, London navigated by borough.
- Rejected: fullscreen maps as the only layout; treating broad draft areas as house-level evidence.
- Unresolved: Atlas vs Borough vs Desk; degree of tilt; historical-to-modern matching after a sharper source arrives.

For the algorithm and its limits, read [building matching](docs/building-matching.md).

## Island exploration — September 2026

The user rejected the rectangular map-container interpretation of “plate”. The accepted direction is a bounded London landmass that rotates as a 3D object. `/proto/london-island` explores Paper, Pieces and Night outside the provisional component base; the previous Atlas remains a baseline. These are competing design directions, not new production component contracts. See `app/proto/london-island/README.md` for controls, data limits and the decision record.

Paper island refinement: the user selected thickness 0.1, separation 0, lift 0.75, tilt 67°, bearing 11°, building height 1 and light 3.3, with buildings, damage colours and labels enabled. Keep these defaults in the prototype. Paper now defaults to drag-to-pan with an explicit orbit alternative. Map/background colours remain tunable; a cooler stone backdrop is the provisional starting point. Partial roof colour patches must always be described as draft area intersections, never verified historical house classifications.
