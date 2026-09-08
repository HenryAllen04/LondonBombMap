'use client';
import { useRef, useState } from 'react';
import { evaluateRegistration } from '@/lib/registration';
import template from '@/data/pimlico-registration.json';

function download(value,name){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function CalibrationCheck(){
 const dialog=useRef(null);
 const [result,setResult]=useState(()=>evaluateRegistration(template)),[error,setError]=useState(''),[fileName,setFileName]=useState('No measured landmarks imported');
 async function read(event){
  const file=event.target.files?.[0];if(!file)return;
  try {
   if(file.size>2_000_000)throw new Error('The landmark file must be smaller than 2 MB.');
   const data=JSON.parse(await file.text());
   const next=evaluateRegistration(data);setResult(next);setFileName(file.name);setError('');
  } catch(e){setResult(null);setError(e.message);setFileName('Import failed');}
  event.target.value='';
 }
 return <>
  <button className="island-check-button" onClick={()=>dialog.current.showModal()}>Check source alignment</button>
  <dialog ref={dialog} className="island-source-dialog island-calibration" aria-labelledby="calibration-title">
   <header><div><span className="island-kicker">PIMLICO / SOURCE VALIDATION</span><h2 id="calibration-title">Measure the alignment.</h2></div><button aria-label="Close alignment check" onClick={()=>dialog.current.close()}>×</button></header>
   <p>Use the original image's pixels and British National Grid coordinates (EPSG:27700). Keep at least 8 check landmarks separate from the 12 fitting landmarks. A low fitting error alone cannot establish accuracy.</p>
   <div className="island-calibration-actions"><button onClick={()=>download(template,'pimlico-registration-template.json')}>Download landmark template</button><label>Import landmark JSON<input type="file" accept=".json,application/json" onChange={read}/></label></div>
   <p>{fileName}. Files are processed in this browser.</p>
   {error&&<p role="alert">{error}</p>}
   {result&&<section aria-live="polite"><h3>{result.state==='registration-gate-met'?'Registration gate met; historical review still required':'Alignment is not yet validated'}</h3><p>{result.fitPoints} fitting points · {result.checkPoints} independent check points</p>
    <dl className="island-calibration-metrics"><dt>Fitting RMSE</dt><dd>{result.fit?`${result.fit.rmseMetres.toFixed(2)} m`:'Not measured'}</dd><dt>Held-out RMSE</dt><dd>{result.heldOut?`${result.heldOut.rmseMetres.toFixed(2)} m`:'Not measured'}</dd><dt>Held-out P95</dt><dd>{result.heldOut?`${result.heldOut.p95Metres.toFixed(2)} m`:'Not measured'}</dd><dt>Maximum check error</dt><dd>{result.heldOut?`${result.heldOut.maxMetres.toFixed(2)} m`:'Not measured'}</dd></dl>
    <ul>{result.blockers.map(text=><li key={text}>{text}</li>)}</ul>
    {!!result.residuals.length&&<details><summary>Landmark residuals</summary><table><thead><tr><th>Landmark</th><th>Role</th><th>Error (m)</th></tr></thead><tbody>{result.residuals.map(p=><tr key={p.id}><td>{p.id}</td><td>{p.role}</td><td>{p.errorMetres.toFixed(2)}</td></tr>)}</tbody></table></details>}
    <button className="island-check-button" onClick={()=>download(result,'pimlico-registration-result.json')}>Export check results</button>
   </section>}
   <p>This checks an imported calibration. The map continues to use the documented draft trace coordinates until the original image and reviewed trace data are updated together. A registration result does not verify a house identity or a bomb incident.</p>
  </dialog>
 </>;
}
