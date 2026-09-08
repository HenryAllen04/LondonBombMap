import { describe, expect, it } from "vitest";
import {
  normalizeMapTiler,
  normalizePhoton,
  parseMapState,
} from "../lib/search";

describe("London address search", () => {
  const feature = {
    geometry: { type: "Point", coordinates: [-0.1421, 51.4924] },
    properties: {
      street: "Belgrave Road",
      housenumber: "11",
      city: "London",
      postcode: "SW1V 1RB",
    },
  };
  it("preserves the full address and longitude/latitude order", () => {
    expect(normalizePhoton([feature])[0]).toMatchObject({
      label: "11 Belgrave Road",
      coordinates: [-0.1421, 51.4924],
      precision: "address",
    });
  });
  it("does not present a street or postcode as an exact address", () => {
    expect(
      normalizePhoton([
        { ...feature, properties: { street: "Belgrave Road" } },
      ])[0].precision,
    ).toBe("street");
    expect(
      normalizePhoton([{ ...feature, properties: { postcode: "SW1V 1RB" } }])[0]
        .precision,
    ).toBe("area");
  });
  it("rejects invalid, nonpoint and non-London geometry and removes duplicates", () => {
    expect(
      normalizePhoton([
        feature,
        feature,
        { ...feature, geometry: { type: "Point", coordinates: [2.35, 48.85] } },
        {
          ...feature,
          geometry: { type: "Point", coordinates: ["-0.14", 51.49] },
        },
        { ...feature, geometry: { type: "Point", coordinates: [NaN, 51.49] } },
        {
          ...feature,
          geometry: { type: "LineString", coordinates: [-0.14, 51.49] },
        },
      ]),
    ).toHaveLength(1);
  });
  it("accepts MapTiler features and rejects coordinates outside London", () => {
    const input = [
      {
        id: "address.1",
        center: [-0.14, 51.49],
        place_name: "11 Belgrave Road, London",
        place_type: ["address"],
      },
      { center: [-3.2, 55.9], place_name: "Edinburgh" },
    ];
    expect(normalizeMapTiler(input)).toEqual([
      {
        id: "address.1",
        label: "11 Belgrave Road, London",
        detail: "London",
        coordinates: [-0.14, 51.49],
        precision: "address",
      },
    ]);
  });
});

describe("shared location links", () => {
  it("restores a valid London location and safely limits the label", () => {
    expect(parseMapState("#lat=51.49&lng=-0.14&label=My+street")).toEqual({
      coordinates: [-0.14, 51.49],
      label: "My street",
    });
    expect(
      parseMapState(`#lat=51.49&lng=-0.14&label=${"x".repeat(200)}`)?.label,
    ).toHaveLength(120);
  });
  it.each([
    "",
    "#lat=&lng=",
    "#lat=oops&lng=-0.14",
    "#lat=48.85&lng=2.35",
    "#lat=51.49",
    "#lat=Infinity&lng=-0.14",
  ])("ignores invalid link %s", (hash) => {
    expect(parseMapState(hash)).toBeNull();
  });
});
