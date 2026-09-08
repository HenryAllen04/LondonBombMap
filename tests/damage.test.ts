import { describe, expect, it } from "vitest";
import { damageAreas, projectTrace } from "../lib/damage";
import { inBounds, PIMLICO_BOUNDS } from "../lib/places";

describe("historical trace placement", () => {
  const anchors = [
    { pixel: [10, 20], coordinates: [-0.15, 51.49] },
    { pixel: [110, 20], coordinates: [-0.14, 51.49] },
    { pixel: [10, 120], coordinates: [-0.15, 51.48] },
  ];
  it("accounts for image origin, scale and the reversed vertical axis", () => {
    expect(projectTrace([60, 70], anchors)).toEqual([-0.145, 51.485]);
  });
  it("rejects a calibration that cannot locate a two-dimensional shape", () => {
    expect(() =>
      projectTrace(
        [50, 50],
        [
          anchors[0],
          anchors[1],
          { pixel: [210, 20], coordinates: [-0.13, 51.49] },
        ],
      ),
    ).toThrow("collinear");
  });
  it("keeps every closed draft outline in the Pimlico pilot", () => {
    expect(damageAreas.features.length).toBeGreaterThan(0);
    for (const feature of damageAreas.features) {
      const ring = feature.geometry.coordinates[0];
      expect(ring[0]).toEqual(ring.at(-1));
      expect(
        new Set(ring.map((point) => point.join(","))).size,
      ).toBeGreaterThanOrEqual(3);
      for (const point of ring)
        expect(inBounds([point[0], point[1]], PIMLICO_BOUNDS)).toBe(true);
    }
  });
  it("carries source and provisional status with every selectable area", () => {
    const ids = new Set<string>();
    for (const { properties } of damageAreas.features) {
      expect(ids.has(properties.id)).toBe(false);
      ids.add(properties.id);
      expect(properties.status).toBe("draft");
      expect(properties.source).toBe(
        "https://www.londonpicturearchive.org.uk/zoom-item?i=343662",
      );
      expect(properties.sheet).toBe(88);
    }
  });
});
