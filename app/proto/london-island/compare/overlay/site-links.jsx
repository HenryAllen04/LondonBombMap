'use client';
import {COLOUR_CLASSES} from '@/lib/map-colours';

export default function SiteLinks({draft,setDraft,selected,sites,artifact,onSites,onPreview}){
 const active=sites.find(s=>s.targets.includes(selected?.id));
 const result=artifact?.features.find(f=>f.id===active?.id)?.properties;
 function update(patch){onSites(sites.map(s=>s.id===active.id?{...s,...patch}:s),{label:'site details',group:('note' in patch||'name' in patch)?`site-${active.id}`:null});}
 function start(site){setDraft(site?{...site,boundary:[],review:'draft'}:{id:crypto.randomUUID(),name:`${selected.properties.name} site`,boundary:[],targets:[selected.id],relationship:selected.properties.relationship==='rebuilt-site'?'rebuilt-site':'uncertain',review:'draft',note:''});}
 function finish(){if(onSites([...sites.filter(s=>s.id!==draft.id),draft],{label:'historical site link'})){setDraft(null);onPreview('colours');}}
 return <section className="site-links" aria-label="Historical site links">
  <div className="site-heading"><h3>Historical site → modern building</h3>{!draft&&selected&&!active&&<button onClick={()=>start()}>Link historical site</button>}</div>
  {!draft&&!active&&<p>{selected?'Draw the historical site around the old rows and link it to this modern building. Every detected damage colour within the boundary stays available.':'Click a modern building to link the historical site it replaced. A site can contain old rows and former open space.'}</p>}
  {draft&&<>
   <p><strong>Click corners on the left paper to enclose the historical site.</strong> Include the old rows and replacement footprint; keep neighbouring sites outside. Click buildings on the right to include or remove targets.</p>
   <label>Site name<input value={draft.name} maxLength={160} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
   <p>{draft.boundary.length} corners · {draft.targets.length} linked buildings</p>
   <div className="site-actions"><button disabled={!draft.boundary.length} onClick={()=>setDraft({...draft,boundary:draft.boundary.slice(0,-1)})}>Undo corner</button><button onClick={()=>setDraft(null)}>Cancel boundary</button><button className="sheet-primary" disabled={draft.boundary.length<3||!draft.targets.length||!draft.name.trim()} onClick={finish}>Create site link</button></div>
  </>}
  {!draft&&active&&<>
   <div className="site-fields"><label>Site name<input value={active.name} maxLength={160} onChange={e=>update({name:e.target.value,review:'draft'})}/></label><label>Relationship<select value={active.relationship} onChange={e=>update({relationship:e.target.value,review:'draft'})}><option value="rebuilt-site">Rebuilt site</option><option value="surviving-site">Surviving buildings</option><option value="uncertain">Relationship uncertain</option></select></label></div>
   <p><strong>{active.review==='checked'?'Checked site link':'Draft site link'}</strong> · {active.targets.length} modern buildings. Colours describe this historical site; stripes do not locate the original damage on today’s building.</p>
   <ul className="site-colours" aria-label="All site damage colours">{COLOUR_CLASSES.map(c=><li key={c.id}><i style={{background:c.colour}}/><span>{c.name}</span><strong>{((result?.categories.find(v=>v.category===c.id)?.coverage??0)*100).toFixed(1)}%</strong></li>)}</ul>
   <p>{((result?.unclassifiedCoverage??0)*100).toFixed(1)}% unclassified · {((result?.excludedCoverage??0)*100).toFixed(1)}% excluded. Percentages use the site boundary, not the modern footprint. No detected colour is removed by the building mixed-share threshold.</p>
   <label>Evidence for the site link<textarea maxLength={2000} value={active.note} placeholder="Describe how the old rows and replacement relate, and the source you checked." onChange={e=>update({note:e.target.value,review:'draft'})}/></label>
   <div className="site-actions"><button disabled={!active.note.trim()||active.review==='checked'} onClick={()=>update({review:'checked'})}>Mark site link checked</button><button onClick={()=>start(active)}>Redraw site boundary</button><button onClick={()=>onSites(sites.filter(s=>s.id!==active.id),{label:'remove site link'})}>Remove site link</button></div>
  </>}
  {!!sites.length&&<p>{sites.length} site {sites.length===1?'link':'links'} saved with the colour configuration. Select a linked building to edit its site. Undo restores removed links.</p>}
 </section>;
}
