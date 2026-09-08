import { projectTrace as projectPixel } from "./trace-projection";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import traces from "@/data/pimlico-traces.json";
import type { Coordinates } from "./places";

export const damageCategories = {
  destroyed: {
    label: "Total destruction",
    short: "Destroyed",
    color: "#353746",
  },
  "beyond-repair": {
    label: "Damaged beyond repair",
    short: "Beyond repair",
    color: "#8361b5",
  },
  doubtful: {
    label: "Seriously damaged; repair doubtful",
    short: "Repair doubtful",
    color: "#c34b65",
  },
  repairable: {
    label: "Seriously damaged; repairable at cost",
    short: "Repairable",
    color: "#ef95ad",
  },
  blast: {
    label: "General blast damage; not structural",
    short: "Blast damage",
    color: "#e4a462",
  },
  minor: {
    label: "Minor blast damage",
    short: "Minor damage",
    color: "#e4c75d",
  },
} as const;
export type DamageCategory = keyof typeof damageCategories;
export type DamageProperties = {
  id: string;
  category: DamageCategory;
  color: string;
  label: string;
  status: "draft";
  source: string;
  sheet: 88;
};
export type DamageFeature = Feature<Polygon, DamageProperties>;

type Anchor = { pixel: number[]; coordinates: number[] };

// Affine least-squares placement uses every supplied anchor. Source pixels stay
// separate from geographic output; held-out checks are evaluated independently.
export function projectTrace(point: number[], anchors: Anchor[]): Coordinates {
  return projectPixel(point, anchors) as Coordinates;
}

export const damageAreas: FeatureCollection<Polygon, DamageProperties> = {
  type: "FeatureCollection",
  features: traces.areas.map((area) => {
    const category = area.category as DamageCategory;
    const ring = area.ring.map((point) => projectTrace(point, traces.anchors));
    return {
      type: "Feature",
      id: area.id,
      properties: {
        id: area.id,
        category,
        color: damageCategories[category].color,
        label: damageCategories[category].label,
        status: "draft",
        source: traces.source,
        sheet: 88,
      },
      geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
    };
  }),
};

export const DAMAGE_CENTER: Coordinates = [-0.1432, 51.4898];
export function areaCenter(feature: DamageFeature): Coordinates {
  const points = feature.geometry.coordinates[0].slice(0, -1);
  return [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];
}
