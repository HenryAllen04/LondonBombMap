"use client";
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

export default function Modern({ controller }) {
  const container = useRef(null);
  const [status, setStatus] = useState('Loading modern buildings…');
  useEffect(() => {
    let disposed = false, map, observer;
    const timeout = setTimeout(() => { if (!disposed) setStatus('Map is taking longer to load. Check your connection.'); }, 20000);
    import('maplibre-gl').then(({ Map, setWorkerUrl }) => {
      if (disposed) return;
      setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      map = new Map({ container: container.current, style: '/map-style.json', center: [-0.1405, 51.4887], zoom: 17,
        pitch: 58, bearing: -28, minZoom: 13, maxZoom: 19, maxPitch: 70,
        attributionControl: false, canvasContextAttributes: { antialias: true } });
      controller.current = map;
      map.on('pitch', () => {
        const input = document.getElementById('modern-tilt');
        if (input) { input.value=map.getPitch(); input.parentElement.querySelector('output').value=Math.round(map.getPitch())+'°'; }
      });
      map.on('error', () => { if (!disposed) setStatus('Some map resources could not load. Retry if the map is incomplete.'); });
      map.on('load', () => {
        if (disposed) return;
        const before = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
        map.addLayer({ id: 'paper-current-buildings', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building',
          minzoom: 14, paint: { 'fill-extrusion-color': '#d9d5c8', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 1 } }, before);
        clearTimeout(timeout); setStatus('');
      });
      observer = new ResizeObserver(() => map.resize());
      observer.observe(container.current);
    }).catch(() => { if (!disposed) setStatus('The modern map could not start.'); });
    return () => { disposed = true; clearTimeout(timeout); observer?.disconnect(); map?.remove(); controller.current = null; };
  }, [controller]);
  return <div className="pm-modern">
    <div ref={container} className="pm-modern-canvas" aria-label="Modern Pimlico building footprints in 3D" />
    <div className="pm-map-stamp"><span className="pm-tiny">THE CITY TODAY</span><strong>Modern buildings</strong><small>Current footprints · estimated heights</small></div>
    {status && <div className="pm-map-status" role="status">{status}{!status.startsWith('Loading') && <button onClick={() => location.reload()}>Retry</button>}</div>}
    <div className="pm-modern-nav"><button aria-label="Zoom modern map in" onClick={() => controller.current?.jumpTo({zoom:controller.current.getZoom()+.5})}><Plus size={17}/></button><button aria-label="Zoom modern map out" onClick={() => controller.current?.jumpTo({zoom:controller.current.getZoom()-.5})}><Minus size={17}/></button><button aria-label="Reset modern map" onClick={() => controller.current?.jumpTo({center:[-0.1405,51.4887],zoom:17,pitch:58,bearing:-28})}><RotateCcw size={16}/></button></div>
    <div className="pm-modern-credit"><a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></div>
  </div>;
}
