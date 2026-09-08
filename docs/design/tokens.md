# Tokens and layout

Source: `app/proto/borough-plates/system/tokens.css`. Rules apply inside `.borough-study`.
Use semantic tokens in product components, never a new raw colour or an older `--surface`/`--ink` token.

## Background selection

```text
Whole page → --lb-bg
Map's containing plate or evidence card → --lb-paper
Map loading bed / empty geographic area → --lb-map-bed
Selected navigation or secondary information → --lb-selected
Draft evidence badge → --lb-draft-bg + --lb-draft-ink
```

- Main text: `--lb-ink`; supporting text: `--lb-muted`.
- Separators: `--lb-line`; keyboard outlines: `--lb-focus`, 2px with 3px offset.
- All data swatches come from `lib/damage.ts`; preserve their category meaning. Do not use them for navigation accents.
- MapLibre paints require its supported colour format; their neutral literals are contained in `map.jsx`. Do not reuse those literals in UI CSS.
- Fixed picker and prototype tuning controls deliberately use neutral harness styling, outside the product token rules.

## Type

The project font is DM Sans, inherited from `app/layout.tsx`; keep its Arial/sans-serif fallback.
Use `--lb-type-title` (34px) for the page title, `--lb-type-body` (14px) for body text, `--lb-type-caption` (12px) for controls, and `--lb-type-input` (16px) for inputs.
Desktop titles reduce to 29px at 1150px and 28px at 760px in `plates.css`.
The 18px plate title and 21px evidence heading are fixed component values in `plates.css`; do not invent new heading sizes.
Only provenance captions and compact map metadata use the existing 9–11px values. Never use these for instructions or primary actions.
Keep font weight constant on hover/selection. Use text, symbols and `aria-pressed` alongside category colour.

## Spacing and surfaces

Spacing tokens exist for 4, 8, 12, 16, 24, 32 and 48px. Prefer these over arbitrary gaps.
Page max width is 1584px, with 48px desktop margins, 24px below 1150px and 14px below 760px.
Control radius: 5px; source/evidence card: 8px; plate: 14px.
Map canvas radius is plate radius minus the 8px plate padding; do not use identical nested radii.
Use `--lb-shadow-plate` only for the raised map. Use `--lb-shadow-card` for source and evidence cards.
Use borders for structural separators and form boundaries; do not add shadows to every control.

```css
/* Correct, as used by .lb-reference */
background: var(--lb-paper);
box-shadow: var(--lb-shadow-card);
/* Incorrect: recreates the warm surface independently */
background: #fff9ee;
```

## Map treatment

Default camera: pitch 56°, bearing −25°, zoom 16.6 on the Pimlico pilot.
The prototype tilt control supports 0–65°. These are proposed defaults, not a user-approved final camera.
Outside-borough space is muted with the GLA-derived boundary mask. The administrative border remains a dashed line.
At borough overview scale, individual buildings can be too small to render; zoom in or return to the pilot.
