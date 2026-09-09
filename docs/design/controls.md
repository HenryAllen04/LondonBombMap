# Controls

Source: `components/system/components.tsx` and `components/system/system.css`. Real call sites: `components/pimlico-island/surface.jsx` (homepage) and `app/proto/borough-plates/workspace.jsx`.
Every component forwards its ref, spreads remaining props, and takes `className` for positioning only. Never change a component's colours through `className` or inline styles.
The variants listed here are closed unions. Nothing else exists.

## Button

Use for an action. Use an `<a>` for navigation, including archive records. Use `ToggleGroup` when several buttons select one of a set. Use `DamageKey` for damage filters.
Variants: `quiet` (default), `outline`, `solid`. Sizes: `md` (default), `icon`. Defaults to `type="button"`.

```text
Icon only → size="icon" plus an aria-label
The single most important action on the screen → variant="solid", at most one per view
A secondary action that needs a boundary (retry, cancel, clear, about) → variant="outline"
Anything else, and everything inside a Toolbar → variant="quiet"
```

```tsx
// Correct: homepage retry action
<Button variant="outline" onClick={()=>setAttempt(n=>n+1)}>Retry island</Button>
// Incorrect: primary is not a variant in this system
<Button variant="primary">Retry island</Button>
```

## ToggleGroup

Use when exactly one option from a small set is active: viewpoints, layers, modes. Use checkboxes for independent booleans, a `<select>` for six or more options, and `DamageKey` for damage colours, which can be deselected to "all".
Appearance: `segmented` (default), a pill bar of short labels; `list`, stacked options with a label and a one-line description.
Items are `ToggleGroup.Item` with a string `value`; the group sets `aria-pressed` on the active item. The item text is the visible label, so the group needs only an `aria-label`; do not add a caption above it. Controlled with `value` and `onChange`, uncontrolled with `defaultValue`. Clicking the active item does nothing.

```text
Do the options need a description line?
 ├── Yes → appearance="list", children <span>Label</span><small>Description</small>
 └── No → appearance="segmented"
```

```tsx
// Correct: homepage viewpoints
<ToggleGroup aria-label="Island viewpoints" value={view} onChange={chooseView}>
  <ToggleGroup.Item value="island">Island</ToggleGroup.Item>
  <ToggleGroup.Item value="top">Overhead</ToggleGroup.Item>
</ToggleGroup>
// Incorrect: options as a config array, and a variant that does not exist
<ToggleGroup options={views} variant="pills" />
```

## Toolbar

Use to group camera or map actions on a paper surface: zoom, rotate, reset, pan or orbit. Use `ToggleGroup` when the buttons select a state. A single action stands alone as a `Button`.
Orientation: `horizontal` (default), `vertical` for the corner of a map plate. Children are `Button`s: `size="icon"` with an aria-label for icons, default size for a short word. A `Button` with `aria-pressed` inside a Toolbar renders as selected.
Give the toolbar an `aria-label`. Position it with a page class (`surface-camera`, `lb-map-toolbar`); the toolbar has no position of its own.

```tsx
// Correct: borough plate map controls
<Toolbar orientation="vertical" className="lb-map-toolbar" aria-label="Map controls">
  <Button size="icon" aria-label="Zoom in" onClick={zoomIn}><Plus size={17}/></Button>
</Toolbar>
// Incorrect: raw buttons in a div recreate the toolbar styles by hand
<div className="map-actions"><button onClick={zoomIn}>+</button></div>
```

## RangeField

Use for a numeric setting with a live value: opacity, height, tilt. Use a `<select>` for named choices and a `ToggleGroup` for three or fewer discrete options.
Props: `label`, `min`, `max`, `step`, `value` with `onChange(number)` or `defaultValue`, and `format` for the displayed value. The ref and remaining props go to the `<input>`; `className` goes to the wrapper. The label is linked through `htmlFor`; do not add an aria-label.

```tsx
// Correct: homepage paper opacity
<RangeField label="Paper opacity" min={0} max={1} step={.05} value={settings.opacity} onChange={v=>change('opacity',v)} format={v=>`${Math.round(v*100)}%`}/>
// Incorrect: a hand-built label, output and input drift from the shared layout
<label>Paper opacity <output>70%</output><input type="range" min="0" max="1"/></label>
```

## Notice

Use for a loading or failure message over a stage or map. Use `EvidenceBadge` for evidence state and running prose for explanations.
Tones: `status` (default) for loading and progress, rendered with `role="status"`; `alert` for a failure that needs a retry, rendered with `role="alert"`. An alert holds a `<p>` and a `Button variant="outline"`.
Position it with a page class (`surface-message`); the notice has no position of its own.
An inline confirmation beside an action ("Settings copied", "Preferences saved") is not a Notice: render `<span role="status">` at caption size in `--lb-muted`, as `workspace.jsx` does after copying settings.

```tsx
// Correct: homepage island failure
<Notice tone="alert" className="surface-message"><p>{error}</p><Button variant="outline" onClick={retry}>Retry island</Button></Notice>
// Incorrect: a div with a role and hand-rolled paper styling
<div role="alert" className="surface-message" style={{background:'#fff'}}>{error}</div>
```

## Native controls

Checkboxes, selects and text inputs stay native. Never rebuild them out of buttons.
Wrap a select or text input in `<label className="lb-field">`: the label text sits above a 44px, 16px control on `--lb-paper` with a `--lb-line` border. Checkboxes inside `.lb-app` are already 16px with `accent-color: var(--lb-ink)`; put each in a `<label>` row of at least 44px. Group related settings in a `<fieldset>` with a `<legend>` styled as a section label.

```tsx
// Correct: homepage paper extent
<label className="lb-field">Paper extent<select value={settings.scope} onChange={e=>change('scope',e.target.value)}><option value="sheet">Whole sheet preview</option></select></label>
// Incorrect: restyles the select by hand in a page stylesheet
<label className="my-select">Paper extent<select .../></label>
```
Section labels use the `lb-section-label` class on a `span` with uppercase text, as in `<span className="lb-section-label">ON THE SURFACE</span>`.
