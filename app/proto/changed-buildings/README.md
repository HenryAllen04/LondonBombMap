# Changed buildings exploration

Open [the prototype](http://localhost:3020/proto/changed-buildings?v=2).

Three directions explore one site between Cambridge Street and Alderney Street:

| Variant | Interaction | Advantage | Cost |
| --- | --- | --- | --- |
| Today | Present-day model baseline | Familiar context | Cannot explain the earlier layout |
| Ghosts | Transparent modern buildings with historical outlines | See both layouts together | Overlapping lines require interpretation |
| Compare | Reveal historical envelopes in place of the modern site | Clear difference between layouts | Intermediate slider positions combine both eras |

Use the picker, keys 1–3 or left/right arrows. Arrow keys pan when the canvas has focus; slider keys retain native behaviour. R remounts the current controls without rebuilding the scene. The selected variant persists in `?v=1`, `?v=2` or `?v=3`. On narrow screens the picker moves to the top to avoid the camera controls.

The Three.js engine and geometry are mounted once in the harness, outside the keyed variant controls. Variant changes update visibility, opacity and the historical mesh scale directly. The existing island scene was copied into this throwaway directory so its production/prototype callers remain unchanged. No asset requests are made by `setHistory`; the camera is untouched. Retry after a loading failure deliberately reloads the model.

The desktop canvas dimensions remain fixed when the longer Compare controls appear. The sidebar scrolls independently if needed. The tuning panel exposes historical illustration height and modern opacity; its copy action exports the active settings.

## Evidence

`sample.json` contains two simplified terrace envelopes traced from the existing 1067 × 672 archive screenshot. They omit house divisions and rear extensions. The existing exploratory local junction registration maps those pixels into geographic coordinates. These are not verified historical buildings and carry no damage classifications. Teal identifies the earlier geometry, not a damage grade. Heights default to an explicitly illustrative 8 m and can be set to zero for a nearly flat outline.

The focus polygon overlaps two components in the current modern index; overlap is used only to select the modern meshes to fade. This does not establish a historical identity or a date of replacement. The boundary is a study area, not an official parcel.

Source: [LCC Sheet 88](https://www.londonpicturearchive.org.uk/view-item?i=343662), cumulative wartime damage. Image © The London Archives (City of London), served by the existing private development-only source route. The original image is not copied into this directory. Modern data and source attribution are retained from the current island pilot.

The Victorian GeoPackage and record downloads timed out, so no Victorian geometry was used. The isolated sample establishes the interaction; importing and validating the published vector data remains a separate research step.

## Verification — 8 September 2026

- `pnpm typecheck` passed.
- Browser checked all three variants at 1440 × 1000 and narrow layout at 390 × 844.
- Canvas DOM identity remained the same across Today → Ghosts → Compare.
- Geometry request count remained **2 before / 2 after** switching: one `pimlico.json`, one `building-index.json`.
- Canvas bounds remained **1048 × 820**, at the same page position, in all three desktop variants.
- Compare slider Home/End changed the engine mix to 0/1. Number and arrow shortcuts switched modes; slider keyboard input did not switch variants.
- Evidence dialog opened and closed with Escape. Height tuning and camera reset worked. No horizontal overflow at 390 px.
- Browser console contained no application errors or warnings during the checks.
- Screenshots: `output/playwright/changed-buildings-{today,ghosts,compare,mobile}.png`.

Decision pending: no direction has been selected or promoted. Keep this isolated until the user chooses; then record the choice and rejected alternatives before integrating.
