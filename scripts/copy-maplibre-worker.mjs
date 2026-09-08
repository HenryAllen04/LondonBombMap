import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// MapLibre 6 workers import a sibling module. Next does not emit that sibling
// with a bundled worker URL, so serve the matching installed files together.
// https://maplibre.org/maplibre-gl-js/docs/#installation
const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve("maplibre-gl/package.json")), "dist");
const destination = join(process.cwd(), "public", "maplibre");
await mkdir(destination, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(join(dist, file), join(destination, file));
}
