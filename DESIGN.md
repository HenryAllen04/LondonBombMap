# London Before — design system

A quiet paper workspace holding a clearly bounded 3D map, with the original archive image within reach.
Colour means historical evidence or an explicitly labelled draft candidate, never decoration.
Everything an agent needs is in `components/system/` and the four files in `docs/design/`.

## Where the system lives

| What | File |
| --- | --- |
| Tokens (`--lb-*`) | `components/system/tokens.css`, loaded on every route from `app/globals.css` |
| Component styles (`.lb-*`) | `components/system/system.css`, loaded on every route |
| Components | `components/system/components.tsx` |
| Production call site | `components/pimlico-island/surface.jsx` (the homepage) |
| Prototype call site | `app/proto/borough-plates/workspace.jsx` |

Screens never import the two stylesheets. Wrap the page root in `lb-app` to get the paper background, ink text, DM Sans, focus rings and button resets.

## Read before editing

1. [Tokens and layout](docs/design/tokens.md): which token for which role, type sizes, spacing, breakpoints.
2. [Controls](docs/design/controls.md): Button, ToggleGroup, Toolbar, RangeField, Notice, native controls.
3. [Evidence and maps](docs/design/evidence.md): MapPlate, EvidenceBadge, ReferenceCard, DamageKey, wording rules.
4. [Decisions](docs/design/decisions.md): what the user has accepted and rejected. Do not reopen a rejected direction.

## Rules

1. Product UI uses `--lb-*` tokens only. No raw colours, no legacy `--ink` or `--font`, no new variables. The only exceptions are MapLibre paint literals in `map.jsx`, damage category colours from `lib/damage.ts`, and the fixed prototype picker and tuning panels.
2. Variants are closed TypeScript unions. A variant not in the union does not exist. Add it to the union, `system.css` and the docs together, or not at all.
3. Structure is JSX composition. Never add a layout flag such as `withLegend`, `withSidebar` or `fullScreen`; put the part in `children`.
4. Every component forwards its ref and spreads remaining props. Keep both when editing.
5. Interactive targets are 44px minimum. Every filter and toggle has a text label; colour alone never carries meaning.
6. Data metrics use tabular numbers. No overlap metric is labelled "confidence", "probability" or "verified".
7. Modern height is not historical height. Damage overlap is not historical identity. An EvidenceBadge stays visible on every map and building inspector.
8. Borough names and outlines come from the imported GLA data. City of London is separate from the 32 boroughs. Never draw a boundary that is not in the data.
9. A MapLibre map lives inside MapPlate, and page margins stay visible at desktop widths; a full-viewport canvas was rejected. The homepage island stage is the one map outside MapPlate because the island draws its own underside.
10. No scene animation on variant selection. Any future camera animation honours `prefers-reduced-motion`.

## Adding a component

Extract a component only once the same markup exists in three screens. Put it in `components/system/components.tsx`, its styles under an `.lb-` class in `system.css`, and document it in the matching docs file with one correct and one incorrect example taken from a real call site.

## Checking the docs

Ask an agent for a screen in one sentence and compare the result with these files. A hardcoded colour means the token rule is not findable; an invented variant means a set is not closed; a wrong component means a "use X, not Y" line is missing. Fix the doc, not only the screen.
