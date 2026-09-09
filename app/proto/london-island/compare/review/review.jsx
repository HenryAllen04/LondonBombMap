'use client';
import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import study from '@/data/pimlico-local-study.json';
import {localPlacement} from '@/lib/local-history';
import {DEFAULT_ADJUSTMENT,reviewPlacement,reviewResiduals,targetGeometry,exportReview} from '@/lib/pimlico-review';
import {damageCategories} from '@/lib/damage';

const ObjectPreview=dynamic(()=>import('./object-preview'),{ssr:false,loading:()=> <p>Preparing object preview…</p>});
const baseline=localPlacement(study),polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const pathFor=(geometry,project=baseline.pixel)=>polys(geometry).map(p=>p.map(r=>r.map((c,i)=>`${i?'L':'M'}${project(c).join(',')}`).join(' ')+'Z').join(' ')).join(' ');
const ringPath=ring=>ring.map((p,i)=>`${i?'L':'M'}${p.join(',')}`).join(' ')+'Z';
const initial=()=>({schemaVersion:1,sourceImageSha256:study.sourceImage.sha256,fingerprints:null,
 adjustment:{...DEFAULT_ADJUSTMENT},points:study.points.map(p=>({...p,kind:'street-junction'})),assignments:[],reviewer:''});
const label=f=>f.properties.sourceName||(f.properties.buildingId===study.site.modernBuildingId?'Russell House':`Building ${f.properties.buildingId.slice(0,8)}`);
const endpoint='/proto/london-island/compare/review/save';

