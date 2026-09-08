"use client";
import { useRef, useState } from 'react';
import { ArrowUpRight, Compass, Layers3, Minus, Plus, RotateCcw, X } from 'lucide-react';
import boroughData from './boroughs.json';
import BoroughMap from './map';
import { Button, DamageKey, EvidenceBadge, MapPlate, ReferenceCard } from './system/components';
import { damageCategories } from '@/lib/damage';

const boroughs=[...boroughData.features].sort((a,b)=>a.properties.name.localeCompare(b.properties.name));
const initial=boroughs.find(b=>b.properties.name==='Westminster');

function MatchInspector({selected,stats,onSelect}) {
  const result=selected, best=result?.candidates[0];
  return <section className="lb-match-inspector" aria-label="Building match evidence">
    <div className="lb-section-label">BUILDING / SOURCE</div><h3>{result?'Inspect this footprint':'Follow a building back.'}</h3>
    {!result?<><p>Select a coloured building to see why it is a geometric candidate.</p><label className="lb-field">Or choose a loaded footprint<select defaultValue="" onChange={e=>onSelect(stats.rows.find(r=>r.id===e.target.value)??null)}><option value="">Choose a footprint</option>{stats.rows.map((r,i)=><option key={r.id} value={r.id}>{String(i+1).padStart(3,'0')} · {r.candidates[0].id} · {Math.round(r.candidates[0].coverage*100)}% overlap</option>)}</select></label></>:<>
      <EvidenceBadge status={best?'draft':'unknown'}>{result.status==='candidate'?'Candidate · unverified':result.status}</EvidenceBadge>
      <p>{result.reason}</p>
      {best&&<><div className="lb-evidence-colour"><i style={{background:best.color}}/>{damageCategories[best.category].label}</div><dl><div><dt>Modern footprint covered</dt><dd>{Math.round(best.coverage*100)}%</dd></div><div><dt>Intersection / union</dt><dd>{(best.iou*100).toFixed(1)}%</dd></div><div><dt>Draft source area</dt><dd>{best.id}</dd></div><div><dt>Historical identity</dt><dd>Not established</dd></div></dl>{result.candidates.length>1&&<details><summary>{result.candidates.length-1} competing candidate(s)</summary>{result.candidates.slice(1).map(c=><p key={c.id}>{c.id}: {Math.round(c.coverage*100)}% coverage</p>)}</details>}</>}
      <Button variant="outline" onClick={()=>onSelect(null)}>Clear selection</Button>
    </>}
    <small>Overlap describes location, not whether the same house survived. Counts refer to loaded tile fragments.</small>
  </section>;
}

