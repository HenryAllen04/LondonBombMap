'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DialRoot, useDialKitController } from 'dialkit';
import { ArrowUpRight, Plus, Minus, RotateCcw, RotateCw, SlidersHorizontal, X, Layers3, Hand } from 'lucide-react';
import { damageCategories } from '@/lib/damage';
import BuildingPicker from './building-picker';
import CalibrationCheck from './calibration-check';
import 'dialkit/styles.css';
const EMPTY_RECORDS=[];

const directions={paper:{label:'PIMLICO / THE PAPER STUDY',title:<>Pimlico.<br/><em>In focus.</em></>,description:'A small study of historical damage and modern buildings.'},pieces:{label:'PIMLICO / THE BUILDING STUDY',title:<>Pimlico,<br/>up close.</>,description:'Inspect one neighbourhood at a time.'},night:{label:'PIMLICO / THE NIGHT STUDY',title:<>Pimlico after dark.</>,description:'An illuminated study of historical damage.'}};

export default function Island({style}){
 const container=useRef(null),engine=useRef(null),latest=useRef(null),sourceDialog=useRef(null);
 const [selected,setSelected]=useState('Pimlico'),[ready,setReady]=useState(null),[error,setError]=useState(''),[sourceOpen,setSourceOpen]=useState(false),[building,setBuilding]=useState(null);
 const d=directions[style];
 const [dragMode,setDragMode]=useState(style==='paper'?'pan':'orbit');
 const defaultCamera=style==='paper'?{tilt:67,bearing:11}:{tilt:55,bearing:-18};
 const colourDefaults=style==='paper'?{background:'#263633',modelColour:'#eee8db'}:style==='night'?{background:'#182724',modelColour:'#eee8db'}:{background:'#f0f2eb',modelColour:'#b4c0b8'};
 const dial=useDialKitController(`London island · ${style}`,{
  palette:{_collapsed:true,background:{type:'color',default:colourDefaults.background},modelColour:{type:'color',default:colourDefaults.modelColour}},
  form:{thickness:[style==='paper'?.1:style==='pieces'?1.2:.65,.05,3,.05],lift:[style==='paper'?.75:style==='pieces'?.7:0,0,3,.05]},
  camera:{_collapsed:true,tilt:[defaultCamera.tilt,8,80,1],bearing:[defaultCamera.bearing,-180,180,1]},
  surface:{_collapsed:true,buildingHeight:[1,1,8,.25],buildings:true,damageColours:true,mapDetails:true,labels:true,light:[style==='paper'?3.3:style==='night'?2:3,.5,5,.1],damageView:{type:'select',options:[{value:'areas',label:'Historical areas'},{value:'fragments',label:'Draft roof overlaps'},{value:'whole',label:'Draft whole buildings'}],default:'areas'}},
 },{id:`london-island-${style}`,persist:false});
 latest.current={values:dial.values,dragMode,onSelect:name=>setSelected(name),onCamera:camera=>dial.setValues({camera})};
 useEffect(()=>{
  const abort=new AbortController();let scene;
  setReady(null);setError('');setBuilding(null);
  const timeout=setTimeout(()=>{
   setError('Pimlico took too long to load. Check that the local server is responding, then retry the 3D view.');
   abort.abort();
  },60000);
  import('./scene').then(({createIsland})=>abort.signal.aborted?null:createIsland(container.current,style,{
   onSelect:name=>latest.current.onSelect(name),onCamera:camera=>latest.current.onCamera(camera),onReady:setReady,onBuilding:setBuilding,
  },abort.signal)).then(result=>{if(!result)return;scene=result;if(abort.signal.aborted){scene.dispose();return;}engine.current=scene;scene.apply(latest.current.values);scene.setDragMode(latest.current.dragMode);scene.focus('Pimlico');}).catch(e=>{if(!abort.signal.aborted)setError(e.message||'The 3D island could not start.');}).finally(()=>clearTimeout(timeout));
  return()=>{clearTimeout(timeout);abort.abort();scene?.dispose();engine.current=null;};
 },[style]);
 useEffect(()=>{engine.current?.apply(dial.values);},[dial.values]);
 useEffect(()=>{engine.current?.focus(selected);},[selected]);
 useEffect(()=>{engine.current?.setDragMode(dragMode);},[dragMode]);
 function focus(){dial.setValues({camera:defaultCamera});engine.current?.focus('Pimlico');setSelected('Pimlico');}
 const inspect=useCallback(id=>engine.current?.inspect(id),[]);
 function openSource(){sourceDialog.current.showModal();setSourceOpen(true);}
 const selectedName='Pimlico';
 return <main className={`island-study island-${style}`} data-focused={Boolean(selected)} data-drag-mode={dragMode} style={{'--is-bg':dial.values.palette.background}}>
  <div className="island-canvas" ref={container}/>
  <header className="island-header"><a href="/" className="island-wordmark"><Layers3 size={20}/>London Before</a><span>PIMLICO STUDY · 1939—1945</span><button className="island-tune" onClick={()=>dial.setOpen(!dial.getOpen())}><SlidersHorizontal size={16}/> Tune island</button></header>
  <section className="island-intro"><span className="island-kicker">{d.label}</span><h1>{d.title}</h1><p>{d.description}</p>{style!=='pieces'&&<button className="island-primary" disabled={!ready} onClick={()=>focus('Pimlico')}>Explore Pimlico buildings <ArrowUpRight size={16}/></button>}</section>
  <aside className="island-pilot-controls" aria-label="Pimlico test controls">
   <span className="island-kicker">PIMLICO ONLY · TEST CROP</span>
   <p className="island-evidence-note">Local alignment exploratory · historical houses unreviewed</p>
   <a href="/proto/london-island/compare">Compare paper and modern maps <ArrowUpRight size={13}/></a>
   <BuildingPicker records={ready?.records??EMPTY_RECORDS} building={building} onInspect={inspect}/>
   <details className="island-control-details"><summary>Map appearance</summary>
    <label className="island-colour-control">Model colour<input aria-label="Model colour" type="color" value={dial.values.palette.modelColour} onChange={e=>dial.setValue('palette.modelColour',e.target.value)}/></label>
    <label><input type="checkbox" checked={dial.values.surface.damageColours} onChange={e=>dial.setValue('surface.damageColours',e.target.checked)}/> Show draft damage</label>
    <label><input type="checkbox" checked={dial.values.surface.buildings} onChange={e=>dial.setValue('surface.buildings',e.target.checked)}/> Show modern buildings</label>
    <label><input type="checkbox" checked={dial.values.surface.mapDetails} onChange={e=>dial.setValue('surface.mapDetails',e.target.checked)}/> Show map detail</label>
    <p>A shared base colour for the model. Map detail uses a light paper surface so streets stay readable in every style.</p>
   </details>
   <CalibrationCheck/>
   <details className="island-control-details"><summary>Sources and benchmark</summary>
    <p>Other areas are hidden. This crop is a study extent, not an official neighbourhood boundary.</p>
    <a href="/proto/london-island/benchmark.json" target="_blank" rel="noreferrer">Current benchmark results <ArrowUpRight size={13}/></a>
    <a href="/proto/london-island/pimlico-research.pdf" target="_blank" rel="noreferrer">Initial research report <ArrowUpRight size={13}/></a>
    <a href="/proto/london-island/pimlico-overture.json" download>Download source geometry <ArrowUpRight size={13}/></a>
   </details>
  </aside>
  <div className="island-location" aria-live="polite"><span>MODERN GEOMETRY · HISTORICAL EVIDENCE UNREVIEWED</span><strong>{selectedName}</strong><p>{ready?.buildingRecords??0} building records · {ready?.overlapParts??0} components with draft overlap</p></div>
  <aside className="island-source"><button onClick={openSource} aria-label="View the original bomb damage map"><img src="/proto/paper-buildings/source" alt="Original coloured Pimlico bomb damage map" width="1067" height="672"/><span><small>THE ORIGINAL RECORD</small><strong>Pimlico, Sheet 88 <ArrowUpRight size={14}/></strong></span></button><p>Historical colours. Modern footprints.<br/>Their correspondence is still provisional.</p></aside>
  <aside className="island-key" aria-label="Historical damage colour key"><span>THE DAMAGE KEY</span><ul>{Object.entries(damageCategories).map(([key,c])=><li key={key}><i style={{background:c.color}}/>{c.short}</li>)}</ul><div className="island-damage-mode" aria-label="Damage colour display"><button aria-pressed={dial.values.surface.damageView==='areas'} onClick={()=>dial.setValue('surface.damageView','areas')}>Historical areas</button><button aria-pressed={dial.values.surface.damageView==='fragments'} onClick={()=>dial.setValue('surface.damageView','fragments')}>Draft roof overlaps</button><button aria-pressed={dial.values.surface.damageView==='whole'} onClick={()=>dial.setValue('surface.damageView','whole')}>Draft whole buildings</button></div><small>{dial.values.surface.damageView==='areas'?'Draft historical areas stay on the ground, separate from modern buildings. Turn off Show modern buildings to inspect them.':dial.values.surface.damageView==='whole'?'Every intersecting modern footprint is outlined, including partial overlaps. Strong category overlaps receive a fill; known replacement blocks stay neutral. Historical areas remain on the ground.':'Experimental transfer to modern roofs. Overlap does not establish historical identity.'}</small><button className="island-damage-focus" disabled={!ready} onClick={()=>focus('Pimlico')}>View mapped damage <ArrowUpRight size={13}/></button></aside>
  <div className="island-drag-mode" aria-label="Drag behaviour"><button aria-pressed={dragMode==='pan'} onClick={()=>setDragMode('pan')}><Hand size={15}/> Pan</button><button aria-pressed={dragMode==='orbit'} onClick={()=>setDragMode('orbit')}><RotateCw size={15}/> Orbit</button></div><div className="island-navigation" aria-label="Island camera controls"><button aria-label="Rotate left" disabled={!ready} onClick={()=>engine.current?.rotate(-20)}><RotateCcw size={18}/></button><button aria-label="Rotate right" disabled={!ready} onClick={()=>engine.current?.rotate(20)}><RotateCw size={18}/></button><span/><button aria-label="Zoom out" disabled={!ready} onClick={()=>engine.current?.zoom(1.4)}><Minus size={18}/></button><button aria-label="Zoom in" disabled={!ready} onClick={()=>engine.current?.zoom(1/1.4)}><Plus size={18}/></button><button className="island-reset" disabled={!ready} onClick={()=>focus('')}>Reset Pimlico</button></div>
  <div className="island-gesture">{dragMode==='pan'?'DRAG TO PAN':'DRAG TO ORBIT'} <span>·</span> SCROLL TO ZOOM <span>·</span> RIGHT-DRAG TO PAN</div>
  {!ready&&!error&&<div className="island-loading" role="status">Assembling Pimlico…</div>}{error&&<div className="island-loading" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Retry 3D view</button></div>}
  <footer className="island-credits"><a href="https://data.london.gov.uk/dataset/london-boroughs-e55pw" target="_blank" rel="noreferrer">GLA / OS · OGL v3</a><span>·</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a><span>Map via OpenFreeMap</span><a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noreferrer">Overture Maps Foundation · ODbL</a><button onClick={openSource}>Sources & limits</button></footer>
  <dialog ref={sourceDialog} className="island-source-dialog" aria-labelledby="island-source-title" onClose={()=>setSourceOpen(false)}><header><div><span className="island-kicker">THE LONDON ARCHIVES</span><h2 id="island-source-title">The original paper record.</h2></div><button aria-label="Close original map" onClick={()=>sourceDialog.current.close()}><X size={22}/></button></header>{sourceOpen&&<a href="/proto/paper-buildings/source" target="_blank" rel="noreferrer"><img src="/proto/paper-buildings/source" alt="Original Pimlico bomb damage map, showing individually coloured historical houses" width="1067" height="672"/></a>}<p>The supplied screenshot preserves the original colours. It is not yet accurately registered to this model. A sharper sheet and reviewed historical house outlines are needed before we can reliably colour individual houses.</p><p>This model clips an explicit Pimlico test rectangle to the GLA Westminster outline, using modern OpenStreetMap geography. The crop is not an official neighbourhood boundary. Extruded buildings cover the Pimlico study area only; Overture buildings and linked parts retain source IDs and provenance. Source heights are used where available; otherwise heights use 3 m per supplied floor or an illustrative 8 m. These are modern models, not reconstructed wartime buildings. Slab thickness and lift are visual treatments. Damage colours combine legacy provisional groups with revised local terrace segments around Russell House, placed using screenshot road junctions and modern coordinates. They do not prove a house survived. The default ground layer is independent of modern buildings. Draft roof overlaps colour only the intersecting roof patches and leave conflicting categories neutral. Whole-footprint mode outlines all intersecting modern buildings, including partial overlaps. A fill requires 60% coverage by the union of one category and a 15 percentage point lead over other categories; known replacement buildings stay neutral. Small yellow or orange markings missing from those draft areas cannot be recovered by changing the display.</p><a href="https://www.londonpicturearchive.org.uk/view-item?i=343662" target="_blank" rel="noreferrer">Open archive catalogue record ↗</a><small>Image © The London Archives (City of London). Original crop available in local development.</small></dialog>
  <DialRoot position="top-right" defaultOpen={false} theme={style==='night'?'dark':'light'} productionEnabled/>
 </main>;
}
