"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Layers3, Minus, Plus, RotateCcw } from 'lucide-react';
import { DAMAGE_CENTER, damageAreas, damageCategories } from '@/lib/damage';
import { ARCHIVE_URL, places } from '@/lib/places';

const copy = {
  buildings: ['02 / BUILDING FOOTPRINTS', 'History, house by house.', 'Colour today’s buildings where they coincide with a draft damage area. Keep the streets clear and the neighbourhood legible.', 'A building here today may be a replacement. Colour indicates a spatial match, not the history of the current house.'],
  swipe: ['03 / SWIPE COMPARISON', 'One street. Two readings.', 'Slide between the draft wartime damage layer and today’s streets. Both maps move together, so you never lose your place.', 'Both sides use today’s street map. The left adds draft damage traces; it is not a reconstruction of the 1945 streets.'],
  stack: ['04 / SEPARATED PLANES', 'Give the past its own layer.', 'Lift the damage record above the city that stands here today. Explore the same place on two aligned planes.', 'The upper plane contains draft damage traces on a modern basemap. The space between planes is illustrative, not building height.'],
};

function inside(point, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

export default function Exploration({ mode }) {
  const root = useRef(null), first = useRef(null), second = useRef(null), maps = useRef([]);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [count, setCount] = useState(0), [selected, setSelected] = useState(null);
  const [outline, setOutline] = useState(false), [raised, setRaised] = useState(false);
  const [copied, setCopied] = useState('');
  const [place, setPlace] = useState('');
  const controls = useRef({ separation: 135, tilt: 48, rotation: -20, reveal: 50 });
  const [label, title, description, caveat] = copy[mode];

  useEffect(() => {
    let disposed = false, loaded = 0, sync = false;
    let resize;
    const timeout = setTimeout(() => { if (!disposed && loaded < (mode === 'buildings' ? 1 : 2)) setError('Map tiles are taking longer than expected. Check your connection or retry.'); }, 18000);
    import('maplibre-gl').then(({ Map, setWorkerUrl }) => {
      if (disposed) return;
      setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      const containers = mode === 'buildings' ? [first.current] : [first.current, second.current];
      containers.forEach((container, index) => {
        const map = new Map({ container, style: '/map-style.json', center: DAMAGE_CENTER, zoom: mode === 'buildings' ? 16.4 : 15.7,
          minZoom: 13, maxZoom: 19, maxPitch: 60, interactive: mode !== 'stack', attributionControl: false,
          canvasContextAttributes: { antialias: true }, dragRotate: false, touchPitch: false });
        maps.current.push(map);
        map.on('error', () => { if (!disposed) setError('Some map resources could not load. Retry if the map is incomplete.'); });
        map.on('load', () => {
          if (disposed) return;
          const before = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
          map.addSource('proto-damage', { type: 'geojson', data: damageAreas });
          if (index === 0) {
            map.addLayer({ id: 'proto-areas', type: 'fill', source: 'proto-damage', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': mode === 'buildings' ? 0 : 0.8 } }, before);
            map.addLayer({ id: 'proto-outlines', type: 'line', source: 'proto-damage', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': mode === 'buildings' ? 0 : 0.8 } }, before);
          }
          if (mode === 'buildings') {
            map.addSource('proto-matches', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({ id: 'proto-houses', type: 'fill', source: 'proto-matches', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.86, 'fill-outline-color': '#ffffff' } }, before);
            map.addLayer({ id: 'proto-raised', type: 'fill-extrusion', source: 'proto-matches', layout: { visibility: 'none' }, paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.9 } }, before);
            let signature = '';
            function matchBuildings() {
              if (disposed) return;
              const features = [], seen = new Set();
              for (const f of map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' })) {
                if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
                const key = JSON.stringify(f.geometry.coordinates);
                if (seen.has(key)) continue;
                seen.add(key);
                const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
                for (const coordinates of polygons) {
                  const ring = coordinates[0].slice(0, -1);
                  const center = [0, 1].map(axis => ring.reduce((s, p) => s + p[axis], 0) / ring.length);
                  const area = damageAreas.features.find(a => inside(center, a.geometry.coordinates[0]));
                  if (area) features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates }, properties: { ...area.properties, height: Number(f.properties.render_height) || 8 } });
                }
              }
              const next = JSON.stringify(features);
              if (signature !== next) {
                signature = next;
                map.getSource('proto-matches').setData({ type: 'FeatureCollection', features });
                setCount(features.length);
              }
            }
            map.on('idle', matchBuildings);
          }
          loaded++;
          if (loaded === containers.length) { clearTimeout(timeout); setReady(true); setError(''); }
        });
        map.on('move', () => {
          if (sync) return;
          sync = true;
          for (const other of maps.current) if (other !== map) other.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
          sync = false;
        });
        map.on('click', e => {
          if (index !== 0 || !map.getLayer('proto-areas')) return;
          const layer = mode === 'buildings' ? (map.getLayoutProperty('proto-raised', 'visibility') === 'visible' ? 'proto-raised' : 'proto-houses') : 'proto-areas';
          const hit = map.queryRenderedFeatures(e.point, { layers: [layer] })[0];
          setSelected(hit?.properties ?? null);
        });
        map.on('mousemove', e => {
          if (index !== 0 || !map.getLayer('proto-areas')) return;
          const layers = mode === 'buildings' ? ['proto-houses', 'proto-raised'] : ['proto-areas'];
          map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers }).length ? 'pointer' : '';
        });
      });
      resize = new ResizeObserver(() => maps.current.forEach(map => map.resize()));
      resize.observe(first.current);
    }).catch(() => setError('The map could not start. Retry to reconnect.'));
    return () => { disposed = true; clearTimeout(timeout); resize?.disconnect(); maps.current.forEach(m => m.remove()); maps.current = []; };
  }, [mode]);

  function go(id) {
    setPlace(id); setSelected(null);
    const p = places.find(p => p.id === id);
    maps.current[0]?.jumpTo({ center: p?.coordinates ?? DAMAGE_CENTER, zoom: p ? 17 : mode === 'buildings' ? 16.4 : 15.7 });
  }
  function slider(e, name, unit) {
    controls.current[name] = Number(e.currentTarget.value);
    root.current.style.setProperty(`--${name}`, e.currentTarget.value + unit);
    e.currentTarget.parentElement.querySelector('output').value = e.currentTarget.value + unit;
  }
  function toggleOutline() {
    setOutline(!outline);
    maps.current[0]?.setPaintProperty('proto-outlines', 'line-opacity', outline ? 0 : 0.9);
  }
  function toggleRaised() {
    setRaised(!raised);
    const m = maps.current[0];
    m?.setLayoutProperty('proto-raised', 'visibility', raised ? 'none' : 'visible');
    m?.setLayoutProperty('proto-houses', 'visibility', raised ? 'visible' : 'none');
    m?.jumpTo({ pitch: raised ? 0 : 48 });
  }
  function dragDivider(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const viewport = e.currentTarget.parentElement.getBoundingClientRect();
    function update(event) {
      const value = Math.round(Math.max(0, Math.min(100, (event.clientX - viewport.left) / viewport.width * 100)));
      controls.current.reveal = value;
      root.current.style.setProperty('--reveal', value + '%');
      const input = root.current.querySelector('input[aria-label="Reveal damage"]');
      input.value = value;
      input.parentElement.querySelector('output').value = value + '%';
    }
    const handle = e.currentTarget;
    handle.onpointermove = update;
    handle.onpointerup = handle.onpointercancel = () => { handle.onpointermove = null; };
  }
  async function copyControls() {
    const text = JSON.stringify(controls.current, null, 2);
    try { await navigator.clipboard.writeText(text); setCopied('Settings copied'); }
    catch { setCopied(text); }
  }

  return <main className={`bomb-proto bomb-proto-${mode}`} ref={root}>
    <header className="bp-header"><a className="bp-brand" href="/">London<span>Before</span></a><span>MAP STUDIES <i>/</i> PIMLICO</span><a href={ARCHIVE_URL} target="_blank" rel="noreferrer">Source sheet <ArrowUpRight size={15} /></a></header>
    <div className="bp-layout">
      <aside className="bp-sidebar">
        <p className="bp-eyebrow">{label}</p><h1>{title}</h1><p className="bp-intro">{description}</p>
        <label className="bp-place">Explore a place<select value={place} onChange={e => go(e.target.value)} disabled={!ready}><option value="">Pimlico overview</option>{places.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        {mode === 'buildings' && <div className="bp-toggles"><label><input type="checkbox" checked={outline} onChange={toggleOutline} disabled={!ready} /> Show draft area boundaries</label><label><input type="checkbox" checked={raised} onChange={toggleRaised} disabled={!ready} /> Raise the coloured buildings</label></div>}
        <section className="bp-key"><h2>Damage recorded in the draft</h2>{Object.entries(damageCategories).map(([key, c]) => <div key={key}><i style={{ background: c.color }} /><span>{c.label}</span></div>)}<p>Uncoloured ≠ undamaged. Coverage is partial.</p></section>
        <div className="bp-evidence"><Layers3 size={17} /><div><strong>{mode === 'buildings' ? 'Location is not identity' : 'Keep the evidence separate'}</strong><p>{caveat}</p></div></div>
        <details className="bp-method"><summary>How this preview is made</summary><p>{mode === 'buildings' ? 'Real modern building polygons from OpenStreetMap. A polygon is coloured when the average of its outer-ring vertices falls inside a draft damage area. Boundary matches, large buildings and tile splits can be wrong. This is not a property survey. Missing height uses an illustrative 8 m.' : 'The project’s existing approximate traces from Sheet 88 are shown over the same modern map on both views. A verified, georeferenced historical sheet could replace the upper or left map later.'}</p><a href={ARCHIVE_URL} target="_blank" rel="noreferrer">Check the original record ↗</a></details>
      </aside>
      <section className="bp-viewport" aria-label={`${mode} map exploration`}>
        {mode === 'stack' ? <div className="bp-stack-scene"><div className="bp-plane bp-lower"><div ref={second} className="bp-map" /><span className="bp-plane-label">TODAY / MODERN STREETS</span></div><div className="bp-plane bp-upper"><div ref={first} className="bp-map" /><span className="bp-plane-label">1945 / DRAFT DAMAGE</span></div></div> : <><div ref={mode === 'swipe' ? second : first} className="bp-map" />{mode === 'swipe' && <><div className="bp-swipe-overlay"><div ref={first} className="bp-map" /></div><div className="bp-divider" aria-hidden="true"><span>↔</span></div><button className="bp-drag-divider" aria-label="Drag comparison divider; use Reveal damage slider for keyboard control" onPointerDown={dragDivider} onClick={() => root.current.querySelector('input[aria-label="Reveal damage"]').focus()} /><div className="bp-map-label bp-left">1945 <span>Draft damage</span></div><div className="bp-map-label bp-right">Today <span>Modern streets</span></div></>}</>}
        {mode === 'buildings' && <div className="bp-map-label bp-left">Modern footprints <span>Draft spatial matches</span></div>}
        <div className="bp-status" role="status">{error ? <>{error} <button onClick={() => location.reload()}>Retry</button></> : !ready ? 'Loading Pimlico…' : mode === 'buildings' ? `${count} matched footprint parts in loaded tiles · click a coloured building` : mode === 'swipe' ? 'Drag either map to explore · move the slider to compare' : 'Two aligned maps · use the controls to explore'}</div>
        {selected && <article className="bp-selection" aria-live="polite"><button aria-label="Close selection" onClick={() => setSelected(null)}>×</button><p className="bp-eyebrow">{selected.id} · DRAFT RECORD</p><h2>{selected.label}</h2><p>{mode === 'buildings' ? 'Modern footprint matched to this damage area. Survival or rebuilding is unknown.' : 'Approximate damage area from Sheet 88. Awaiting verification.'}</p><a href={ARCHIVE_URL} target="_blank" rel="noreferrer">Check source ↗</a></article>}
        {mode !== 'buildings' && <div className="bp-controls"><span>VIEW CONTROLS</span>{mode === 'swipe' ? <label>Reveal damage <output>50%</output><input aria-label="Reveal damage" type="range" min="0" max="100" defaultValue="50" onInput={e => slider(e, 'reveal', '%')} /></label> : <><label>Separation <output>135px</output><input aria-label="Separation" type="range" min="0" max="240" defaultValue="135" onInput={e => slider(e, 'separation', 'px')} /></label><label>Tilt <output>48deg</output><input aria-label="Tilt" type="range" min="15" max="65" defaultValue="48" onInput={e => slider(e, 'tilt', 'deg')} /></label><label>Rotation <output>−20deg</output><input aria-label="Rotation" type="range" min="-40" max="40" defaultValue="-20" onInput={e => slider(e, 'rotation', 'deg')} /></label></>}<button onClick={copyControls}>Copy view settings</button>{copied && <small role="status">{copied}</small>}</div>}
        <div className="bp-navigation"><button aria-label="Zoom in" disabled={!ready} onClick={() => maps.current[0]?.jumpTo({ zoom: maps.current[0].getZoom() + 0.5 })}><Plus size={18} /></button><button aria-label="Zoom out" disabled={!ready} onClick={() => maps.current[0]?.jumpTo({ zoom: maps.current[0].getZoom() - 0.5 })}><Minus size={18} /></button><button aria-label="Reset to Pimlico" disabled={!ready} onClick={() => go('')}><RotateCcw size={17} /></button>{mode === 'stack' && <><button aria-label="Pan west" onClick={() => maps.current[0]?.panBy([-100, 0], { duration: 0 })}>←</button><button aria-label="Pan east" onClick={() => maps.current[0]?.panBy([100, 0], { duration: 0 })}>→</button><button aria-label="Pan north" onClick={() => maps.current[0]?.panBy([0, -100], { duration: 0 })}>↑</button><button aria-label="Pan south" onClick={() => maps.current[0]?.panBy([0, 100], { duration: 0 })}>↓</button></>}</div>
        <footer className="bp-credit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · Damage traces: The London Archives, Sheet 88</footer>
      </section>
    </div>
  </main>;
}
