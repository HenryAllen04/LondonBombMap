'use client';
import {useEffect,useState} from 'react';
import study from '@/data/pimlico-local-study.json';
import traces from '@/data/pimlico-traces.json';
import {localPlacement,localChecks,placementComparison} from '@/lib/local-history';
import {projectTrace} from '@/lib/trace-projection';
import {damageCategories} from '@/lib/damage';

const placement=localPlacement(study),checks=localChecks(study);
const offsets=placementComparison(traces,study);
const polygonPath=coordinates=>coordinates.map(r=>r.map((p,i)=>`${i?'L':'M'}${p.join(',')}`).join(' ')+'Z').join(' ');
const geometryPath=g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).map(p=>polygonPath(p.map(r=>r.map(placement.pixel)))).join(' ');
const legacy=traces.areas.filter(a=>study.replaces.includes(a.id)).map(a=>({...a,path:polygonPath([a.ring.map(p=>placement.pixel(projectTrace(p,traces.anchors)))])}));
export default function Comparison(){
 const [features,setFeatures]=useState([]),[error,setError]=useState(''),[imageMissing,setImageMissing]=useState(false);
 const [mode,setMode]=useState('overlay'),[opacity,setOpacity]=useState(.7),[old,setOld]=useState(false),[draft,setDraft]=useState(false),[point,setPoint]=useState(null);
 useEffect(()=>{const abort=new AbortController();fetch('/proto/london-island/building-index.json',{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])}).then(r=>{if(!r.ok)throw new Error('Modern footprints could not load.');return r.json();}).then(data=>setFeatures(data.features.filter(f=>{const p=placement.pixel(f.geometry.coordinates[0][0][0]);return p[0]>250&&p[0]<1050&&p[1]>-100&&p[1]<750;}))).catch(e=>{if(!abort.signal.aborted)setError(e.message);});return()=>abort.abort();},[]);
 function pick(event){const svg=event.currentTarget,p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());setPoint(placement.coordinates([p.x,p.y]));}
 return <main className="comparison">
  <header><div><a href="/proto/london-island?v=2">← Pimlico 3D</a><h1>The same place. Different buildings.</h1><p>Cambridge Street / Alderney Street · paper map registered to street junctions</p></div><a href="https://www.openstreetmap.org/#map=19/51.48854/-0.1411" target="_blank" rel="noreferrer">Open modern map ↗</a></header>
  <section className="comparison-controls" aria-label="Comparison controls"><div>{['source','modern','overlay'].map(value=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{value==='source'?'Paper map':value==='modern'?'Modern footprints':'Overlay'}</button>)}</div><label>Paper opacity<input aria-label="Paper opacity" type="range" min="0" max="1" step=".05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label><label><input type="checkbox" checked={old} onChange={e=>setOld(e.target.checked)}/> Previous draft areas</label><label><input type="checkbox" checked={draft} onChange={e=>setDraft(e.target.checked)}/> Revised historical rows</label></section>
  {error&&<p role="alert">{error}</p>}{imageMissing&&<p role="alert">The private reference image is unavailable. Open this comparison in the workspace where the supplied screenshot is saved.</p>}
  <div className="comparison-map"><svg viewBox="410 105 500 440" aria-label="Historical paper map and modern building footprints at matching coordinates" onClick={pick}>
   <rect x="410" y="105" width="500" height="440" fill="#eee8db"/>
   <image href={study.sourceImage.url} width="1067" height="672" opacity={mode==='modern'?0:mode==='source'?1:opacity} onError={()=>setImageMissing(true)}/>
   {mode!=='source'&&features.map(f=><path key={f.id} d={geometryPath(f.geometry)} fill={mode==='modern'?'#c6c0af':'#247986'} fillOpacity={mode==='modern'?1:.1} stroke="#247986" strokeWidth="1" fillRule="evenodd"><title>{f.properties.sourceName??f.properties.buildingId}</title></path>)}
   {old&&legacy.map(a=><path key={a.id} d={a.path} fill={damageCategories[a.category].color} fillOpacity=".45" stroke="#bd4728" strokeWidth="1.5" strokeDasharray="4 2"><title>Previous {a.id}</title></path>)}
   {draft&&study.areas.map(a=><path key={a.id} d={polygonPath([a.ring])} fill={damageCategories[a.category].color} fillOpacity=".7" stroke="#292b30" strokeWidth=".5"><title>{a.description}</title></path>)}
   {study.points.map((p,i)=><g key={p.id}><circle cx={p.pixel[0]} cy={p.pixel[1]} r="4" fill={p.role==='fit'?'#ad3f22':'#247986'} stroke="white" strokeWidth="1"/><text x={p.pixel[0]+6} y={p.pixel[1]-5} fontSize="9" fill="#181b20" stroke="#fff" strokeWidth="2" paintOrder="stroke">{i+1}</text></g>)}
  </svg></div>
  <div className="comparison-caption"><p><i/> Teal: modern footprints · red dots: fitting junctions · teal dots: check junctions. Click the map for approximate coordinates.</p><p>{point?`${point[1].toFixed(6)}, ${point[0].toFixed(6)} · exploratory placement`:'Coordinates follow the paper geography, including places where the old buildings no longer exist.'}</p></div>
  <section className="comparison-findings"><article><h2>Replacement buildings need a site record</h2><p>Russell House’s I-shaped block occupies the interior of a site previously drawn as two terraced rows. Moving the historical colours onto its roof loses the old street frontage and can omit the site entirely. Historical areas stay at their own coordinates.</p><p><a href={study.site.source} target="_blank" rel="noreferrer">The council condition survey (p. 5)</a> describes Russell House as a nine-storey I-shaped block built in 1962.</p><p>The neighbouring orange and pink rows also need separate traces. A rectangle per block cannot reproduce the original categories or individual houses.</p></article><article><h2>Exploratory alignment</h2><p>{checks.fitPoints} fitting junctions; {checks.checkPoints} separate check picks. Check RMSE {checks.checkRmseMetres.toFixed(1)} m; maximum {checks.checkMaxMetres.toFixed(1)} m.</p><p>These are manual estimates from a screenshot and modern OSM junctions. They are not surveyed control points or a passed house-level accuracy benchmark.</p><details><summary>Landmark evidence and residuals</summary><ol>{checks.residuals.map(p=><li key={p.id}><a href={p.reference} target="_blank" rel="noreferrer">{p.id}</a> · {p.role} · {p.errorMetres.toFixed(1)} m</li>)}</ol></details></article></section>
  <details><summary>How far were the previous rectangles displaced?</summary><p>Compared with estimated corresponding row centres, the four old rectangles sit roughly 29–46 m east and 6–16 m south. Their shapes and categories also differ. These are visual diagnostics, not surveyed errors or a single correction to apply everywhere.</p><ul>{offsets.map(p=><li key={p.legacyId}>{p.legacyId} · {p.description}: {p.eastMetres.toFixed(0)} m east, {Math.abs(p.northMetres).toFixed(0)} m south</li>)}</ul></details>
  <footer>Modern geometry © OpenStreetMap contributors / Overture Maps Foundation, ODbL. Historical screenshot © The London Archives (City of London); private local reference. Original colours denote accumulated damage, not individual bomb impacts.</footer>
 </main>;
}
