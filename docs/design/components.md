# Component contracts

Source: `app/proto/borough-plates/system/components.tsx`; real usages: `workspace.jsx` in the same prototype directory.
Every component forwards a ref and spreads native attributes. Never remove this when adding a variant.
The listed variants are closed TypeScript unions. Nothing else exists.

## Button

Use for actions. Use a real anchor for navigation, including archive records; never simulate links with button handlers.
Variants: `quiet` (default), `outline`, `solid`. Sizes: `md` (default), `icon`.

```text
Icon-only action → size="icon" + aria-label
Single dominant action → variant="solid" (at most one per view)
Secondary action needing a boundary → variant="outline"
Otherwise → variant="quiet"
```

```tsx
// Correct: existing action in workspace.jsx
<Button variant="outline" onClick={()=>method.current.showModal()}>About the matching</Button>
// Incorrect: primary is not a variant in this system
<Button variant="primary">About the matching</Button>
```

Buttons default to `type="button"`; specify `submit` only inside a form that submits.

## MapPlate

Use to contain an interactive geographic map. Use ReferenceCard for an archive image; do not place the archive inside a second MapPlate merely for decoration.
Surfaces: `raised` (default; freestanding atlas/borough plate), `inset` (reference desk, where a second large shadow would compete with evidence).
Parts: `MapPlate.Header`, `.Canvas`, `.Footer`. They are stateless structural slots, not a context API; keep map state in the workspace.

```tsx
// Correct: structure is composed, as in workspace.jsx
<MapPlate surface="raised" aria-label="Borough map plate">
  <MapPlate.Header>{heading}</MapPlate.Header>
  <MapPlate.Canvas>{map}</MapPlate.Canvas>
  <MapPlate.Footer>{provenance}</MapPlate.Footer>
</MapPlate>
// Incorrect: these layout flags do not exist
<MapPlate withLegend withSource fullScreen />
```

Always include evidence state in Header and provenance in Footer. Never cover map provider credits without moving them to another visible location.

## EvidenceBadge

Use for the trust/coverage state, not damage severity. Use DamageKey for damage categories.
States: `draft` (default), `unknown`. The optional children customise wording without adding an undocumented state.
`draft` means provisional evidence; `unknown` means missing coverage or no match. No verified state exists in this system.

```tsx
// Correct: actual header call site
<EvidenceBadge status={pilot?'draft':'unknown'}/>
// Incorrect: geometry does not establish historical survival
<EvidenceBadge status="verified">100% overlap</EvidenceBadge>
```

## ReferenceCard

Use for the supplied Pimlico archive crop. Use the workspace's no-source panel in other boroughs; the source card must never imply coverage elsewhere.
There are no appearance variants. Header action uses `action`; explanatory content uses `children`.
The image opens full size; the archive link opens the record. Preserve both and the attribution.

```tsx
// Correct: content is a child, as in workspace.jsx
<ReferenceCard><p>Original colours remain on the historical sheet. New 3D colours are draft overlap candidates.</p></ReferenceCard>
// Incorrect: fictional category/source flags do not exist
<ReferenceCard borough="Camden" verified />
```

## DamageKey

Use for filtering draft building colours. Use EvidenceBadge for match/coverage status.
No visual variants exist. Values are the keys in `damageCategories` or `null` (all colours, default).
Use `value`/`onChange` for map-controlled filtering; `defaultValue` for an independent uncontrolled guide. Clicking the active category returns to all colours.

```tsx
// Correct: actual workspace call site
<DamageKey value={category} onChange={setCategory}/>
// Incorrect: invents a filtering API
<DamageKey highlightYellow showEverythingElse={false}/>
```

## Verification exercise

Audit exercise: “Compose a borough map with a source card and draft filter using this system.”
The implementation was checked against this exercise locally; an independent fresh-agent prompt test has not been performed.
The three real variants use the same Button, MapPlate, ReferenceCard, DamageKey and EvidenceBadge implementations.
Check any future screen against the examples before promoting it. Add a missing rule here instead of patching only that screen.
