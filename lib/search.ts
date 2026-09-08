import { inBounds, LONDON_BOUNDS, type Coordinates } from "./places";
export type SearchResult = {
  id: string;
  label: string;
  detail: string;
  coordinates: Coordinates;
  precision: "address" | "street" | "area";
};

type Feature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
  id?: string;
};
const string = (value: unknown) => (typeof value === "string" ? value : "");

export function normalizePhoton(features: Feature[]): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    const coordinates = feature.geometry?.coordinates;
    if (
      feature.geometry?.type !== "Point" ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !coordinates
        .slice(0, 2)
        .every((v) => typeof v === "number" && Number.isFinite(v))
    )
      continue;
    const point: Coordinates = [coordinates[0], coordinates[1]];
    if (!inBounds(point, LONDON_BOUNDS)) continue;
    const p = feature.properties ?? {};
    const street = string(p.street);
    const number = string(p.housenumber);
    const address = [number, street].filter(Boolean).join(" ");
    const name = string(p.name);
    const label = address || name || string(p.postcode);
    if (!label) continue;
    const key = `${label.toLowerCase()}-${point[0].toFixed(5)}-${point[1].toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      id: key,
      label,
      detail:
        [
          ...new Set(
            [
              name !== label ? name : "",
              string(p.district),
              string(p.city),
              string(p.postcode),
            ].filter(Boolean),
          ),
        ].join(" · ") || "London",
      coordinates: point,
      precision:
        number && street
          ? "address"
          : street || p.type === "street"
            ? "street"
            : "area",
    });
  }
  return results.slice(0, 6);
}

export function normalizeMapTiler(features: Feature[]): SearchResult[] {
  return features
    .flatMap((feature) => {
      const f = feature as Feature & {
        center?: unknown;
        place_name?: string;
        text?: string;
        place_type?: string[];
        address?: string;
      };
      const coordinates = f.center ?? f.geometry?.coordinates;
      if (
        !Array.isArray(coordinates) ||
        coordinates.length < 2 ||
        !coordinates
          .slice(0, 2)
          .every((v) => typeof v === "number" && Number.isFinite(v))
      )
        return [];
      const point: Coordinates = [coordinates[0], coordinates[1]];
      if (!inBounds(point, LONDON_BOUNDS)) return [];
      const label = f.place_name || f.text;
      if (!label) return [];
      return [
        {
          id: f.id || label,
          label,
          detail: "London",
          coordinates: point,
          precision: f.place_type?.includes("address")
            ? ("address" as const)
            : ("area" as const),
        },
      ];
    })
    .slice(0, 6);
}

export function parseMapState(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const rawLng = params.get("lng");
  const rawLat = params.get("lat");
  if (!rawLng || !rawLat) return null;
  const point: Coordinates = [Number(rawLng), Number(rawLat)];
  if (!point.every(Number.isFinite) || !inBounds(point, LONDON_BOUNDS))
    return null;
  return {
    coordinates: point,
    label: (params.get("label") || "Selected location").slice(0, 120),
  };
}
