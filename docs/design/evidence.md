# Evidence and maps

Source: `components/system/components.tsx`. Real call sites: `app/proto/borough-plates/workspace.jsx` and `components/pimlico-island/surface.jsx`.
These components carry the project's evidence language, so their wording matters as much as their styling. Overlap is location, not identity. Draft is provisional. Nothing in the system is verified.

## MapPlate

Use to contain an interactive MapLibre map. Use `ReferenceCard` for an archive image. The homepage island stage (`surface-stage`) is the one map outside MapPlate, because the island draws its own underside and a plate shadow would double it.
Surfaces: `raised` (default), a freestanding plate with `--lb-shadow-plate`; `inset` for the reference desk, where a second large shadow would compete with the evidence.
Parts: `MapPlate.Header`, `MapPlate.Canvas`, `MapPlate.Footer`. They are structural slots, not a context API; map state lives in the screen. The Header always holds an `EvidenceBadge`; the Footer always holds provenance. Never cover map-provider credits without moving them somewhere visible.

```tsx
// Correct: workspace.jsx
<MapPlate surface="raised" aria-label="Borough map plate">
  <MapPlate.Header>{heading}<EvidenceBadge status={pilot?'draft':'unknown'}/></MapPlate.Header>
  <MapPlate.Canvas>{map}</MapPlate.Canvas>
  <MapPlate.Footer>{provenance}</MapPlate.Footer>
</MapPlate>
// Incorrect: layout flags do not exist
<MapPlate withLegend withSource fullScreen />
```

## EvidenceBadge

Use for the trust state of what is on screen. Use `DamageKey` for damage categories and `Notice` for loading or failure.
States: `draft` (default) for provisional evidence or provisional alignment; `unknown` for no coverage or no match. Children replace the default wording ("Draft overlap" or "Not mapped") without adding a state. There is no `verified` state, and there will not be one until a verified source exists.

```tsx
// Correct: homepage stage
<EvidenceBadge>Provisional alignment</EvidenceBadge>
// Incorrect: geometry does not establish historical survival
<EvidenceBadge status="verified">100% overlap</EvidenceBadge>
```

## ReferenceCard

Use for the supplied Pimlico archive crop, and only there. Other boroughs use the screen's no-source panel; the card must never imply coverage where there is none.
No variants. `action` places a control in the header; `children` adds explanatory text under the title. The image opens full size and the archive link opens the record. Keep both, and keep the attribution.

```tsx
// Correct: workspace.jsx
<ReferenceCard><p>Original colours remain on the historical sheet. New 3D colours are draft overlap candidates.</p></ReferenceCard>
// Incorrect: fictional source flags
<ReferenceCard borough="Camden" verified />
```

## DamageKey

Use to filter draft building colours by damage category. Use `EvidenceBadge` for match state and `ToggleGroup` for anything that is not a damage category.
No variants. Values are keys of `damageCategories` or `null`, meaning all colours, which is the default. Clicking the active category returns to all. Controlled with `value` and `onChange`, uncontrolled with `defaultValue`.

```tsx
// Correct: workspace.jsx
<DamageKey value={category} onChange={setCategory}/>
// Incorrect: invents a filtering API
<DamageKey highlightYellow showEverythingElse={false}/>
```

## Wording

- Say "draft", "candidate", "overlap", "provisional". Never "confidence", "probability", "verified" or "confirmed".
- Roof colour is "overlap with a draft area", never "this building was damaged".
- Heights are "source height", "estimated from floors" or "illustrative", never "historical height".
- Borough coverage outside Pimlico is "not mapped", never "no damage".
