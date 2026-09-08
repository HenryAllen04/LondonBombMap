"use client";

import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Info,
  Layers3,
  Link2,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import MapCanvas, { type MapHandle, type MapMode } from "./map-canvas";
import ArchivePanel from "./archive-panel";
import {
  ARCHIVE_URL,
  isPimlico,
  places,
  type Coordinates,
  type Place,
} from "@/lib/places";
import {
  areaCenter,
  damageAreas,
  damageCategories,
  type DamageFeature,
} from "@/lib/damage";
import { parseMapState, type SearchResult } from "@/lib/search";

export default function Explorer() {
  const map = useRef<MapHandle>(null),
    input = useRef<HTMLInputElement>(null),
    aboutDialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<MapMode>("damage");
  const [threeD, setThreeD] = useState(false),
    [opacity, setOpacity] = useState(0.83);
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null),
    [story, setStory] = useState<Place | null>(null);
  const [area, setArea] = useState<DamageFeature | null>(null);
  const [about, setAbout] = useState(false),
    [sheet, setSheet] = useState(false),
    [ready, setReady] = useState(false);
  const [legend, setLegend] = useState(true),
    [copyState, setCopyState] = useState("");

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.hash.slice(1)),
        state = parseMapState(window.location.hash);
      const place = places.find((p) => p.id === params.get("place"));
      const nextMode = params.get("mode") === "today" ? "today" : "damage";
      const feature =
        nextMode === "damage"
          ? damageAreas.features.find(
              (f) => f.properties.id === params.get("area"),
            )
          : undefined;
      setMode(nextMode);
      setThreeD(params.get("view") === "3d");
      setStory(place ?? null);
      setArea(feature ?? null);
      if ((feature || place || state) && window.innerWidth < 760)
        setLegend(false);
      if (feature)
        setSelected({
          id: feature.properties.id,
          label: feature.properties.label,
          detail: "Draft area · Sheet 88",
          coordinates: areaCenter(feature),
          precision: "area",
        });
      else if (place)
        setSelected({
          id: place.id,
          label: place.title,
          detail: place.subtitle,
          coordinates: place.coordinates,
          precision: "area",
        });
      else
        setSelected(
          state
            ? {
                ...state,
                id: "shared",
                detail: "Shared location",
                precision: "area",
              }
            : null,
        );
    };
    restore();
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (about) aboutDialog.current?.showModal();
    else aboutDialog.current?.close();
  }, [about]);
  useEffect(() => {
    if (!copyState) return;
    const timer = setTimeout(() => setCopyState(""), 3000);
    return () => clearTimeout(timer);
  }, [copyState]);

  function updateHash(
    result: SearchResult | null,
    place: Place | null,
    feature: DamageFeature | null,
    nextMode = mode,
    nextThreeD = threeD,
  ) {
    const params = new URLSearchParams({
      mode: nextMode,
      view: nextThreeD ? "3d" : "2d",
    });
    if (result) {
      params.set("lng", result.coordinates[0].toFixed(6));
      params.set("lat", result.coordinates[1].toFixed(6));
      params.set("label", result.label);
    }
    if (place) params.set("place", place.id);
    if (feature) params.set("area", feature.properties.id);
    window.history.replaceState(null, "", `#${params}`);
  }
  function cancelSearch() {
    request.current?.abort();
    setSearching(false);
    setSearchError("");
    setResults(null);
  }
  function select(
    result: SearchResult,
    place: Place | null = null,
    feature: DamageFeature | null = null,
  ) {
    cancelSearch();
    setSelected(result);
    setStory(place);
    setArea(feature);
    if (window.innerWidth < 760) setLegend(false);
    updateHash(result, place, feature);
  }
  function selectPlace(id: string) {
    const place = places.find((p) => p.id === id);
    if (place)
      select(
        {
          id,
          label: place.title,
          detail: place.subtitle,
          coordinates: place.coordinates,
          precision: "area",
        },
        place,
      );
  }
  function selectArea(id: string) {
    const feature = damageAreas.features.find((f) => f.properties.id === id);
    if (feature)
      select(
        {
          id,
          label: feature.properties.label,
          detail: "Draft area · Sheet 88",
          coordinates: areaCenter(feature),
          precision: "area",
        },
        null,
        feature,
      );
  }
  function selectPoint(coordinates: Coordinates) {
    select({
      id: "pin",
      label: "Pinned location",
      detail: "London",
      coordinates,
      precision: "area",
    });
  }
  function clearSelection() {
    cancelSearch();
    setSelected(null);
    setStory(null);
    setArea(null);
    updateHash(null, null, null);
  }
  function home() {
    clearSelection();
    setQuery("");
    map.current?.home();
  }
  function changeMode(value: MapMode) {
    setMode(value);
    if (value === "today" && area) {
      setArea(null);
      setSelected(null);
      updateHash(null, null, null, value);
    } else updateHash(selected, story, area, value);
  }
  function changeView() {
    setThreeD(!threeD);
    updateHash(selected, story, area, mode, !threeD);
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (searching) return;
    if (query.trim().length < 3) {
      setSearchError("Enter a street, address or postcode.");
      input.current?.focus();
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true);
    setSearchError("");
    setResults(null);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Search unavailable. Try again.");
      if (!controller.signal.aborted) setResults(data.results);
    } catch (error) {
      if (!controller.signal.aborted)
        setSearchError(
          error instanceof Error
            ? error.message
            : "Search unavailable. Try again.",
        );
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("Link copied");
    } catch {
      setCopyState("Copy the link from your address bar");
    }
  }

  return (
    <main className="explorer">
      <a className="skip-link" href="#address-search">
        Find an address
      </a>
      <header className="site-header">
        <button
          className="wordmark"
          onClick={home}
          aria-label="London Before, return to Pimlico"
        >
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          London<span>Before</span>
        </button>
        <div className="mode-switch" role="group" aria-label="Map layer">
          <button
            aria-pressed={mode === "today"}
            onClick={() => changeMode("today")}
          >
            Today
          </button>
          <button
            aria-pressed={mode === "damage"}
            onClick={() => changeMode("damage")}
          >
            <Layers3 size={15} />
            Bomb damage<span className="mode-year">1945</span>
          </button>
        </div>
        <div className="header-actions">
          <button
            className="sheet-button"
            onClick={() => setSheet(true)}
            aria-label="Open original sheet"
          >
            <BookOpen size={17} />
            <span>Original sheet</span>
          </button>
          <button
            className="icon-button"
            onClick={() => setAbout(true)}
            aria-label="About this map"
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      <div className="map-workspace">
        <MapCanvas
          ref={map}
          mode={mode}
          threeD={threeD}
          opacity={opacity}
          activeArea={area?.properties.id ?? null}
          selected={selected}
          onSelect={selectPoint}
          onPlace={selectPlace}
          onDamage={selectArea}
          onReady={() => setReady(true)}
        />
        <section className="search-panel" aria-label="Find a place">
          <form
            className="search-form"
            role="search"
            onSubmit={search}
            aria-label="Find a London address"
          >
            <Search className="search-prefix" size={19} />
            <label className="sr-only" htmlFor="address-search">
              Address, street or postcode
            </label>
            <input
              ref={input}
              id="address-search"
              type="search"
              value={query}
              onChange={(event) => {
                cancelSearch();
                setQuery(event.target.value);
              }}
              placeholder="Find your address"
              maxLength={160}
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              enterKeyHint="search"
              aria-invalid={!!searchError}
              aria-describedby={searchError ? "search-error" : undefined}
              onKeyDown={(event) => {
                if (event.key === "Escape") setResults(null);
              }}
            />
            <button
              type="submit"
              aria-label="Search London"
              disabled={searching}
            >
              {searching ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <ArrowUpRight size={19} />
              )}
            </button>
          </form>
          <div aria-live="polite">
            {searchError && (
              <p className="search-message" id="search-error">
                {searchError}
              </p>
            )}
            {searching && <span className="sr-only">Searching…</span>}
          </div>
          {results && (
            <div className="search-results">
              <div className="results-heading">
                <span>{results.length ? "Search results" : "No results"}</span>
                <button
                  className="icon-button"
                  onClick={() => setResults(null)}
                  aria-label="Close search results"
                >
                  <X size={16} />
                </button>
              </div>
              {results.length ? (
                <ul>
                  {results.map((result) => (
                    <li key={result.id}>
                      <button onClick={() => select(result)}>
                        <MapPin size={16} />
                        <span>
                          <strong>{result.label}</strong>
                          <small>
                            {result.detail}
                            {result.precision !== "address"
                              ? " · Approximate"
                              : ""}
                          </small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Try a street name with “London”.</p>
              )}
            </div>
          )}
          {!selected && !results && (
            <div className="place-shortcuts">
              <span>Pimlico</span>
              {places.slice(0, 2).map((place) => (
                <button key={place.id} onClick={() => selectPlace(place.id)}>
                  {place.title}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          )}
          {selected && !results && (
            <article className="location-card" aria-live="polite">
              <div className="card-topline">
                <span>
                  {area
                    ? "DAMAGE PREVIEW"
                    : story
                      ? "LOCAL HISTORY"
                      : "YOUR LOCATION"}
                </span>
                <button
                  className="icon-button"
                  onClick={clearSelection}
                  aria-label="Close selected place"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="location-heading">
                {area && (
                  <i
                    className="area-swatch"
                    style={{ background: area.properties.color }}
                  />
                )}
                <h1>
                  {area
                    ? damageCategories[area.properties.category].short
                    : selected.label}
                </h1>
              </div>
              {area ? (
                <>
                  <p>Approximate outline · 1945</p>
                  <div className="draft-note">
                    Traced from the public preview. Awaiting verification.
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setSheet(true)}
                  >
                    View source sheet <ArrowUpRight size={14} />
                  </button>
                </>
              ) : story ? (
                <>
                  <p>{story.subtitle}</p>
                  <details className="story-details">
                    <summary>
                      Read the story <ChevronDown size={14} />
                    </summary>
                    <p>{story.description}</p>
                    {story.locationNote && (
                      <p className="location-note">{story.locationNote}</p>
                    )}
                    <a href={story.source} target="_blank" rel="noreferrer">
                      {story.archivePhoto ? "Archive photograph" : "Source"}
                      <ArrowUpRight size={13} />
                    </a>
                  </details>
                </>
              ) : (
                <p>
                  {isPimlico(selected.coordinates)
                    ? "Pimlico · Partial damage coverage"
                    : "Outside the Pimlico preview"}
                  {selected.precision !== "address"
                    ? " · Approximate location"
                    : ""}
                </p>
              )}
              <div className="card-footer">
                <span>
                  {selected.coordinates[1].toFixed(4)},{" "}
                  {selected.coordinates[0].toFixed(4)}
                </span>
                <button
                  className="icon-button"
                  onClick={share}
                  aria-label="Copy link to this place"
                >
                  <Link2 size={16} />
                </button>
              </div>
            </article>
          )}
        </section>

        {mode === "damage" && (
          <aside
            className={`damage-legend ${legend ? "" : "collapsed"}`}
            aria-label="Bomb damage key"
          >
            <button
              className="legend-heading"
              onClick={() => setLegend(!legend)}
              aria-expanded={legend}
            >
              <span>
                <span className="legend-dot" />
                Damage key
              </span>
              <ChevronDown size={16} />
            </button>
            {legend && (
              <>
                <div className="legend-categories">
                  {Object.entries(damageCategories).map(([id, item]) => (
                    <div key={id} title={item.label}>
                      <i style={{ background: item.color }} />
                      <span>{item.short}</span>
                    </div>
                  ))}
                </div>
                <div className="opacity-control">
                  <label htmlFor="damage-opacity">Opacity</label>
                  <input
                    id="damage-opacity"
                    type="range"
                    min="15"
                    max="100"
                    value={Math.round(opacity * 100)}
                    onChange={(event) =>
                      setOpacity(Number(event.target.value) / 100)
                    }
                  />
                  <output htmlFor="damage-opacity">
                    {Math.round(opacity * 100)}%
                  </output>
                </div>
                <p className="legend-note">
                  Uncoloured areas haven’t been assessed.
                </p>
              </>
            )}
          </aside>
        )}
        <div className="map-tools">
          <button
            className="view-toggle"
            aria-label={threeD ? "Switch to 2D" : "Switch to 3D"}
            aria-pressed={threeD}
            onClick={changeView}
            disabled={!ready}
          >
            {threeD ? "2D" : "3D"}
          </button>
          <div className="zoom-controls">
            <button
              aria-label="Zoom in"
              onClick={() => map.current?.zoom(1)}
              disabled={!ready}
            >
              <Plus size={19} />
            </button>
            <button
              aria-label="Zoom out"
              onClick={() => map.current?.zoom(-1)}
              disabled={!ready}
            >
              <Minus size={19} />
            </button>
          </div>
          <button
            className="home-button"
            aria-label="Return to Pimlico"
            onClick={home}
            disabled={!ready}
          >
            <Compass size={19} />
          </button>
        </div>
        <button className="coverage-badge" onClick={() => setAbout(true)}>
          <span className="live-dot" />
          {mode === "damage"
            ? `${damageAreas.features.length} draft areas · Pimlico`
            : "London today"}
          <Info size={12} />
        </button>
        {mode === "damage" && (
          <div className="layer-credit">
            <a href={ARCHIVE_URL} target="_blank" rel="noreferrer">
              Source: The London Archives
            </a>
          </div>
        )}
        {copyState && (
          <div className="toast" role="status">
            <Check size={16} />
            {copyState}
          </div>
        )}
      </div>
      <ArchivePanel open={sheet} onClose={() => setSheet(false)} />
      <dialog
        ref={aboutDialog}
        className="about-dialog"
        aria-labelledby="about-title"
        onClose={() => setAbout(false)}
        onCancel={() => setAbout(false)}
      >
        <div className="dialog-heading">
          <h2 id="about-title">London Before</h2>
          <button
            className="icon-button"
            onClick={() => setAbout(false)}
            aria-label="Close about"
          >
            <X size={20} />
          </button>
        </div>
        <div className="about-body">
          <p>A free map of London’s wartime damage. Starting with Pimlico.</p>
          <h3>An early preview</h3>
          <p>
            The coloured areas are approximate groups traced from Sheet 88’s
            public viewer. Their outlines, placement and colour readings need
            checking against the purchased file. They are not verified
            individual building footprints. Uncoloured areas have not been
            assessed.
          </p>
          <p>
            The base map is present-day London. 3D uses today’s buildings and
            the map provider’s available heights; historical damage remains a
            flat annotation. A colour here does not establish damage to a
            current building.
          </p>
          <h3>Explore a draft area</h3>
          <div className="area-index">
            {damageAreas.features.map((feature, index) => (
              <button
                key={feature.properties.id}
                onClick={() => {
                  setAbout(false);
                  setMode("damage");
                  selectArea(feature.properties.id);
                  updateHash(
                    {
                      id: feature.properties.id,
                      label: feature.properties.label,
                      detail: "Draft area",
                      coordinates: areaCenter(feature),
                      precision: "area",
                    },
                    null,
                    feature,
                    "damage",
                  );
                }}
              >
                <i style={{ background: feature.properties.color }} />
                {String(index + 1).padStart(2, "0")}
                <span className="sr-only">: {feature.properties.label}</span>
              </button>
            ))}
          </div>
          <h3>Sources</h3>
          <p>
            <a href={ARCHIVE_URL} target="_blank" rel="noreferrer">
              LCC Bomb Damage Map, Sheet 88
            </a>
            , 1945. Image source: The London Archives (City of London
            Corporation). Stories link to their original sources.
          </p>
          <p>
            Modern map:{" "}
            <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
              OpenFreeMap
            </a>
            , OpenMapTiles and{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
            .
          </p>
          <h3>Privacy</h3>
          <p>
            No accounts or saved searches. Search queries go to our address
            provider only when submitted. Tiles and the original viewer load
            from their providers. Shared links include the selected location and
            label.
          </p>
        </div>
      </dialog>
    </main>
  );
}