export default function Workspace({layout}) {
  const [borough,setBorough]=useState(initial), [query,setQuery]=useState('');
  const [colours,setColours]=useState(true), [category,setCategory]=useState(null), [minimum,setMinimum]=useState(.6);
  const [selected,setSelected]=useState(null), [stats,setStats]=useState({candidates:0,partial:0,ambiguous:0,invalid:0,rows:[]});
  const [camera,setCamera]=useState({pitch:56,zoom:16.6}), [copied,setCopied]=useState('');
  const controller=useRef(null), method=useRef(null);
  const pilot=borough.properties.name==='Westminster';
  function choose(code){const b=boroughs.find(b=>b.properties.gss_code===code);if(b){setBorough(b);setSelected(null);setCategory(null);}}
  async function copySettings(){const value=JSON.stringify({layout,borough:borough.properties.name,pitch:camera.pitch,minimumCoverage:minimum,colours,category},null,2);try{await navigator.clipboard.writeText(value);setCopied('Settings copied');}catch{setCopied(value);}}
  const reference=pilot?<ReferenceCard><p>Original colours remain on the historical sheet. New 3D colours are draft overlap candidates.</p></ReferenceCard>:<aside className="lb-no-source"><span className="lb-section-label">HISTORICAL COVERAGE</span><h3>{borough.properties.name}</h3><EvidenceBadge status="unknown"/><p>Modern buildings are available here. A historical sheet and reviewed footprints have not been indexed.</p><Button variant="outline" onClick={()=>choose(initial.properties.gss_code)}>Return to Pimlico pilot</Button></aside>;
  const controls=<aside className="lb-view-controls" aria-label="Prototype view controls"><span>VIEW & MATCHING</span><label>Tilt <output>{Math.round(camera.pitch)}°</output><input aria-label="Building tilt" type="range" min="0" max="65" value={Math.round(camera.pitch)} onChange={e=>controller.current?.map.jumpTo({pitch:Number(e.target.value)})}/></label><label>Minimum overlap <output>{Math.round(minimum*100)}%</output><input aria-label="Minimum overlap" type="range" min="20" max="95" step="5" value={Math.round(minimum*100)} onChange={e=>setMinimum(Number(e.target.value)/100)}/></label><button onClick={copySettings}>Copy settings</button>{copied&&<small role="status">{copied}</small>}</aside>;
  const map=<MapPlate surface={layout==='desk'?'inset':'raised'} aria-label="Borough map plate">
    <MapPlate.Header><div><span className="lb-section-label">{pilot?'WESTMINSTER / PIMLICO PILOT':borough.properties.name.toUpperCase()}</span><strong>{pilot?'A neighbourhood, house by house.':borough.properties.name}</strong></div><EvidenceBadge status={pilot?'draft':'unknown'}/></MapPlate.Header>
    <MapPlate.Canvas><BoroughMap borough={borough} controller={controller} colours={colours} category={category} minimumCoverage={minimum} onSelect={setSelected} onStats={setStats} onCamera={setCamera}/>{controls}
      <div className="lb-map-actions"><Button size="icon" aria-label="Zoom in" onClick={()=>controller.current?.map.jumpTo({zoom:camera.zoom+.5})}><Plus size={17}/></Button><Button size="icon" aria-label="Zoom out" onClick={()=>controller.current?.map.jumpTo({zoom:camera.zoom-.5})}><Minus size={17}/></Button><Button size="icon" aria-label="Borough overview" onClick={()=>controller.current?.focus(borough,true)}><Compass size={17}/></Button>{pilot&&<Button size="icon" aria-label="Return to Pimlico" onClick={()=>controller.current?.pilot()}><RotateCcw size={16}/></Button>}</div>
      {layout!=='desk'&&<div className="lb-floating-source">{reference}</div>}
      {selected&&layout!=='desk'&&<div className="lb-floating-match"><Button size="icon" className="lb-close-match" aria-label="Close building evidence" onClick={()=>setSelected(null)}><X size={16}/></Button><MatchInspector selected={selected} stats={stats} onSelect={setSelected}/></div>}
    </MapPlate.Canvas>
    <MapPlate.Footer><span>{pilot?`${stats.candidates} candidate parts · ${stats.ambiguous} ambiguous · ${stats.partial} partial${stats.invalid?` · ${stats.invalid} invalid`:''}`:'No historical damage data mapped for this borough'}</span><button onClick={()=>method.current.showModal()}>How are buildings matched? <ArrowUpRight size={13}/></button></MapPlate.Footer>
  </MapPlate>;
  return <main className={`borough-study lb-layout-${layout}`}>
    <header className="lb-site-header"><a href="/" className="lb-wordmark"><Layers3 size={21}/> London<span>Before</span></a><span className="lb-section-label">AN ATLAS OF LONDON’S PAST</span><Button variant="outline" onClick={()=>method.current.showModal()}>About the matching</Button></header>
    <div className="lb-page">
      <div className="lb-page-intro"><div><span className="lb-section-label">{layout==='atlas'?'02 / THE ATLAS PLATE':layout==='borough'?'03 / BOROUGH BY BOROUGH':'04 / THE REFERENCE DESK'}</span><h1>{layout==='atlas'?'Every street has a before.':layout==='borough'?'London, one borough at a time.':'Keep the evidence beside the city.'}</h1><p>A contained 3D map, the original paper record, and a clear distinction between a location and a building’s history.</p></div>{layout!=='borough'&&<label className="lb-field lb-borough-field">Borough / City<select value={borough.properties.gss_code} onChange={e=>choose(e.target.value)}>{boroughs.map(b=><option key={b.properties.gss_code} value={b.properties.gss_code}>{b.properties.name}{b.properties.name==='Westminster'?' · Pimlico pilot':''}</option>)}</select></label>}</div>
      <div className="lb-explorer-layout">
        {layout==='borough'&&<aside className="lb-borough-rail"><span className="lb-section-label">32 BOROUGHS + THE CITY</span><label className="lb-field">Find a borough<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Borough name"/></label><nav aria-label="London boroughs">{boroughs.filter(b=>b.properties.name.toLowerCase().includes(query.toLowerCase())).map(b=><button key={b.properties.gss_code} aria-current={b.properties.gss_code===borough.properties.gss_code?'true':undefined} onClick={()=>choose(b.properties.gss_code)}>{b.properties.name}{b.properties.name==='Westminster'&&<small>Pilot</small>}</button>)}{!boroughs.some(b=>b.properties.name.toLowerCase().includes(query.toLowerCase()))&&<p>No matching borough. Try another name.</p>}</nav></aside>}
        <div className="lb-plate-column"><div className="lb-legend-row"><DamageKey value={category} onChange={setCategory}/><label className="lb-colour-toggle"><input type="checkbox" checked={colours} onChange={e=>setColours(e.target.checked)}/> Draft colours</label></div>{map}</div>
        {layout==='desk'&&<aside className="lb-desk-evidence">{reference}<MatchInspector selected={selected} stats={stats} onSelect={setSelected}/></aside>}
      </div>
      <footer className="lb-page-footer"><p>Historical coverage: 20 provisional area groups in Pimlico. These are not verified house footprints.</p><p>Map: <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>. <a href="https://data.london.gov.uk/dataset/london-boroughs-e55pw" target="_blank" rel="noreferrer">Boroughs: GLA / OS, OGL v3</a>.</p></footer>
    </div>
    <dialog className="lb-method-dialog" ref={method}><header><h2>Matching is a question of evidence.</h2><Button size="icon" aria-label="Close matching method" onClick={()=>method.current.close()}><X size={20}/></Button></header><p>The current prototype compares modern building polygons with <strong>20 unverified historical area groups</strong>. It cannot establish which individual historical house stood there.</p><ol><li><strong>Index nearby candidates.</strong> An R-tree searches area bounding boxes.</li><li><strong>Measure overlap.</strong> Polygon intersection accounts for holes and separate parts. Coverage measures the fraction of today’s footprint inside a draft area; intersection-over-union also accounts for the size of the historical area.</li><li><strong>Keep competing matches.</strong> Colour only when coverage meets the slider threshold and exceeds the runner-up by 15 percentage points. Otherwise retain the result as partial or ambiguous.</li><li><strong>Keep identity unknown.</strong> Even 100% overlap may be a rebuilt building. No candidate is marked verified.</li></ol><h3>What the next dataset needs</h3><p>A sharper original, registration against stable street junctions with measured error, historical house polygons, reviewed colours, and complete modern footprints with stable IDs. Then review one-to-one, split, merged, rebuilt and missing buildings explicitly.</p><p className="lb-method-note">A spatial index makes the search faster; it does not make the source more accurate. This prototype uses approximate local planar area calculations and may receive tile fragments instead of whole buildings.</p></dialog>
  </main>;
}
