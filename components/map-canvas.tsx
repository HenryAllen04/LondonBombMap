"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Map as LibreMap, Marker } from "maplibre-gl";
import { LONDON_BOUNDS, places, type Coordinates } from "@/lib/places";
import { DAMAGE_CENTER, damageAreas } from "@/lib/damage";
import type { SearchResult } from "@/lib/search";

export type MapMode = "today" | "damage";
export type MapHandle = { zoom: (direction: number) => void; home: () => void };
type Props = {
  mode: MapMode;
  threeD: boolean;
  opacity: number;
  activeArea: string | null;
  selected: SearchResult | null;
  onSelect: (coordinates: Coordinates) => void;
  onPlace: (id: string) => void;
  onDamage: (id: string) => void;
  onReady: () => void;
};

const motion = (duration: number) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;

const MapCanvas = forwardRef<MapHandle, Props>(function MapCanvas(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const beacon = useRef<Marker | null>(null);
  const current = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    current.current = props;
  }, [props]);

  useImperativeHandle(
    ref,
    () => ({
      zoom: (direction) => {
        if (map.current)
          map.current.easeTo({
            zoom: map.current.getZoom() + direction,
            duration: motion(180),
          });
      },
      home: () =>
        map.current?.flyTo({
          center: DAMAGE_CENTER,
          zoom: window.innerWidth < 760 ? 15.2 : 15.7,
          bearing: 0,
          pitch: current.current.threeD ? 50 : 0,
          duration: motion(600),
        }),
    }),
    [],
  );

  useEffect(() => {
    let disposed = false,
      loaded = false;
    const markers: Marker[] = [];
    let timer: ReturnType<typeof setTimeout>;
    const events = new AbortController();
    import("maplibre-gl")
      .then(({ Map, Marker, ScaleControl, setWorkerUrl }) => {
        if (disposed || !container.current) return;
        try {
          setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
          const instance = new Map({
            container: container.current,
            style: "/map-style.json",
            center: DAMAGE_CENTER,
            zoom: window.innerWidth < 760 ? 15.2 : 15.7,
            minZoom: 10,
            maxZoom: 19,
            maxPitch: 60,
            pitch: current.current.threeD ? 50 : 0,
            maxBounds: [
              [LONDON_BOUNDS[0], LONDON_BOUNDS[1]],
              [LONDON_BOUNDS[2], LONDON_BOUNDS[3]],
            ],
            attributionControl: { compact: true },
            canvasContextAttributes: { antialias: true },
          });
          map.current = instance;
          timer = setTimeout(() => {
            if (!disposed && !loaded) setError(true);
          }, 16000);
          instance.addControl(
            new ScaleControl({ maxWidth: 80, unit: "metric" }),
            "bottom-left",
          );
          instance.on("error", (event) =>
            console.error("Map resource failed", event.error),
          );
          instance.on("load", () => {
            if (disposed) return;
            const label = instance
              .getStyle()
              .layers.find((layer) => layer.type === "symbol")?.id;
            instance.addLayer(
              {
                id: "modern-buildings-3d",
                type: "fill-extrusion",
                source: "openmaptiles",
                "source-layer": "building",
                minzoom: 14,
                filter: ["!=", ["get", "hide_3d"], true],
                layout: {
                  visibility: current.current.threeD ? "visible" : "none",
                },
                paint: {
                  "fill-extrusion-color": "#d6dce0",
                  "fill-extrusion-height": [
                    "coalesce",
                    ["get", "render_height"],
                    0,
                  ],
                  "fill-extrusion-base": [
                    "coalesce",
                    ["get", "render_min_height"],
                    0,
                  ],
                  "fill-extrusion-opacity":
                    current.current.mode === "damage" ? 0.28 : 0.8,
                },
              },
              label,
            );
            instance.addSource("damage-areas", {
              type: "geojson",
              data: damageAreas,
              promoteId: "id",
            });
            const visibility =
              current.current.mode === "damage" ? "visible" : "none";
            instance.addLayer(
              {
                id: "damage-fill",
                type: "fill",
                source: "damage-areas",
                layout: { visibility },
                paint: {
                  "fill-color": ["get", "color"],
                  "fill-opacity": current.current.opacity,
                },
              },
              label,
            );
            instance.addLayer(
              {
                id: "damage-outline",
                type: "line",
                source: "damage-areas",
                layout: { visibility },
                paint: {
                  "line-color": [
                    "case",
                    ["boolean", ["feature-state", "active"], false],
                    "#242a35",
                    ["get", "color"],
                  ],
                  "line-width": [
                    "case",
                    ["boolean", ["feature-state", "active"], false],
                    3,
                    1.3,
                  ],
                  "line-opacity": 0.95,
                },
              },
              label,
            );
            if (current.current.activeArea)
              instance.setFeatureState(
                { source: "damage-areas", id: current.current.activeArea },
                { active: true },
              );
            places.forEach((place, index) => {
              const element = document.createElement("button");
              element.type = "button";
              element.className = "place-marker";
              element.setAttribute("aria-label", `Explore ${place.title}`);
              element.textContent = String(index + 1).padStart(2, "0");
              element.addEventListener(
                "click",
                (event) => {
                  event.stopPropagation();
                  current.current.onPlace(place.id);
                },
                { signal: events.signal },
              );
              markers.push(
                new Marker({ element })
                  .setLngLat(place.coordinates)
                  .addTo(instance),
              );
            });
            loaded = true;
            clearTimeout(timer);
            setError(false);
            setReady(true);
            current.current.onReady();
          });
          instance.on("click", (event) => {
            const hits =
              loaded && current.current.mode === "damage"
                ? instance.queryRenderedFeatures(event.point, {
                    layers: ["damage-fill"],
                  })
                : [];
            if (hits[0]?.properties.id)
              current.current.onDamage(hits[0].properties.id);
            else current.current.onSelect([event.lngLat.lng, event.lngLat.lat]);
          });
          instance.on("mousemove", (event) => {
            if (!loaded) return;
            const hit =
              current.current.mode === "damage" &&
              instance.queryRenderedFeatures(event.point, {
                layers: ["damage-fill"],
              }).length;
            instance.getCanvas().style.cursor = hit ? "pointer" : "";
          });
        } catch (error) {
          console.error("Map initialization failed", error);
          setError(true);
        }
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      events.abort();
      clearTimeout(timer);
      markers.forEach((marker) => marker.remove());
      beacon.current?.remove();
      beacon.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    const visibility = props.mode === "damage" ? "visible" : "none";
    for (const layer of ["damage-fill", "damage-outline"])
      map.current.setLayoutProperty(layer, "visibility", visibility);
    map.current.setPaintProperty("damage-fill", "fill-opacity", props.opacity);
    map.current.setPaintProperty(
      "modern-buildings-3d",
      "fill-extrusion-opacity",
      props.mode === "damage" ? 0.28 : 0.8,
    );
  }, [ready, props.mode, props.opacity]);

  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setLayoutProperty(
      "modern-buildings-3d",
      "visibility",
      props.threeD ? "visible" : "none",
    );
    map.current.easeTo({
      pitch: props.threeD ? 50 : 0,
      bearing: props.threeD ? -12 : 0,
      duration: motion(450),
    });
  }, [ready, props.threeD]);

  useEffect(() => {
    if (!ready || !map.current || !props.activeArea) return;
    const instance = map.current,
      id = props.activeArea;
    instance.setFeatureState({ source: "damage-areas", id }, { active: true });
    return () => {
      if (map.current === instance && instance.getSource("damage-areas"))
        instance.setFeatureState(
          { source: "damage-areas", id },
          { active: false },
        );
    };
  }, [ready, props.activeArea]);

  useEffect(() => {
    if (!props.selected) {
      beacon.current?.remove();
      beacon.current = null;
      return;
    }
    if (!ready || !map.current) return;
    let disposed = false;
    const selected = props.selected;
    import("maplibre-gl").then(({ Marker }) => {
      if (disposed || !map.current) return;
      if (!beacon.current) {
        const element = document.createElement("div");
        element.className = "address-beacon";
        element.innerHTML =
          '<span class="beacon-ring"></span><span class="beacon-core"></span><span class="beacon-stem"></span>';
        element.setAttribute("role", "img");
        element.setAttribute("aria-label", "Your selected location");
        beacon.current = new Marker({ element, anchor: "bottom" })
          .setLngLat(selected.coordinates)
          .addTo(map.current);
      }
      beacon.current.setLngLat(selected.coordinates);
      map.current.flyTo({
        center: selected.coordinates,
        zoom: 16.8,
        duration: motion(600),
        offset: window.innerWidth < 760 ? [0, 75] : [50, 30],
      });
    });
    return () => {
      disposed = true;
    };
  }, [ready, props.selected]);

  return (
    <div className="map-stage">
      <div
        ref={container}
        className="map-canvas"
        aria-label="Map of London with an optional draft wartime damage layer"
      />
      {!ready && !error && (
        <div className="map-notice" role="status">
          <span className="loading-dot" />
          Loading London…
        </div>
      )}
      {error && (
        <div className="map-notice map-error" role="status">
          <strong>Map unavailable</strong>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
});
export default MapCanvas;
