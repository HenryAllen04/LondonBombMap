'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {applyMatrix,invertMatrix,overlayMatrix,toPlane} from '@/lib/map-overlay';
import {COLOUR_CLASSES} from '@/lib/map-colours';
export default function SheetExtraction({image,config,definition}){
 const worker=useRef(null),[progress,setProgress]=useState(null),[result,setResult]=useState(null),[error,setError]=useState('');
 const basis=JSON.stringify({model:config.model,points:config.points,adjustment:config.adjustment,selection:config.selection,minPatch:config.colours?.minPatch??3});
 const stale=result&&result.basis!==basis;
 const preview=useMemo(()=>{if(!result)return [];const alignment=result.artifact.metadata.alignment,inverse=invertMatrix(overlayMatrix(alignment,alignment.pivot));return result.artifact.features.filter(f=>f.properties.category!=='excluded').map(f=>({id:f.id,colour:COLOUR_CLASSES.find(c=>c.id===f.properties.category).colour,path:f.geometry.coordinates.flatMap(p=>p.map(r=>r.map((point,i)=>`${i?'L':'M'}${applyMatrix(inverse,toPlane(point)).join(',')}`).join(' ')+'Z')).join(' ')}));},[result]);
 useEffect(()=>()=>worker.current?.terminate(),[]);
 function cancel(){worker.current?.terminate();worker.current=null;setProgress(null);}
 function start(){
  cancel();setError('');setResult(null);setProgress({phase:'Preparing source',completed:0,total:1});
  try{
   const canvas=document.createElement('canvas');canvas.width=definition.source.width;canvas.height=definition.source.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data.buffer;
   const w=new Worker(new URL('./sheet-worker.js',import.meta.url));worker.current=w;
   w.onmessage=({data})=>{if(data.progress)setProgress(data.progress);if(data.error){setError(data.error);cancel();}if(data.artifact){setResult({artifact:data.artifact,basis});cancel();}};
   w.onerror=e=>{setError(e.message||'The full-sheet extraction failed.');cancel();};
   w.postMessage({rgba,config:{model:config.model,points:config.points,adjustment:config.adjustment,selection:config.selection,colours:{minPatch:config.colours?.minPatch??3}},definition},[rgba]);
  }catch(e){setError(e.message);cancel();}
 }
 function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(result.artifact)],{type:'application/geo+json'})),a=document.createElement('a');a.href=url;a.download='pimlico-full-sheet-colours.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <details className="sheet-extraction"><summary>Whole-sheet extraction <span>All six colours · background processing</span></summary><p>Extract the full image as historical regions before linking buildings. This uses the automatic palette and minimum patch size; local brush corrections and samples are not applied.</p><p>The saved alignment has only been assessed locally. Coordinates beyond that area are extrapolated and need additional checks. The black backing and sheet margins are excluded using the source’s map frame. Lettering and faded colours still need review.</p><div className="site-actions"><button disabled={!image||!!progress} onClick={start}>Extract full sheet</button>{progress&&<button onClick={cancel}>Cancel extraction</button>}{result&&<button onClick={download} disabled={stale}>Download full-sheet GeoJSON</button>}</div>{progress&&<p role="status">{progress.phase} · {Math.round(progress.completed/progress.total*100)}%</p>}{error&&<p role="alert">{error}</p>}{result&&<p role="status">{stale?'Settings changed. Extract again before downloading.':`${result.artifact.features.length.toLocaleString()} regions ready. Your selected-area alignment and site links are unchanged.`}</p>}{result&&!stale&&<svg className="sheet-extraction-preview" viewBox={`0 0 ${definition.source.width} ${definition.source.height}`} role="img" aria-label="Full-sheet historical colour preview"><image href={definition.source.url} width={definition.source.width} height={definition.source.height} opacity=".35"/>{preview.map(f=><path key={f.id} d={f.path} fill={f.colour} fillRule="evenodd"/>)}</svg>}</details>;
}
