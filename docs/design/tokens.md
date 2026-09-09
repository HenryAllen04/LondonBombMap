# Tokens and layout

Source: `components/system/tokens.css`, defined on `:root` and loaded from `app/globals.css` on every route.
Use the semantic `--lb-*` tokens below. Never write a raw colour in product UI. The legacy `--ink`, `--font` and `--shadow` variables in `app/globals.css` exist only for the retired `bomb-sites` prototype.

## Colour by role

| Role | Token |
| --- | --- |
| Whole page background | `--lb-bg` |
| Card, plate, toolbar, segmented group, notice | `--lb-paper` |
| Map loading bed, empty geographic area, island stage | `--lb-map-bed` |
| Selected toggle, pressed toolbar button, secondary information block | `--lb-selected` |
| Body and control text | `--lb-ink` |
| Supporting text, captions, section labels | `--lb-muted` |
| Separators, outline borders, selected list-item border | `--lb-line` |
| Draft evidence badge | `--lb-draft-bg` with `--lb-draft-ink` |
| Focus ring | `--lb-focus`, 2px solid, 3px offset (applied by `.lb-app`) |

```text
Which background?
 ├── The page itself → --lb-bg
 ├── A surface on the page (card, plate, toolbar, notice) → --lb-paper
 ├── The area a map or the island is drawn on → --lb-map-bed
 ├── The pressed or selected state of a control → --lb-selected
 └── A draft-evidence pill → --lb-draft-bg, and nothing else
```

Damage category swatches come from `damageCategories` in `lib/damage.ts`; `COLOUR_CLASSES` in `lib/map-colours.js` holds the same six values for the colour editor. They mean a damage class. Never use them as an accent, a selected state or a navigation colour.

## Type

Font: DM Sans through `--font-sans` from `app/layout.tsx`, fallback Arial, sans-serif. `.lb-app` sets it; do not set `font-family` anywhere else.

| Use | Size | Token |
| --- | --- | --- |
| Page title `h1` | 34px, weight 500, letter-spacing −1.2px | `--lb-type-title` |
| Body text, list toggles, checkbox labels | 14px | `--lb-type-body` |
| Buttons, segmented toggles, badges, notices, captions | 12px | `--lb-type-caption` |
| Text inputs and selects | 16px, which stops iOS zoom | `--lb-type-input` |
| Section labels (`lb-section-label`) | 12px, letter-spacing 1.5px, weight 500, uppercase text | `--lb-type-caption` |

Fixed component sizes that are not tokens: plate heading 18px, inspector heading 21px, dialog heading 26px. Do not invent another heading size.
Provenance captions and map metadata may use 9 to 11px. Instructions and actions never go below 12px.
The title reduces to 29px below 1150px and 28px below 760px. Font weight stays constant across hover and selected states.

## Spacing, radius, shadow

Spacing tokens `--lb-space-1/2/3/4/6/8/12` are 4, 8, 12, 16, 24, 32 and 48px. Use them for gaps and padding. The 3px inset inside toolbars and segmented groups is the one fixed exception.
Radius: `--lb-radius-control` 5px for buttons, list toggles and inputs; `--lb-radius-card` 8px for cards and notices; `--lb-radius-plate` 14px for the map plate, island stage and dialogs. Inner radius equals outer radius minus padding; nested elements never share a radius.
Shadow: `--lb-shadow-plate` only on the raised MapPlate. `--lb-shadow-card` on cards, notices and a toolbar floating over a map. Everything else uses a `--lb-line` border or nothing. Never put a border and a shadow on the same element.

```css
/* Correct, as in .lb-reference */
background: var(--lb-paper);
box-shadow: var(--lb-shadow-card);
/* Incorrect: recreates the warm surface independently */
background: #fff9ee;
```

## Page frame and breakpoints

Content max width 1584px. Interactive targets are 44px minimum in both directions.
There is no shared page-frame component yet. Two frames exist and unifying them is an open decision (see decisions.md):

| Frame | Where | Padding | Header | Breakpoints |
| --- | --- | --- | --- | --- |
| Homepage (production) | `surface-header`, `surface-heading`, `surface-footer` in `components/pimlico-island/surface.css` | 40px, 24px below 1100px, 14px below 760px | 80px, 64px below 760px, wordmark 16px weight 600 | 1100 / 760 |
| Prototype | `lb-site-header`, `lb-wordmark`, `lb-page`, `lb-page-intro` in `app/proto/borough-plates/plates.css` | 48px, 24px below 1150px, 14px below 760px | 78px, 66px below 760px, wordmark 22px | 1150 / 760 |

A new production screen copies the homepage frame classes into its own stylesheet with the same numbers. A new prototype under `app/proto/borough-plates/` imports `plates.css` and uses the `lb-` frame. Neither frame is loaded globally.

## Map treatment

MapLibre default camera on the Pimlico pilot: pitch 56°, bearing −25°, zoom 16.6. The prototype tilt control covers 0 to 65°. The homepage island presets are `island`, `top` and `detail`.
Outside-borough space is muted with the GLA-derived mask; the administrative border is a dashed line. MapLibre paint literals live in `app/proto/borough-plates/map.jsx` and are never reused in CSS.
