# London Before

An interactive Pimlico island: modern 3D buildings, streets and the Thames above a
speckled dirt underside, with the original wartime sheet aligned to the surface.
Switch between the paper, draft damage colours and the modern map, then explore
from the island, overhead or damage close-up viewpoints.

The island is the homepage. The former Explorer homepage and Paper/Pieces/Night
island variants have been removed. Old island URLs redirect to `/`.

## Run locally

Requires Node 22+ and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3020. `pnpm dev` and `pnpm start` both use port 3020; run
one server on that port at a time. No account or API key is needed for the island.

```sh
pnpm test
pnpm typecheck
pnpm build
```

The build scripts generate the shared Pimlico building index and copy MapLibre's
worker assets for the remaining map tools. To check a build without regenerating
the working index, use `pnpm exec next build`.

## Map and evidence

The homepage implementation lives in `components/pimlico-island/`. It loads
captured Overture building/part geometry and OpenFreeMap streets, parks and water
from `public/proto/london-island/`. The saved alignment is read from
`data/pimlico-overlay.json` on each homepage request. After saving an alignment in
the editor, reload the homepage to see it on the island.

The original sheet uses the existing development-only source route and private
workspace attachment. If the image is unavailable, the modern island remains
usable and explains why the paper is unavailable. No archive image is committed
or published by this change. Historical image © The London Archives; modern data
© OpenStreetMap contributors and Overture Maps Foundation.

Full-sheet placement is exploratory beyond the locally checked selection. Draft
colour evidence stays within the saved selection and excludes masked watermark
areas. Colours projected onto modern roofs describe spatial overlap, not proof
that those buildings existed or were damaged during the war. Heights use source
values, source floors or an illustrative fallback. The island cut, earth depth
and river recess are display dimensions.

See [island details](app/proto/london-island/README.md) for controls, sources and
validation, and [archive orders](docs/archive-orders.md) for the source research.

## Working tools

- [Alignment and colour editor](http://localhost:3020/proto/london-island/compare/overlay)
- [Paper and modern comparison](http://localhost:3020/proto/london-island/compare)
- [Building review](http://localhost:3020/proto/london-island/compare/review)
- [Footprint impact study](http://localhost:3020/proto/footprint-impact?v=3)
- [Earlier map comparisons](http://localhost:3020/proto/bomb-sites?v=2)

`pnpm benchmark:pimlico` runs the reproducible data-readiness benchmark. See
[implementation and validation](docs/pimlico-validation.md) for source reproduction
and the landmark schema. The site remains marked `noindex`.
