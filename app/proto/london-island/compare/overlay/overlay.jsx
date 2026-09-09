'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import definition from '@/data/pimlico-overlay-source.json';
import ColourStage from './colour-stage';
import {createHistory,recordChange,undoChange,redoChange} from '@/lib/editor-history';
import {invalidateSites} from '@/lib/historical-sites';
import {newColours,exportColourOverlay} from '@/lib/map-colours';
import {ZERO_ADJUSTMENT,initialOverlay,overlayMatrix,overlayResiduals,applyMatrix,invertMatrix,rectangleRing,toPlane,fromPlane} from '@/lib/map-overlay';

const endpoint='/proto/london-island/compare/overlay/save';
const fullSheet=[0,0,definition.source.width,definition.source.height];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const path=points=>points.map((p,i)=>`${i?'L':'M'}${p.join(',')}`).join(' ')+'Z';
const extent=points=>{
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),w=Math.max(30,Math.max(...xs)-Math.min(...xs)),h=Math.max(30,Math.max(...ys)-Math.min(...ys));
 const width=Math.max(w,h*1.5)*1.3,height=width/1.5;
 return [(Math.min(...xs)+Math.max(...xs)-width)/2,(Math.min(...ys)+Math.max(...ys)-height)/2,width,height];
};
const seed=initialOverlay(definition);
const starterMap=extent(rectangleRing(seed.selection).map(p=>applyMatrix(overlayMatrix(seed,definition.pivot),p)));
const validBox=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>=10&&b[3]>=10&&b[2]<=10000&&b[3]<=10000&&Math.abs(b[0])<20000&&Math.abs(b[1])<20000;

