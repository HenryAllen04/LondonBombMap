# Decisions

The record of what the user has accepted and rejected. Do not reopen a rejected direction without asking.

## Accepted

- Reference direction: 3D coloured buildings, stronger tilt, the original paper map nearby.
- A map on a plate, London navigated by borough (borough-plates prototype, September 2026).
- A bounded London landmass that rotates as a 3D object, rather than a rectangular map container (September 2026).
- Paper island defaults: thickness 0.1, separation 0, lift 0.75, tilt 67°, bearing 11°, building height 1, light 3.3, with buildings, damage colours and labels on. That prototype defaulted to drag-to-pan with an explicit orbit alternative; the accepted homepage defaults to orbit with a Pan toggle in the camera toolbar. A cooler stone backdrop as the provisional start.
- Homepage (September 2026): the integrated Pimlico island with the wartime sheet, modern 3D buildings, recessed Thames and the merged speckled dirt underside. Source alignment, colour preview and the map editor stay reachable. Old island URLs redirect to `/`. The variant selector and the Earlier studies link are removed.
- Design system home (September 2026): `components/system/`, loaded globally, documented in `docs/design/`.

## Rejected

- Fullscreen maps as the only layout.
- Treating broad draft areas as house-level evidence.
- The rectangular map-container reading of "plate".
- The former Explorer homepage and the Paper, Pieces and Night island variants, now removed.

## Unresolved

- Atlas, Borough or Desk for borough navigation.
- Degree of tilt.
- Historical-to-modern matching once a sharper source arrives; see `docs/building-matching.md`.
- One page frame. The homepage and the borough-plates prototype use different header heights, margins and wordmark sizes (see the table in tokens.md). Whichever is chosen becomes a global `lb-` frame in `system.css`.
- Where island appearance preferences persist. The homepage keeps its settings in component state; no storage contract exists yet.

## Sources

Retired exploration notes: `app/proto/london-island/README.md`, `app/proto/borough-plates/README.md`. Partial roof colour patches are always described as draft area intersections, never verified historical house classifications.
