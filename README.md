# London Before

A Pimlico pilot with a modern 2D/3D map, address beacons and twenty provisional historical damage areas. Switch between Today and Bomb damage, select coloured areas, adjust opacity, or open the original sheet.

The outlines are simplified groups traced from the public viewer, not verified individual building footprints. They need review against the purchased sheet. See [damage-layer notes](docs/damage-layer.md) for source provenance and how to replace the draft data.

## Run locally

Requires Node 22+ and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3020. Both `pnpm dev` and `pnpm start` use port 3020. No account or API key is needed for the pilot.

Run one server on port 3020 at a time. `EADDRINUSE` means another process already holds the port; use that running server or stop it in its original terminal before starting another. Check the owner with `lsof -nP -iTCP:3020 -sTCP:LISTEN`. If the page stays on “Assembling Pimlico”, check that `/proto/london-island/building-index.json` responds. The 3D loader shows a retry message after 60 seconds if loading stalls.

Prototype links (run with `pnpm dev`):

- Paper and buildings: http://localhost:3020/proto/paper-buildings?v=2
- Original map variants: http://localhost:3020/proto/bomb-sites?v=2

The dev/build scripts copy MapLibre's worker and shared module into `public/maplibre/`. These generated files must remain together, as required by the [MapLibre Next.js setup](https://maplibre.org/maplibre-gl-js/docs/#installation).

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Original map

The pilot uses the archive's own public embedded viewer for [Sheet 88](https://www.londonpicturearchive.org.uk/view-item?i=343662), with a direct source link. No archive image has been copied into the repository. The viewer relies on the archive being available and allowing embedding.

Once the purchased file and licence arrive, prepare the permitted web-size copy (currently a maximum of 1000 pixels on the longest side under standard terms), place it at `public/licensed/pimlico-sheet-88.jpg`, and set this in `.env.local`:

```dotenv
NEXT_PUBLIC_ARCHIVE_IMAGE_URL=/licensed/pimlico-sheet-88.jpg
```

Restart the development server or rebuild. This swaps the embedded viewer for the local licensed image. If the file fails to load, the viewer is used as a fallback. Keep the issued licence and receipt privately. Purchased images are ignored by Git and must be added to the deployment separately.

[Reusable order wording and checkout choices](docs/archive-orders.md) are saved for future sheets.

## Maps, search and privacy

- MapLibre renders an adapted OpenFreeMap Positron style with OpenStreetMap data. Attribution remains visible on the map.
- Search runs only on submission, through `/api/search`, and is limited to London. The public Photon demo service is suitable for testing and has no availability guarantee; it may throttle usage. No queries are stored in app code.
- For a public launch, configure a suitably provisioned search provider. `MAPTILER_API_KEY` enables the included server-side MapTiler adapter. Check provider limits and terms for expected traffic.
- Numbered pins are editorial places, not bomb locations. Street/area geocodes are labelled approximate. Cambridge Street's pin is a street reference, not Russell House's precise site.
- Shared links use the URL fragment for the selected coordinates, label and optional story. They can contain an address; the UI explains this in About.
- The map, fonts, search and archive viewer require network access. Next builds download Google Fonts and self-host them afterwards. The pilot is marked `noindex`; change this deliberately when ready to launch.

## Content and scope

Stories and source URLs are in `lib/places.ts`. The colour key follows the original archive record. The draft polygons are independent historical annotations. Modern buildings are not assigned their colours. The 3D view uses present-day footprints and the provider’s supplied heights, not reconstructed wartime buildings. The current Pimlico extent is a broad neighbourhood guide, not an exact sheet boundary.

Henry purchased Sheet 88 on 8 September 2026 for £10. It is processing for Email/FTP delivery. See the order document for status; the purchased file and issued licence have not yet been received.

## Current Pimlico research pilot

Open http://localhost:3020/proto/london-island?v=2 for the Pimlico-only 3D study, shared model colour and component inspector. Run `pnpm benchmark:pimlico` for the reproducible data-readiness benchmark. The [research report](public/proto/london-island/pimlico-research.pdf) covers source accuracy, a 30-property validation protocol and other 3D datasets/models. The original home page and older prototypes remain separate from this active island experiment.


The active pilot now uses a pinned Overture building/part extract, complete-footprint matching and an alignment-check importer. See [implementation and validation](docs/pimlico-validation.md) for current counts, source reproduction and the landmark schema. The PDF records the initial research findings; the live benchmark reflects subsequent fixes.

The [paper/modern comparison](http://localhost:3020/proto/london-island/compare) now shows the local Russell House correction, including previous placements and exploratory street-junction checks. Paper uses a dark green background; readable map detail is on by default in all styles.