export default function Overlay(){
 const [config,setConfig]=useState(()=>initialOverlay(definition)),[buildings,setBuildings]=useState([]),[ready,setReady]=useState(false),[index,setIndex]=useState(null);
 const [stage,setStage]=useState('select'),[mode,setMode]=useState('select'),[sheetBox,setSheetBox]=useState(fullSheet),[mapBox,setMapBox]=useState(starterMap);
 const [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[sourceMissing,setSourceMissing]=useState(false);
 const [advanced,setAdvanced]=useState(false),[pointId,setPointId]=useState(definition.points[0].id),[newName,setNewName]=useState('');
 const drag=useRef(null),version=useRef(0),svgRef=useRef(null),history=useRef(createHistory(config));
 const selection=config.selection,viewBox=stage==='select'?sheetBox:mapBox;
 const transform=useMemo(()=>{try{const matrix=overlayMatrix(config,definition.pivot);return {matrix,inverse:invertMatrix(matrix),residuals:overlayResiduals(config,matrix)};}catch(e){return {error:e.message};}},[config.points,config.model,config.adjustment]);
 const checks=transform.residuals?.filter(p=>p.role==='check')??[],rmse=checks.length?Math.sqrt(checks.reduce((s,p)=>s+p.errorMetres**2,0)/checks.length):null;
 const selectedPoint=config.points.find(p=>p.id===pointId)??config.points[0];
 const visibleBuildings=useMemo(()=>buildings.filter(b=>b.bounds[0]<mapBox[0]+mapBox[2]&&b.bounds[2]>mapBox[0]&&b.bounds[1]<mapBox[1]+mapBox[3]&&b.bounds[3]>mapBox[1]),[buildings,mapBox]);
 const canSave=ready&&!saving&&!sourceMissing&&!transform.error;
 function change(patch,options={}){
  const c=history.current.present;
  const alignmentChanged=['selection','points','model','adjustment'].some(key=>key in patch);
  const evidenceChanged=patch.colours&&c.colours&&['runs','grid','rules','samples','strokes','automatic'].some(key=>patch.colours[key]!==c.colours[key]);
  const next={...c,...patch};
  if(next.colours&&(alignmentChanged||evidenceChanged))next.colours={...next.colours,reviews:{},sites:invalidateSites(next.colours.sites)};
  const key=Object.keys(patch)[0],label=key==='adjustment'?'alignment adjustment':key==='selection'?'area selection':key==='points'?'landmark edit':'colour edit';
  history.current=recordChange(history.current,next,{label,group:key==='colours'?null:key,...options});
  setConfig(next);version.current++;setDirty(true);setMessage('');setError('');
 }
 function travel(direction){
  const h=history.current,item=(direction==='undo'?h.past:h.future).at(-1);if(!item)return;
  history.current=direction==='undo'?undoChange(h):redoChange(h);setConfig(history.current.present);version.current++;setDirty(true);setError('');setMessage(`${direction==='undo'?'Undid':'Redid'} ${item.label}.`);
 }
 useEffect(()=>{
  const handler=e=>{if(!(e.metaKey||e.ctrlKey)||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
   if(e.key.toLowerCase()==='z'){e.preventDefault();travel(e.shiftKey?'redo':'undo');}else if(e.key.toLowerCase()==='y'){e.preventDefault();travel('redo');}
  };
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[]);
 function adjustment(key,value){change({adjustment:{...config.adjustment,[key]:value}});}
 function changeView(box){(stage==='select'?setSheetBox:setMapBox)(box);}
 function zoom(factor){const [x,y,w,h]=viewBox,nw=clamp(w*factor,30,5000),nh=h*nw/w;changeView([x+(w-nw)/2,y+(h-nh)/2,nw,nh]);}
 function focusArea(){if(stage==='select')setSheetBox(extent(rectangleRing(selection)));else if(transform.matrix)setMapBox(extent(rectangleRing(selection).map(p=>applyMatrix(transform.matrix,p))));}
 function switchStage(next){
  if(next==='colours'&&!config.colours){try{change({colours:newColours(config.selection,index.fingerprints)});}catch(e){setError(e.message);return;}}
  if(next==='align'&&transform.matrix)setMapBox(extent(rectangleRing(selection).map(p=>applyMatrix(transform.matrix,p))));
  setStage(next);setMode(next==='select'?'select':'move');setError('');
 }
 useEffect(()=>{
  const abort=new AbortController(),signal=AbortSignal.any([abort.signal,AbortSignal.timeout(20000)]);
  Promise.all([fetch('/proto/london-island/building-index.json',{signal}).then(async r=>{if(!r.ok)throw new Error('Modern buildings could not load.');return r.json();}),fetch(endpoint,{signal}).then(async r=>{if(!r.ok)throw new Error('Saved alignment could not load. Use this tool in local development.');return r.json();})]).then(([index,saved])=>{
   setIndex(index);
   setBuildings(index.features.map(f=>{
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    const rings=polygons.flatMap(p=>p.map(r=>r.map(toPlane))),points=rings.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    return {id:f.id,name:f.properties.sourceName??'Modern building',path:rings.map(path).join(' '),bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};
   }));
   if(saved){
    exportColourOverlay(saved,definition,index);history.current=createHistory(saved);setConfig(saved);setMessage('Loaded data/pimlico-overlay.json');
    if(saved.view){
     const s=['align','colours'].includes(saved.view.stage)?saved.view.stage:'select';setStage(s);setMode(s==='align'?'move':'select');
     if(validBox(saved.view.sheet))setSheetBox(saved.view.sheet);
     if(validBox(saved.view.map))setMapBox(saved.view.map);
    }
   }
   setReady(true);
  }).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
  return()=>abort.abort();
 },[]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function pointPatch(patch){change({points:config.points.map(p=>p.id===selectedPoint.id?{...p,...patch,provenance:'Adjusted in the overlay tool; requires independent review.'}:p)});}
 function pointerPosition(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svgRef.current.getScreenCTM().inverse());return [p.x,p.y];}
 function pointerDown(e){
  if(!ready||e.button!==0)return;
  const p=pointerPosition(e);
  if(mode==='paper-point'&&transform.inverse){const pixel=applyMatrix(transform.inverse,p);if(pixel[0]<0||pixel[0]>definition.source.width||pixel[1]<0||pixel[1]>definition.source.height){setError('Pick a point inside the source sheet.');return;}pointPatch({pixel});return;}
  if(mode==='modern-point'){pointPatch({coordinates:fromPlane(p)});return;}
  const corner=e.target.getAttribute('data-corner');
  const anchor=corner!==null?rectangleRing(selection)[(Number(corner)+2)%4]:p;
  drag.current={start:p,anchor,selection:{...selection},adjustment:{...config.adjustment},box:[...viewBox],kind:corner!==null?'select':mode};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function pointerMove(e){
  const d=drag.current;if(!d)return;
  // Use the pointer-down camera while panning so moving the view cannot feed back into the drag.
  const svg=svgRef.current,rect=svg.getBoundingClientRect(),scale=Math.min(rect.width/d.box[2],rect.height/d.box[3]);
  const offsetX=(rect.width-d.box[2]*scale)/2,offsetY=(rect.height-d.box[3]*scale)/2;
  const p=[d.box[0]+(e.clientX-rect.left-offsetX)/scale,d.box[1]+(e.clientY-rect.top-offsetY)/scale];
  if(d.kind==='pan'){changeView([d.box[0]-(p[0]-d.start[0]),d.box[1]-(p[1]-d.start[1]),d.box[2],d.box[3]]);return;}
  if(d.kind==='move'){change({adjustment:{...d.adjustment,east:clamp(d.adjustment.east+p[0]-d.start[0],-200,200),north:clamp(d.adjustment.north-p[1]+d.start[1],-200,200)}});return;}
  if(d.kind==='select'){
   const a=[clamp(d.anchor[0],0,definition.source.width),clamp(d.anchor[1],0,definition.source.height)],b=[clamp(p[0],0,definition.source.width),clamp(p[1],0,definition.source.height)];
   change({selection:{x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),width:Math.abs(a[0]-b[0]),height:Math.abs(a[1]-b[1])}});
  }
 }
 function pointerUp(e){
  if(drag.current?.kind==='select'&&(selection.width<12||selection.height<12)){change({selection:drag.current.selection});setError('Drag a larger area, at least 12 pixels in each direction.');}
  drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 function cancelDrag(){if(drag.current){change({selection:drag.current.selection,adjustment:drag.current.adjustment});drag.current=null;}}
 function keyMove(e){
  const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=deltas[e.key];if(!d)return;e.preventDefault();const step=e.shiftKey?5:1;
  if(stage==='align')change({adjustment:{...config.adjustment,east:clamp(config.adjustment.east+d[0]*step,-200,200),north:clamp(config.adjustment.north-d[1]*step,-200,200)}});
  else change({selection:{...selection,x:clamp(selection.x+d[0]*step,0,definition.source.width-selection.width),y:clamp(selection.y+d[1]*step,0,definition.source.height-selection.height)}});
 }
 async function save(){
  setError('');setSaving(true);const revision=version.current;
  try{
   const value={...config,artifact:undefined,view:{stage,sheet:sheetBox,map:mapBox}};exportColourOverlay(value,definition,index);
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(20000)});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'Save failed.');
   if(version.current===revision){setDirty(false);setMessage(`Saved ${result.path}`);}else setMessage(`Saved ${result.path}. Newer changes are still unsaved.`);
  }catch(e){setError(e.message);}finally{setSaving(false);}
 }
 function download(){
  try{const value={...config,view:{stage,sheet:sheetBox,map:mapBox},artifact:exportColourOverlay(config,definition,index)},url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pimlico-overlay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}
 }
 function addPoint(){const id=newName.trim();if(!id||config.points.some(p=>p.id===id)){setError('Give this landmark a unique name.');return;}const pixel=[selection.x+selection.width/2,selection.y+selection.height/2];change({points:[...config.points,{id,role:'exclude',pixel,coordinates:fromPlane(applyMatrix(transform.matrix,pixel)),reference:'',provenance:'New pair; excluded until both positions are picked.'}]});setPointId(id);setNewName('');setMode('paper-point');svgRef.current?.scrollIntoView({block:'center'});}
 const paperOpacity=mode==='paper-point'?1:mode==='modern-point'?0:config.display.opacity;
 const showOutlines=config.display.outlines&&mode!=='paper-point';
 return <main className="sheet-tool">
  <header className="sheet-header"><div><a href="/proto/london-island/compare">← Compare maps</a><h1>Put the paper in place.</h1><p>Pimlico · watermarked working sheet</p></div><div className="sheet-save"><span>{dirty?'Unsaved changes':message?'Saved workspace':'Starting estimate'}</span><button disabled={!history.current.past.length} title={history.current.past.at(-1)?.label??'Nothing to undo'} onClick={()=>travel('undo')}>Undo</button><button disabled={!history.current.future.length} title={history.current.future.at(-1)?.label??'Nothing to redo'} onClick={()=>travel('redo')}>Redo</button><button className="sheet-primary" disabled={!canSave} onClick={save}>{saving?'Saving…':config.colours?'Save to project':'Save alignment'}</button><button disabled={!canSave} onClick={download}>Download</button></div></header>
  <nav className="sheet-steps" aria-label="Overlay workflow"><button aria-current={stage==='select'?'step':undefined} onClick={()=>switchStage('select')}><span>1</span>Select an area</button><button disabled={!ready||Boolean(transform.error)} aria-current={stage==='align'?'step':undefined} onClick={()=>switchStage('align')}><span>2</span>Align overlay</button><button disabled={!ready||Boolean(transform.error)} aria-current={stage==='colours'?'step':undefined} onClick={()=>switchStage('colours')}><span>3</span>Colour areas</button><p>Align → colour → review → save.</p></nav>
  <div className="sheet-feedback" aria-live="polite">{error?<p role="alert">{error}</p>:message?<p role="status">{message}</p>:<p>{ready?'Starting landmarks are estimates. Check the unchanged streets before saving.':'Loading the sheet and modern buildings…'}</p>}{sourceMissing&&<p role="alert">The watermarked source could not load. Check that watermark.png is available in this workspace.</p>}</div>
  {stage==='colours'?<ColourStage config={config} index={index} onChange={(colours,options)=>change({colours},options)} onError={setError}/>:<div className="sheet-workspace"><section className="sheet-main">
   <div className="sheet-toolbar"><div className="sheet-modes"><button aria-pressed={mode===(stage==='select'?'select':'move')} onClick={()=>setMode(stage==='select'?'select':'move')}>{stage==='select'?'Draw area':'Move paper'}</button><button aria-pressed={mode==='pan'} onClick={()=>setMode('pan')}>Pan view</button></div><div><button aria-label="Zoom out" onClick={()=>zoom(1.35)}>−</button><button aria-label="Zoom in" onClick={()=>zoom(1/1.35)}>+</button><button onClick={focusArea}>Focus area</button>{stage==='select'&&<button onClick={()=>setSheetBox(fullSheet)}>Full sheet</button>}</div></div>
   <svg ref={svgRef} className={`sheet-canvas mode-${mode}`} viewBox={viewBox.join(' ')} tabIndex={0} role="img" aria-label={stage==='select'?'Source sheet area selection. Drag a rectangle or use selection fields.':'Map alignment canvas. Drag the paper or use arrow keys to nudge it by one metre.'} onKeyDown={keyMove} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag}>
    <defs><clipPath id="sheet-selection-clip"><rect {...selection}/></clipPath></defs>
    {stage==='select'?<>
     <image href={definition.source.url} width={definition.source.width} height={definition.source.height} onError={()=>setSourceMissing(true)}/>
     <path d={`${path(rectangleRing({x:0,y:0,width:2060,height:1290}))} ${path(rectangleRing(selection))}`} fill="#101e19" fillOpacity=".5" fillRule="evenodd" pointerEvents="none"/>
     <rect {...selection} fill="none" stroke="#fff0ac" strokeWidth="2" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
     {rectangleRing(selection).slice(0,4).map(([x,y],i)=><circle key={i} data-corner={i} cx={x} cy={y} r={viewBox[2]/110} fill="#fff0ac" stroke="#233b32" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>)}
    </>:<>
     {visibleBuildings.map(b=><path key={b.id} data-modern-id={b.id} d={b.path} fill="#51695f" fillRule="evenodd"><title>{b.name}</title></path>)}
     {transform.matrix&&<g transform={`matrix(${transform.matrix.join(' ')})`}><image href={definition.source.url} width={definition.source.width} height={definition.source.height} opacity={paperOpacity} clipPath={advanced?undefined:'url(#sheet-selection-clip)'} onError={()=>setSourceMissing(true)}/><rect {...selection} fill="none" stroke="#fff0ac" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></g>}
     {showOutlines&&visibleBuildings.map(b=><path key={b.id} d={b.path} fill="none" stroke="#8bd3c4" strokeWidth="1" vectorEffect="non-scaling-stroke" fillRule="evenodd" pointerEvents="none"/>)}
     {advanced&&transform.matrix&&config.points.filter(p=>p.role!=='exclude'||p.id===selectedPoint.id).map((p,i)=>{
      const predicted=applyMatrix(transform.matrix,p.pixel),actual=toPlane(p.coordinates),size=mapBox[2]/160;
      return <g key={p.id} pointerEvents="none"><line x1={predicted[0]} y1={predicted[1]} x2={actual[0]} y2={actual[1]} stroke="#e37153" strokeWidth="2" vectorEffect="non-scaling-stroke"/><circle cx={predicted[0]} cy={predicted[1]} r={size} fill="#e37153"/><circle cx={actual[0]} cy={actual[1]} r={size} fill="#8bd3c4"/><text x={actual[0]+size*1.5} y={actual[1]} fontSize={size*2.5} fill="white" stroke="#182b24" strokeWidth={size*.5} paintOrder="stroke">{i+1}</text></g>;
     })}
    </>}
   </svg>
   <div className="sheet-caption"><p>{stage==='select'?'Drag a rectangle on the original sheet. Corner handles resize the selection.':mode==='paper-point'?`Pick ${selectedPoint.id} on the paper. The surrounding sheet is visible.`:mode==='modern-point'?`Pick ${selectedPoint.id} on the fixed modern map.`:mode==='pan'?'Drag to move the view. The alignment stays fixed.':'Drag the paper into place. Arrow keys nudge 1 m; Shift + arrow nudges 5 m.'}</p><span>{stage==='select'?`${Math.round(selection.width)} × ${Math.round(selection.height)} source pixels`:'Teal outlines · modern buildings'}</span></div>
  </section><aside className="sheet-sidebar">
   <div className="sheet-overview"><span>On the full sheet</span><svg viewBox={fullSheet.join(' ')} role="img" aria-label="Full sheet overview showing the selected area"><image href={definition.source.url} width="2060" height="1290"/><rect {...selection} fill="#fff0ac" fillOpacity=".25" stroke="#ad3d21" strokeWidth="14"/></svg></div>
   {stage==='select'?<div className="sheet-controls"><h2>Choose your working area.</h2><p>The suggested area covers the three blocks around Cambridge, Alderney and Winchester Streets.</p><button onClick={()=>{change({selection:{...definition.selection}});setSheetBox(extent(rectangleRing(definition.selection)));}}>Use Pimlico starter area</button><button className="sheet-primary" disabled={!ready||selection.width<12||selection.height<12||Boolean(transform.error)} onClick={()=>switchStage('align')}>Align this area →</button><details><summary>Selection coordinates</summary><p>Original image pixels. The crop keeps its position within the sheet.</p>{['x','y','width','height'].map(key=><label key={key}>{key}<input aria-label={`Selection ${key}`} type="number" min={key==='x'||key==='y'?0:12} max={key==='x'||key==='width'?2060:1290} value={Math.round(selection[key]*10)/10} onChange={e=>{const value=e.target.valueAsNumber;if(!Number.isFinite(value))return;const next={...selection,[key]:value};next.width=clamp(next.width,12,2060);next.height=clamp(next.height,12,1290);next.x=clamp(next.x,0,2060-next.width);next.y=clamp(next.y,0,1290-next.height);change({selection:next});}}/></label>)}</details></div>:<div className="sheet-controls"><h2>Match the unchanged streets.</h2>
    <label className="sheet-slider">Paper opacity<output>{Math.round(config.display.opacity*100)}%</output><input aria-label="Paper opacity" type="range" min="0" max="1" step=".05" value={config.display.opacity} onChange={e=>change({display:{...config.display,opacity:Number(e.target.value)}})}/></label>
    <label className="sheet-check"><input type="checkbox" checked={config.display.outlines} onChange={e=>change({display:{...config.display,outlines:e.target.checked}})}/> Modern outlines</label>
    <div className="sheet-offsets">{[['east','East / west (m)'],['north','North / south (m)']].map(([key,title])=><label key={key}>{title}<input aria-label={title} type="number" min="-200" max="200" step=".5" value={Math.round(config.adjustment[key]*10)/10} onChange={e=>{if(Number.isFinite(e.target.valueAsNumber))adjustment(key,clamp(e.target.valueAsNumber,-200,200));}}/></label>)}</div>
    <label className="sheet-slider">Rotation<output>{config.adjustment.rotation.toFixed(1)}°</output><input aria-label="Rotation" type="range" min="-30" max="30" step=".1" value={config.adjustment.rotation} onChange={e=>adjustment('rotation',Number(e.target.value))}/></label>
    <label className="sheet-slider">Scale<output>{config.adjustment.scale.toFixed(3)}×</output><input aria-label="Scale" type="range" min=".5" max="2" step=".001" value={config.adjustment.scale} onChange={e=>adjustment('scale',Number(e.target.value))}/></label>
    <button onClick={()=>change({adjustment:{...ZERO_ADJUSTMENT}})}>Reset adjustments</button>
    {!visibleBuildings.length&&<p role="alert">No modern footprints are loaded here. Return to the Pimlico starter area or extend the building source before aligning this area.</p>}
    <p className="sheet-metric">{transform.error??(rmse===null?'No check landmarks yet.':`${checks.length} check picks · ${rmse.toFixed(1)} m RMSE`)}<small>Starting picks are estimates. This measures agreement with those picks, not historical accuracy.</small></p>
   </div>}
  {stage==='align'&&<details className="sheet-landmarks" open={advanced} onToggle={e=>{setAdvanced(e.currentTarget.open);if(!e.currentTarget.open&&(mode==='paper-point'||mode==='modern-point'))setMode('move');}}><summary>Landmark checks <span>Optional · fit and check the placement</span></summary><div className="sheet-landmark-grid"><div><p>{definition.seedNote}</p><label>Alignment model<select aria-label="Alignment model" value={config.model} onChange={e=>change({model:e.target.value})}><option value="similarity">Move, rotate and uniform scale</option><option value="affine">Affine — allow stretch and shear</option></select></label><button onClick={()=>{change({points:structuredClone(definition.points),model:'similarity',adjustment:{...ZERO_ADJUSTMENT}});setPointId(definition.points[0].id);setMode('move');}}>Restore starting landmarks</button><p>Changing fitting points recalculates placement. Check points only measure disagreement. Keep rebuilt shapes out of the fit.</p></div><div>
   <label>Landmark<select aria-label="Landmark" value={selectedPoint.id} onChange={e=>setPointId(e.target.value)}>{config.points.map((p,i)=><option key={p.id} value={p.id}>{i+1} · {p.id}</option>)}</select></label>
   <label>Use as<select aria-label="Landmark role" value={selectedPoint.role} onChange={e=>pointPatch({role:e.target.value})}><option value="fit">Fitting point</option><option value="check">Check only</option><option value="exclude">Excluded</option></select></label>
   <div className="sheet-pick-buttons"><button aria-pressed={mode==='paper-point'} disabled={!transform.inverse} onClick={()=>{setMode('paper-point');svgRef.current?.scrollIntoView({block:'center'});}}>Pick on paper</button><button aria-pressed={mode==='modern-point'} onClick={()=>{setMode('modern-point');svgRef.current?.scrollIntoView({block:'center'});}}>Pick on modern map</button><button onClick={()=>setMode('move')}>Done picking</button></div>
   <label>Reference or evidence<input aria-label="Landmark evidence" value={selectedPoint.reference??''} maxLength={2000} onChange={e=>pointPatch({reference:e.target.value})}/></label><small>Paper: {selectedPoint.pixel.map(v=>v.toFixed(1)).join(', ')} px · Modern: {selectedPoint.coordinates.map(v=>v.toFixed(6)).join(', ')}</small>
   <label>New landmark name<input value={newName} maxLength={100} onChange={e=>setNewName(e.target.value)}/></label><button disabled={!transform.matrix||config.points.length>=40} onClick={addPoint}>Add landmark pair</button><p>New pairs stay excluded until you pick both positions and choose a role.</p>
  </div><div><h3>Residuals</h3>{transform.residuals?.map(p=><p className="sheet-residual" key={p.id}><span>{p.id}<small>{p.role}</small></span><strong>{p.errorMetres.toFixed(1)} m</strong></p>)}{transform.error&&<p role="alert">{transform.error}</p>}</div></div></details>}
  </aside></div>}
  <footer className="sheet-footer"><p>Saved alignment applies to the selected area. Check new areas before extending it across the sheet. Watermark-obscured detail remains unknown.</p><p>Historical sheet © London Picture Archive / The London Archives. Modern geometry © OpenStreetMap contributors / Overture Maps Foundation.</p></footer>
 </main>;
}
