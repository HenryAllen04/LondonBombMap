# Borough plates

Run `pnpm dev`, then open http://localhost:3020/proto/borough-plates?v=2.

The fixed picker (or keys 1–4) compares:

1. Reference: the previous preferred version, retained as the baseline.
2. Atlas: a freestanding paper-toned plate, source crop inset, borough selector.
3. Borough: searchable borough navigation alongside the plate.
4. Desk: map and original source beside one another, with a building evidence inspector.

All new variants offer tilted modern extrusions, draft colour filtering, threshold adjustment, borough overview and return to pilot. Desk also offers keyboard-selectable candidate evidence. The source image opens at full size; its archive catalogue link is separate. The supplied image is served only in development through the existing private source route. Other boroughs deliberately show missing historical coverage.

Design contracts: `/DESIGN.md`, `/docs/design/tokens.md`, `/docs/design/controls.md`, `/docs/design/evidence.md`. The shared components and tokens live in `components/system/`.
Matching implementation and limitations: `/docs/building-matching.md`.

Decision: retain the Reference's warm paper and quiet map. Explore a contained plate and borough navigation. The final layout and historical footprint dataset remain open. No prototype has replaced the production page. RBush and polygon-clipping are the only new shared runtime dependencies.

Validation: 25 tests passed, including six polygon-matching cases; TypeScript check and production build passed. Browser checks cover the three new layouts, candidate evidence, method dialog and Camden navigation. The current coarse traces produce very few qualifying candidates; these colours are not a property-level reconstruction.
