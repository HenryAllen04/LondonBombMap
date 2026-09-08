'use client';
import { memo, useDeferredValue, useState } from 'react';

export default memo(function BuildingPicker({records,building,onInspect}){
 const [query,setQuery]=useState('');
 const deferred=useDeferredValue(query).trim().toLowerCase();
 const visible=records.filter(r=>!deferred||`${r.name??''} ${r.sourceId} ${r.status}`.toLowerCase().includes(deferred));
 const options=building&&!visible.some(r=>r.id===building.id)?[building,...visible]:visible;
 return <>
  <label className="island-part-picker">Find a modern building<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, ID or overlap status"/></label>
  <label className="island-part-picker">Inspect building component<select aria-label="Inspect building component" value={building?.id??''} disabled={!records.length} onChange={e=>onInspect(e.target.value)}><option value="">Select a component ({visible.length})</option>{options.map(r=><option key={r.id} value={r.id}>{r.name??`Building ${r.sourceId.slice(0,8)}`} · {r.status} · {r.id.slice(-4)}</option>)}</select></label>
  {building?<section className="island-building-inspector" aria-label="Selected modern building" aria-live="polite">
   <strong>{building.name??`Building ${building.sourceId.slice(0,8)}`}</strong>
   <p>Modern building component · historical identity unreviewed</p>
   {building.historicalSite&&<p className="island-evidence-note">Replacement footprint: the wartime terraces are separate from this modern block. <a href="/proto/london-island/compare">Compare the site</a>. <a href={building.historicalSite.source} target="_blank" rel="noreferrer">Council survey, p. {building.historicalSite.sourcePage}</a>.</p>}
   {building.sensitive&&<p className="island-evidence-note">The candidate assignment changes in the ±3 m translation test. This is not a measured map error.</p>}
   {building.clipped&&<p>At the study edge. Overlap uses the complete source footprint.</p>}
   <dl><dt>Overture building ID</dt><dd>{building.sourceId}</dd><dt>Release</dt><dd>{building.release}</dd><dt>Parent height</dt><dd>{building.height.toFixed(1)} m · {building.heightSource}</dd><dt>Source datasets</dt><dd>{[...new Set(building.sourceDatasets)].join(', ')||'Not supplied'}</dd><dt>Building parts</dt><dd>{building.sourceParts.length} supplied render parts</dd><dt>Historical damage assessment</dt><dd>Unreviewed</dd><dt>Dated bomb incident</dt><dd>No linked evidence</dd></dl>
   <details><summary>Geometric overlap ({building.candidates.length})</summary>{building.candidates.length?building.candidates.map(c=><p key={c.id}>{c.id}: {(c.coverage*100).toFixed(1)}% of modern footprint; {(c.historicalCoverage*100).toFixed(1)}% of draft area; IoU {c.iou.toFixed(3)}.</p>):<p>No overlap with the available draft areas. This does not mean undamaged.</p>}</details>
   <button onClick={()=>onInspect(null)}>Clear selection</button>
  </section>:<p>Select or click a building. A modern building can contain multiple houses or units.</p>}
 </>;
});