export default function Review(){
 const [index,setIndex]=useState(null),[config,setConfig]=useState(initial),[error,setError]=useState(''),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false);
 const [editingId,setEditingId]=useState(null),[showCandidate,setShowCandidate]=useState(true);
 const [rowId,setRowId]=useState(study.areas[0].id),[selectedId,setSelectedId]=useState(''),[kind,setKind]=useState('building'),[partId,setPartId]=useState('');
 const [targets,setTargets]=useState([]),[ring,setRing]=useState([]),[drawing,setDrawing]=useState(false),[sectionName,setSectionName]=useState('');
 const [name,setName]=useState(''),[relationship,setRelationship]=useState('uncertain'),[reviewed,setReviewed]=useState(false),[evidence,setEvidence]=useState('');
 const [landmark,setLandmark]=useState(study.points[0].id),[pickMode,setPickMode]=useState('objects'),[landmarkName,setLandmarkName]=useState('');
 const [opacity,setOpacity]=useState(.35),[zoom,setZoom]=useState(1),[centre,setCentre]=useState([680,325]),[renderStyle,setRenderStyle]=useState('outline'),[preview3D,setPreview3D]=useState(false),[sourceMissing,setSourceMissing]=useState(false);
 useEffect(()=>{
  const abort=new AbortController(),signal=AbortSignal.any([abort.signal,AbortSignal.timeout(20000)]);
  Promise.all([fetch('/proto/london-island/building-index.json',{signal}).then(r=>{if(!r.ok)throw new Error('Building data failed to load.');return r.json();}),fetch(endpoint,{signal}).then(r=>{if(r.status===404)return null;if(!r.ok)throw new Error('Saved review could not be read.');return r.json();})]).then(([data,saved])=>{
   setIndex(data);
   if(saved){try{exportReview(saved,data,study);setConfig(saved);setMessage('Loaded data/pimlico-review.json');}catch(e){setError(`Saved review retained on disk: ${e.message}`);setConfig({...initial(),fingerprints:data.fingerprints});}}
   else setConfig({...initial(),fingerprints:data.fingerprints});
  }).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
  return()=>abort.abort();
 },[]);
 function update(next){setConfig(c=>({...c,...next}));setDirty(true);setMessage('');}
 function align(next){setConfig(c=>({...c,...next,assignments:c.assignments.map(a=>({...a,reviewStatus:'draft'}))}));setReviewed(false);setDirty(true);setMessage('Alignment changed. Existing assignments are now drafts.');}
 const transform=useMemo(()=>{try{return {project:reviewPlacement(config.points,config.adjustment),residuals:reviewResiduals(config.points,config.adjustment)};}catch(e){return {error:e.message};}},[config.points,config.adjustment]);
 const rows=useMemo(()=>transform.project?study.areas.map(r=>({...r,geometry:{type:'Polygon',coordinates:[[...r.ring,r.ring[0]].map(transform.project)]}})):[],[transform]);
 const buildings=useMemo(()=>index?.features.filter(f=>polys(f.geometry).some(p=>p[0].some(c=>{const [x,y]=baseline.pixel(c);return x>300&&x<1070&&y>0&&y<670;})))??[],[index]);
 const selected=index?.features.find(f=>f.id===selectedId),row=study.areas.find(r=>r.id===rowId),colour=damageCategories[row.category].color;
 const parts=selected?.renderPieces.filter(p=>p.id!==selected.id)??[];
 const currentTarget=selected?{kind,componentId:selected.id,...(kind==='part'?{partId}:{}),...(kind==='section'?{name:sectionName,ring}:{})}:null;
 const currentGeometry=useMemo(()=>{if(!index||!currentTarget)return null;try{return targetGeometry(currentTarget,index).geometry;}catch{return null;}},[index,selectedId,kind,partId,ring,sectionName]);
 const authored=useMemo(()=>{if(!index||!config.fingerprints||transform.error)return null;try{return exportReview(config,index,study);}catch{return null;}},[config,index,transform]);
 const checks=transform.residuals?.filter(p=>p.role==='check')??[],rmse=checks.length?Math.sqrt(checks.reduce((s,p)=>s+p.errorMetres**2,0)/checks.length):null;
 const viewBox=`${centre[0]-310/zoom} ${centre[1]-250/zoom} ${620/zoom} ${500/zoom}`;
 const chosenPoint=config.points.find(p=>p.id===landmark)??config.points[0];
 function pointChange(patch){align({points:config.points.map(p=>p.id===chosenPoint.id?{...p,...patch}:p)});}
 function addLandmark(){
  const id=landmarkName.trim();if(!id||config.points.some(p=>p.id===id)){setError('Give the new landmark a unique name.');return;}
  align({points:[...config.points,{id,kind:'surviving-corner',role:'exclude',pixel:[...centre],coordinates:baseline.coordinates(centre),reference:'',reviewer:'Unreviewed'}]});setLandmark(id);setLandmarkName('');setError('');setMessage('New landmark excluded until you pick both positions and choose fit or check.');
 }
 function selectBuilding(id){setShowCandidate(true);setSelectedId(id);setPartId('');setRing([]);setDrawing(false);if(index?.features.find(f=>f.id===id)?.properties.buildingId===study.site.modernBuildingId)setRelationship('rebuilt');}
 function clickMap(e,side){
  const svg=e.currentTarget,p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),pixel=[p.x,p.y];
  if(pickMode==='source'&&side==='source')pointChange({pixel});
  if(pickMode==='modern'&&side==='modern')pointChange({coordinates:baseline.coordinates(pixel)});
  if(drawing&&side==='modern'&&ring.length<128)setRing(r=>[...r,baseline.coordinates(pixel)]);
 }
 function addTarget(){
  try{if(!currentTarget)throw new Error('Select a modern building first.');targetGeometry(currentTarget,index);if(kind==='section'&&!sectionName.trim())throw new Error('Give this section a name.');
   if(targets.some(t=>JSON.stringify({...t,id:undefined})===JSON.stringify(currentTarget)))throw new Error('This target is already in the assignment.');
   setTargets(t=>[...t,{...currentTarget,id:crypto.randomUUID()}]);setDrawing(false);setError('');
  }catch(e){setError(e.message);}
 }
 function addAssignment(){
  try{
   const assignment={id:editingId??crypto.randomUUID(),rowId,name:name.trim()||row.description,relationship,reviewStatus:reviewed?'reviewed':'draft',reviewer:config.reviewer,evidence,targets};
   const assignments=editingId?config.assignments.map(a=>a.id===editingId?assignment:a):[...config.assignments,assignment];
   exportReview({...config,assignments},index,study);
   update({assignments});setEditingId(null);setTargets([]);setName('');setEvidence('');setReviewed(false);setShowCandidate(false);setError('');
  }catch(e){setError(e.message);}
 }
 async function save(){
  setSaving(true);setError('');
  try{exportReview(config,index,study);const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...config,artifact:undefined}),signal:AbortSignal.timeout(20000)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Save failed.');setDirty(false);setMessage(`Saved ${result.objects} objects to ${result.path}`);}
  catch(e){setError(e.message);}finally{setSaving(false);}
 }
 function download(){try{const artifact=exportReview(config,index,study),url=URL.createObjectURL(new Blob([JSON.stringify(artifact,null,2)],{type:'application/geo+json'})),a=document.createElement('a');a.href=url;a.download='pimlico-authored-sections.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}}
 function focusSelected(){if(!selected)return;const points=polys(selected.geometry).flatMap(p=>p[0]).map(baseline.pixel);setCentre([0,1].map(i=>(Math.min(...points.map(p=>p[i]))+Math.max(...points.map(p=>p[i])))/2));setZoom(3);}
 function preset(value){setShowCandidate(true);setKind(value);setDrawing(false);setRenderStyle(value==='building'?'outline':'solid');setPreview3D(false);}
 const objectPreview=useMemo(()=>{
  const objects=(authored?.features??[]).map(f=>({...f,color:damageCategories[f.properties.category].color}));
  if(showCandidate&&currentGeometry)objects.push({type:'Feature',id:'current-target',geometry:currentGeometry,color:colour,properties:{name:sectionName||label(selected),componentId:selected.id,partId:kind==='part'?partId:null,relationship,reviewStatus:'draft'}});
  return objects;
 },[authored,currentGeometry,colour,sectionName,selected,relationship,showCandidate,kind,partId]);
 const previewBuildings=useMemo(()=>index?.features.filter(b=>b.id===selectedId||objectPreview.some(o=>o.properties.componentId===b.id))??[],[index,selectedId,objectPreview]);
 return <main className="review-tool">
  <header className="review-header"><div><a href="/proto/london-island/compare">← Paper / modern comparison</a><h1>Assign historical rows.</h1><p>Review the alignment. Choose the object. Name the correspondence.</p></div><div className="review-save"><button disabled={!index||saving||Boolean(transform.error)||Boolean(editingId)||Boolean(targets.length)} onClick={save}>{saving?'Saving…':'Save to project'}</button><button disabled={!index||Boolean(transform.error)} onClick={download}>Download GeoJSON</button><span>{editingId||targets.length?'Record the current assignment before saving':dirty?'Unsaved changes':'Working review'}</span></div></header>
  <p className="review-note">The dots are estimates, not proof that houses moved. A low fitting error only describes your chosen anchors. Check surviving corners separately; keep rebuilt sites out of the fit.</p>
  {error&&<p className="review-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{!index&&!error&&<p role="status">Loading building objects…</p>}{sourceMissing&&<p role="alert">The private paper reference is unavailable in this workspace.</p>}
  <div className="review-presets" aria-label="Assignment prototypes"><span>Try a workflow</span><button aria-pressed={kind==='building'} onClick={()=>preset('building')}>1 · Whole objects</button><button aria-pressed={kind==='part'} onClick={()=>preset('part')}>2 · Supplied parts</button><button aria-pressed={kind==='section'} onClick={()=>preset('section')}>3 · Named sections</button></div>
  <div className="review-stage">
   <figure><figcaption><strong>Historical reference</strong><span>{row.description}</span></figcaption><svg viewBox={viewBox} onClick={e=>clickMap(e,'source')} aria-label="Historical reference selection canvas"><image href={study.sourceImage.url} width="1067" height="672" onError={()=>setSourceMissing(true)}/><path d={ringPath(row.ring)} fill={colour} fillOpacity=".2" stroke="#a52d22" strokeWidth={1.5/zoom}/>{config.points.map((p,i)=><g key={p.id}><circle cx={p.pixel[0]} cy={p.pixel[1]} r={(p.id===landmark?5:3)/zoom} fill={p.role==='fit'?'#b83926':p.role==='check'?'#187585':'#888'} stroke="white" strokeWidth={1/zoom}/><text x={p.pixel[0]+6/zoom} y={p.pixel[1]-5/zoom} fontSize={10/zoom} stroke="white" strokeWidth={2/zoom} paintOrder="stroke">{i+1}</text></g>)}</svg></figure>
   <figure><figcaption><strong>{preview3D?'Selectable section objects · 3D':'Modern objects · same map extent'}</strong><button onClick={()=>setPreview3D(!preview3D)}>{preview3D?'Return to plan':'Preview objects in 3D'}</button></figcaption>{preview3D?<ObjectPreview objects={objectPreview} buildings={previewBuildings} onSelect={id=>setMessage(`Selected object: ${objectPreview.find(o=>o.id===id)?.properties.name??id}`)}/>:<svg viewBox={viewBox} onClick={e=>clickMap(e,'modern')} aria-label="Modern object selection canvas"><rect x="0" y="0" width="1067" height="672" fill="#eee8db"/>
    {buildings.map(f=><path key={f.id} data-building-id={f.properties.buildingId} d={pathFor(f.geometry)} fill={selectedId===f.id?'#c3d8d4':'#d4d0c3'} stroke={selectedId===f.id?'#195f68':'#9d9e95'} strokeWidth={(selectedId===f.id?1.7:.45)/zoom} fillRule="evenodd" onClick={e=>{if(!drawing&&pickMode==='objects'){e.stopPropagation();selectBuilding(f.id);}}}><title>{label(f)}</title></path>)}
    {rows.map(r=><path key={r.id} d={pathFor(r.geometry)} fill={damageCategories[r.category].color} fillOpacity={r.id===rowId?opacity:0} stroke={r.id===rowId?colour:'none'} strokeWidth={1/zoom} strokeDasharray={`${3/zoom} ${2/zoom}`} pointerEvents="none"/>)}
    {authored?.features.map(f=><path key={f.id} d={pathFor(f.geometry)} fill={renderStyle==='solid'&&f.properties.relationship!=='rebuilt'&&!f.properties.conflicts?.length?damageCategories[f.properties.category].color:'none'} stroke={f.properties.relationship==='rebuilt'||f.properties.conflicts?.length?'#706956':damageCategories[f.properties.category].color} strokeWidth={2/zoom} fillRule="evenodd" pointerEvents="none"><title>{f.properties.name}</title></path>)}
    {showCandidate&&currentGeometry&&<path d={pathFor(currentGeometry)} fill={renderStyle==='solid'&&relationship!=='rebuilt'?colour:'none'} fillOpacity=".85" stroke="#bd4b28" strokeWidth={2/zoom} fillRule="evenodd" pointerEvents="none"/>}
    {ring.length>0&&<polyline points={ring.map(baseline.pixel).map(p=>p.join(',')).join(' ')} fill="none" stroke="#bd4b28" strokeWidth={2/zoom} pointerEvents="none"/>}
    {transform.residuals?.map(p=>{const predicted=baseline.pixel(p.predicted),actual=baseline.pixel(p.coordinates);return <g key={p.id} pointerEvents="none"><line x1={predicted[0]} y1={predicted[1]} x2={actual[0]} y2={actual[1]} stroke="#ad3626" strokeWidth={1/zoom}/><circle cx={actual[0]} cy={actual[1]} r={3/zoom} fill={p.role==='fit'?'#b83926':'#187585'}/></g>;})}
   </svg>}</figure>
  </div>
  <div className="review-view-controls"><label>Zoom<input aria-label="Comparison zoom" type="range" min="1" max="4" step=".1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><button disabled={!selected} onClick={focusSelected}>Focus selected</button><button onClick={()=>{setCentre([680,325]);setZoom(1);}}>Reset extent</button><label>Historical guide<input aria-label="Historical guide opacity" type="range" min="0" max=".8" step=".05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label><label>Object preview<select value={renderStyle} onChange={e=>setRenderStyle(e.target.value)}><option value="outline">Outlines</option><option value="solid">Whole-object fills</option></select></label></div>
  <div className="review-panels"><section><h2>1. Check alignment</h2><p>Offsets adjust the paper placement, not modern building coordinates. They are hypotheses to inspect.</p>
   {Object.entries({east:['East / west (m)',-40,40,.5],north:['North / south (m)',-40,40,.5],rotation:['Rotation (°)',-5,5,.1],scale:['Scale',.95,1.05,.001]}).map(([key,[title,min,max,step]])=><label className="review-slider" key={key}>{title}<output>{config.adjustment[key]}</output><input aria-label={title} type="range" min={min} max={max} step={step} value={config.adjustment[key]} onChange={e=>align({adjustment:{...config.adjustment,[key]:Number(e.target.value)}})}/></label>)}
   <div className="review-buttons"><button onClick={()=>align({adjustment:{...DEFAULT_ADJUSTMENT}})}>Zero adjustments</button><button onClick={()=>align({adjustment:{...DEFAULT_ADJUSTMENT,east:3}})}>Try +3 m east</button><button onClick={()=>{align({points:initial().points,adjustment:{...DEFAULT_ADJUSTMENT}});setLandmark(study.points[0].id);}}>Restore initial landmarks</button></div>
   <p className="review-metric">{transform.error??(rmse===null?'No independent check points.':`${checks.length} check picks · RMSE ${rmse.toFixed(1)} m · maximum ${Math.max(...checks.map(p=>p.errorMetres)).toFixed(1)} m`)}</p>
   <label>Landmark<select value={landmark} onChange={e=>setLandmark(e.target.value)}>{config.points.map((p,i)=><option key={p.id} value={p.id}>{i+1} · {p.id}</option>)}</select></label>
   <div className="review-two"><label>Feature type<select value={chosenPoint.kind} onChange={e=>pointChange({kind:e.target.value,...(e.target.value==='rebuilt-site'?{role:'exclude'}:{})})}><option value="street-junction">Street junction</option><option value="surviving-corner">Surviving building corner</option><option value="rebuilt-site">Rebuilt site — exclude</option></select></label><label>Use as<select value={chosenPoint.role} onChange={e=>pointChange({role:e.target.value})}><option value="fit" disabled={chosenPoint.kind==='rebuilt-site'}>Fitting point</option><option value="check" disabled={chosenPoint.kind==='rebuilt-site'}>Check only</option><option value="exclude">Excluded</option></select></label></div>
   <label>Evidence for this landmark<input value={chosenPoint.reference??''} onChange={e=>pointChange({reference:e.target.value})} placeholder="Source or description of the surviving corner"/></label>
   <div className="review-buttons"><button aria-pressed={pickMode==='source'} onClick={()=>{setPreview3D(false);setDrawing(false);setPickMode(pickMode==='source'?'objects':'source');}}>Pick on paper</button><button aria-pressed={pickMode==='modern'} onClick={()=>{setPreview3D(false);setDrawing(false);setPickMode(pickMode==='modern'?'objects':'modern');}}>Pick on modern map</button><button onClick={()=>{setPickMode('objects');setDrawing(false);}}>Finish picking</button></div>
   <p>{pickMode==='source'?'Click the matching feature on the left.':pickMode==='modern'?'Click the same feature on the right.':'Object selection is active.'}</p>
   <label>New surviving feature<input value={landmarkName} onChange={e=>setLandmarkName(e.target.value)} maxLength={100} placeholder="E.g. terrace front corner at no. 73"/></label><button disabled={config.points.length>=40} onClick={addLandmark}>Add landmark pair</button>
   <details><summary>All residuals</summary>{transform.residuals?.map(p=><p key={p.id}>{p.id} · {p.role} · {p.errorMetres.toFixed(1)} m</p>)}</details>
  </section><section><h2>2. Define the correspondence</h2><label>Historical row<select value={rowId} onChange={e=>{setRowId(e.target.value);setName('');}}>{study.areas.map(r=><option key={r.id} value={r.id}>{r.description}</option>)}</select></label>
   <label>Modern building<select value={selectedId} onChange={e=>selectBuilding(e.target.value)}><option value="">Click a building or choose here</option>{buildings.map(f=><option key={f.id} value={f.id}>{label(f)} · {f.id.slice(-4)}</option>)}</select></label>
   <label>Target unit<select value={kind} onChange={e=>preset(e.target.value)}><option value="building">Whole building component</option><option value="part">Supplied building part</option><option value="section">Draw and name a section</option></select></label>
   {kind==='part'&&<label>Source part<select value={partId} onChange={e=>setPartId(e.target.value)}><option value="">{parts.length?'Choose a supplied part':'No supplied parts for this building'}</option>{parts.map(p=><option key={p.id} value={p.id}>{p.id} · {p.height.top.toFixed(1)} m</option>)}</select></label>}
   {kind==='section'&&<><label>Section name<input value={sectionName} onChange={e=>setSectionName(e.target.value)} placeholder="E.g. north wing, street-facing terrace" maxLength={120}/></label><div className="review-buttons"><button disabled={!selected} aria-pressed={drawing} onClick={()=>{setDrawing(!drawing);setPreview3D(false);setPickMode('objects');}}>{drawing?'Finish boundary':'Draw section boundary'}</button><button disabled={!ring.length} onClick={()=>setRing(r=>r.slice(0,-1))}>Undo corner</button><button onClick={()=>setRing([])}>Clear boundary</button></div><p>{ring.length} corners. Click around the intended section on the right. The boundary is clipped to the selected parent; it becomes its own object.</p></>}
   <button disabled={!currentGeometry||(kind==='section'&&!sectionName.trim())} onClick={addTarget}>Add target object</button>
   <ul className="review-targets">{targets.map((t,i)=><li key={i}>{t.name||t.kind} · {t.componentId.slice(9,17)} <button aria-label={`Remove target ${i+1}`} onClick={()=>setTargets(ts=>ts.filter((_,n)=>n!==i))}>Remove</button></li>)}</ul><p>One row can link to several objects. Add each target before recording the assignment.</p>
   <label>Assignment name<input value={name} onChange={e=>setName(e.target.value)} placeholder={row.description} maxLength={120}/></label><label>Relationship<select value={relationship} onChange={e=>setRelationship(e.target.value)}><option value="uncertain">Uncertain correspondence</option><option value="surviving">Surviving building / section</option><option value="rebuilt">Rebuilt — site relationship only</option></select></label><label>Evidence notes<textarea value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Which unchanged corners, wall lines or records support this link?" maxLength={4000}/></label><label>Reviewer<input value={config.reviewer} onChange={e=>update({reviewer:e.target.value})} maxLength={120}/></label><label className="review-checkbox"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I have reviewed this correspondence</label><button disabled={!targets.length||!index||Boolean(transform.error)} onClick={addAssignment}>{editingId?'Update assignment':'Record assignment'}</button>{editingId&&<button onClick={()=>{setEditingId(null);setTargets([]);setName('');setEvidence('');setReviewed(false);}}>Cancel edit</button>}
  </section><section><h2>3. Inspect the objects</h2><p>{config.assignments.length} assignments · {authored?.features.length??0} explicit objects. These do not alter the main map until the saved output is adopted.</p><p>Rebuilt links and conflicting categories remain neutral in the preview. Heights use source estimates where available. Draft fills illustrate a proposed assignment; they are not confirmed damage.</p>
   {!config.assignments.length&&<p className="review-empty">Select a historical row and add its corresponding objects. The saved list will appear here.</p>}
   {authored?.features.some(f=>f.properties.conflicts?.length)&&<p className="review-error">Different damage categories are assigned to overlapping objects. They are excluded from painting until you resolve the conflict.</p>}
   {config.assignments.map(a=><article className="review-assignment" key={a.id}><strong>{a.name}</strong><p>{a.relationship} · {a.reviewStatus} · {a.targets.length} objects</p><small>{a.id}</small><p>{a.evidence||'No evidence notes yet.'}</p><button onClick={()=>{setRowId(a.rowId);setSelectedId(a.targets[0].componentId);setShowCandidate(false);setRing([]);setMessage(`Inspecting ${a.name}`);}}>Inspect</button><button onClick={()=>{setEditingId(a.id);setRowId(a.rowId);selectBuilding(a.targets[0].componentId);setTargets(a.targets);setName(a.name);setRelationship(a.relationship);setReviewed(a.reviewStatus==='reviewed');setEvidence(a.evidence);update({reviewer:a.reviewer??''});setShowCandidate(false);}}>Edit assignment</button><button onClick={()=>{if(editingId===a.id){setEditingId(null);setTargets([]);}update({assignments:config.assignments.filter(v=>v.id!==a.id)});}}>Remove assignment</button></article>)}
   <details><summary>What gets saved?</summary><p><code>data/pimlico-review.json</code> contains the full alignment configuration, evidence, source fingerprints, stable assignment IDs and a GeoJSON FeatureCollection. Each section retains its parent component, historical row and review status. Rebuilt or unreviewed objects are not eligible for historical damage painting.</p><p>Save works in local development. Download GeoJSON also works without writing to the project.</p></details>
  </section></div>
  <footer>Modern geometry © OpenStreetMap contributors / Overture Maps Foundation. Historical reference © The London Archives (City of London). Authoring prototype; no automatic inference that a current building was bombed.</footer>
 </main>;
}
