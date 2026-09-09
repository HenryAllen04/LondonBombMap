'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Download,RotateCcw,RotateCw,Plus,Minus,X} from 'lucide-react';
import {newColours,generateMask,encodeMask} from '@/lib/map-colours';
import {makeStudy,exportStudy,fmt,colour} from './geometry';
import Current from './current';
import Footprints from './footprints';
import Fragments from './fragments';
import Layers from './layers';
import './picker.css';
import './impact.css';

const names=['Current','Footprints','Fragments','Layers'];
const descriptions=['The existing model, on the same evidence.','Read the exact footprint comparison.','Historic damage on the ground and today’s roofs.','Separate the three parts without moving their footprints.'];
const layerNames={overlap:'Damage over a modern footprint',outside:'Damage outside today’s model',neutral:'Modern area without classified damage'};

function SourceCrop({source,site,className}) {
  const xs=site.boundary.map(p=>p[0]),ys=site.boundary.map(p=>p[1]),x=Math.min(...xs)-10,y=Math.min(...ys)-10,w=Math.max(...xs)-x+10,h=Math.max(...ys)-y+10;
  return <svg className={className} viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label="Original wartime paper around the Russell House trial site"><image href={source.url} width={source.width} height={source.height}/><polygon points={site.boundary.map(p=>p.join(',')).join(' ')} fill="none" stroke="#fffae4" strokeWidth=".6" strokeDasharray="2 1"/></svg>;
}

export default function Harness({initial,config,definition,site,index}) {
  const [current,setCurrent]=useState(initial),[replay,setReplay]=useState(0),[study,setStudy]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[sceneError,setSceneError]=useState(''),[ready,setReady]=useState(false),[filter,setFilter]=useState('all'),[inspected,setInspected]=useState(null),[copied,setCopied]=useState('');
  const picker=useRef(null),dialog=useRef(null),host=useRef(null),engine=useRef(null),settings=useRef({gap:24,opacity:1}),latest=useRef(null),copyTimer=useRef(null);
  latest.current={mode:current===3?'layers':'fragments',filter,...settings.current};

  useEffect(()=>{
    const controller=new AbortController();let cancelled=false;
    const timeout=setTimeout(()=>controller.abort(new Error('The original paper did not load within 30 seconds.')),30000);
    setError('');setStudy(null);
    async function load(){
      let working=structuredClone(config);
      if(!working.colours){
        const response=await fetch(definition.source.url,{signal:controller.signal});
        if(!response.ok)throw new Error('The original paper is unavailable. Open the local source in the evidence panel, then retry.');
        const bitmap=await createImageBitmap(await response.blob());
        const c=newColours(working.selection,index.fingerprints);c.automatic={version:1};
        const {x,y,width,height}=c.grid,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,x,y,width,height,0,0,width,height);bitmap.close();
        c.runs=encodeMask(generateMask(ctx.getImageData(0,0,width,height).data,c,definition.exclusions));working.colours=c;
      }
      if(cancelled)return;
      if(site.sourceImageSha256!==definition.source.sha256)throw new Error('The study boundary belongs to a different source image.');
      const r=working.selection;
      if(site.boundary.some(p=>p[0]<r.x||p[0]>r.x+r.width||p[1]<r.y||p[1]>r.y+r.height))throw new Error('The saved selection no longer contains the Russell House trial site. Restore the study selection in the alignment tool.');
      const next=makeStudy(working,definition,index,site);if(!cancelled)setStudy(next);
    }
    load().catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>clearTimeout(timeout));
    return()=>{cancelled=true;clearTimeout(timeout);controller.abort();};
  },[config,definition,index,site,attempt]);

  useEffect(()=>{
    if(!study)return;
    let cancelled=false,scene;setReady(false);setSceneError('');
    import('./scene').then(({createScene})=>{if(cancelled)return;scene=createScene(host.current,study,setInspected);engine.current=scene;scene.update(latest.current);scene.fit();setReady(true);}).catch(e=>{if(!cancelled)setSceneError(e.message);});
    return()=>{cancelled=true;scene?.dispose();engine.current=null;};
  },[study]);
  useEffect(()=>{engine.current?.update(latest.current);},[current,filter]);
  useEffect(()=>()=>clearTimeout(copyTimer.current),[]);

  function select(i){setCurrent(i);setReplay(v=>v+1);setInspected(null);setFilter('all');const url=new URL(location.href);url.searchParams.set('v',i+1);history.replaceState(null,'',url);}
  useLayoutEffect(()=>{
    function measure(){const el=picker.current?.querySelector('[data-active]'),highlight=picker.current?.querySelector('.proto-picker-highlight');if(el&&highlight){highlight.style.width=el.offsetWidth+'px';highlight.style.transform=`translateX(${el.offsetLeft}px)`;}}
    measure();let second;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>picker.current?.setAttribute('data-ready',''));});window.addEventListener('resize',measure);
    return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);window.removeEventListener('resize',measure);};
  },[current]);
  useEffect(()=>{
    function keys(e){
      if(e.defaultPrevented||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey||dialog.current?.open)return;
      const n=Number(e.key);if(n>=1&&n<=4){e.preventDefault();select(n-1);}
      else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.target.tagName!=='CANVAS'){e.preventDefault();select((current+(e.key==='ArrowRight'?1:3))%4);}
      else if(e.key.toLowerCase()==='r'){setReplay(v=>v+1);setInspected(null);setFilter('all');}
    }
    document.addEventListener('keydown',keys);return()=>document.removeEventListener('keydown',keys);
  },[current]);

  function tune(key,value,e){settings.current[key]=value;engine.current?.update({[key]:value});e.target.parentElement.querySelector('output').textContent=key==='gap'?`${value} m`:`${Math.round(value*100)}%`;}
  async function copy(){try{await navigator.clipboard.writeText(JSON.stringify({variant:names[current],...settings.current},null,2));setCopied('Copied');}catch{setCopied('Clipboard unavailable');}clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(''),2000);}
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(exportStudy(study),null,2)],{type:'application/geo+json'})),a=document.createElement('a');a.href=url;a.download='russell-house-footprint-impact.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const metrics=study?.metrics,share=metrics?.history?metrics.outside/metrics.history:0;

  return <><main className="lb-app impact-study">
    <header className="impact-header"><a href="/proto/london-island/compare/overlay"><ArrowLeft size={16}/><span>London Before</span></a><span className="impact-eyebrow">PIMLICO / FOOTPRINT STUDY</span><button onClick={()=>dialog.current.showModal()}>Evidence & method <ArrowUpRight size={16}/></button></header>
    <div className="impact-heading"><div><span className="impact-eyebrow">1940–1945 × TODAY</span><h1>Where the footprints diverge.</h1></div><p>The damage belongs to a place. <br/>Today’s building may have a different shape.</p></div>
    <div className="impact-workspace">
      <aside className="impact-sidebar">
        <div className="impact-site-title"><span className="impact-eyebrow">ONE SITE / FOUR WAYS TO READ IT</span><strong>Russell House</strong><span>Cambridge Street · Alderney Street</span></div>
        <div key={`${current}-${replay}`}>
          {current===0?<div className="impact-direction"><span className="impact-eyebrow">01 / CURRENT BASELINE</span><h2>What the model <br/>leaves out.</h2><p>The existing preview displays the paper’s colours on modern building objects. Evidence outside those objects disappears.</p><p className="impact-explanation">Switch views below to bring that missing evidence back into the same scene.</p></div>:current===1?<div className="impact-direction"><span className="impact-eyebrow">02 / FOOTPRINT COMPARISON</span><h2>Find the shared <br/>ground first.</h2><p>Compare the two shapes from above. Solid colour marks the intersection; stripes preserve damage outside today’s footprint.</p><p className="impact-explanation">Turn on the original paper to inspect the alignment. The outline is the modern model, not a historic property boundary.</p></div>:current===2?<Fragments/>:<Layers/>}
        </div>
        <div className="impact-finding" aria-live="polite"><strong>{study?`${Math.round(share*100)}%`:'—'}</strong><p>of classified damage in this trial site falls <b>outside</b> the loaded modern footprints.</p><small>Area share under the saved alignment</small></div>
        <button className="impact-source-button" aria-label="Read the original paper" onClick={()=>dialog.current.showModal()}><SourceCrop source={definition.source} site={site}/><span>Read the original paper <ArrowUpRight size={14}/></span></button>
      </aside>
      <section className="impact-stage" aria-label="Footprint impact comparison">
        <div className="impact-stage-heading"><div><span className="impact-eyebrow">{current===1?'PLAN VIEW':current===3?'EXPLODED VIEW':'PERSPECTIVE VIEW'}</span><strong>{descriptions[current]}</strong></div><span className="impact-draft">Provisional alignment</span></div>
        <div className="impact-view">
          {study&&current===0&&<Current key={replay} study={study} onInspect={setInspected}/>}
          {study&&current===1&&<Footprints key={replay} study={study} filter={filter} onInspect={setInspected}/>}
          <div className="impact-scene" ref={host} style={{visibility:current>=2?'visible':'hidden'}} inert={current<2}/>
          {current>=2&&study&&<>
            <div className="impact-scene-caption"><span>{current===3?'01 Ground · 02 Overlap · 03 Unclassified':'Striped ground + coloured roofs'}</span><small>{current===3?'Separation is illustrative; plan coordinates are unchanged.':'Roof colours are a counterfactual projection of the paper.'}</small></div>
            <div className="impact-navigation"><span>Drag to orbit · scroll to zoom</span><div className="impact-controls"><button disabled={!ready} aria-label="Rotate model left" onClick={()=>engine.current.rotate(-20)}><RotateCcw size={16}/></button><button disabled={!ready} aria-label="Rotate model right" onClick={()=>engine.current.rotate(20)}><RotateCw size={16}/></button><button disabled={!ready} aria-label="Zoom model out" onClick={()=>engine.current.zoom(1.2)}><Minus size={16}/></button><button disabled={!ready} aria-label="Zoom model in" onClick={()=>engine.current.zoom(1/1.2)}><Plus size={16}/></button><button disabled={!ready} onClick={()=>engine.current.fit(true)}>Top view</button><button disabled={!ready} onClick={()=>engine.current.fit()}>Fit model</button></div></div>
            {sceneError&&<div className="impact-loading" role="alert">3D unavailable: {sceneError}.<button onClick={()=>select(1)}>Open the 2D footprints</button></div>}
            {!ready&&!sceneError&&<div className="impact-loading" role="status">Preparing the three geometry layers…</div>}
          </>}
          {!study&&<div className="impact-loading" role={error?'alert':'status'}>{error?<><strong>The study could not load.</strong><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>Retry study</button></>:<><strong>Finding the intersections…</strong><span>Reading the saved alignment and original damage colours.</span></>}</div>}
          {inspected&&<div className="impact-inspector" role="status"><button aria-label="Close fragment details" onClick={()=>setInspected(null)}><X size={16}/></button><span className="impact-eyebrow">{inspected.baseline?'CURRENT DISPLAY':'SELECTED PART'}</span><strong>{layerNames[inspected.kind]}</strong><p>{inspected.category&&study?.classes.find(c=>c.id===inspected.category)?.label}{inspected.area!=null&&` · ${fmt(inspected.area)} m² of plan area`}</p><small>{inspected.kind==='neutral'?'No classified damage is not evidence of no damage.':inspected.kind==='outside'?'A possible missing historic footprint. Colour alone does not establish an original building.':'Shared ground does not establish that the same building survived.'}</small></div>}
        </div>
        <div className="impact-layer-row" role="group" aria-label="Inspect footprint layers"><button className="impact-show-all" aria-pressed={filter==='all'} disabled={current===0||!study} onClick={()=>{setFilter('all');setInspected(null);}}>All parts</button>{[['overlap','Shared ground','solid'],['outside','Outside modern','striped'],['neutral','No classified damage','dotted']].map(([id,name,pattern])=><button key={id} aria-pressed={filter===id} disabled={current===0||!study} onClick={()=>{setFilter(filter===id?'all':id);setInspected({kind:id,area:metrics[id]});}}><i className={pattern}/><span>{name}<small>{study?`${fmt(metrics[id])} m²`:'—'}</small></span></button>)}</div>
      </section>
    </div>
    <div className="impact-notes"><div><span className="impact-eyebrow">DAMAGE COLOURS / CUMULATIVE WARTIME RECORD</span><div className="impact-legend">{study?.classes.map(c=><span key={c.id}><i style={{background:c.colour}}/>{c.name} · {c.label}</span>)}</div></div><p>Draft colour regions, not verified historical footprints. Roof heights follow the modern model; Russell House uses its illustrative 8 m fallback. No blast simulation.</p></div>
    <footer className="impact-footer"><span>Historical source © The London Archives (City of London) · <a href="https://docs.overturemaps.org/attribution/">Overture</a> / <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a></span><button disabled={!study} onClick={download}><Download size={14}/> Download the parts</button></footer>
    {current>=2&&<details className="impact-tuning"><summary>Tune view</summary><label>Layer separation <output>{settings.current.gap} m</output><input aria-label="Layer separation" type="range" min="0" max="50" step="1" disabled={current!==3} defaultValue={settings.current.gap} onInput={e=>tune('gap',Number(e.target.value),e)}/></label><label>Neutral building opacity <output>{Math.round(settings.current.opacity*100)}%</output><input aria-label="Neutral building opacity" type="range" min=".05" max="1" step=".05" defaultValue={settings.current.opacity} onInput={e=>tune('opacity',Number(e.target.value),e)}/></label><button onClick={copy}>{copied||'Copy view settings'}</button></details>}
    <dialog ref={dialog} className="impact-evidence" aria-labelledby="impact-evidence-title"><header><div><span className="impact-eyebrow">SOURCE / METHOD / LIMITS</span><h2 id="impact-evidence-title">Same coordinates. Different footprints.</h2></div><button aria-label="Close evidence" onClick={()=>dialog.current.close()}><X size={20}/></button></header><SourceCrop source={definition.source} site={site}/><div className="impact-evidence-copy"><p>The source colours are intersected with the union of modern footprints inside the existing Russell House trial boundary. Shared ground is projected onto the corresponding modern roof pieces; colour outside the modern union remains on the ground. Modern area with no classified colour stays neutral.</p><p>These are detected damage regions, <b>not verified historical building outlines</b>. An outside region may indicate a vanished building, but alignment error, ink extraction, or missing modern data can also cause a mismatch. The paper records cumulative damage, not individual impact points. The separated view adds display offsets, not reconstructed historical heights.</p><p>The saved alignment reports {config.artifact?.metadata.checks.count??0} check landmarks and {config.artifact?.metadata.checks.rmseMetres?.toFixed(1)??'unmeasured'} m RMS residual. Those landmarks are manual estimates, not an independent accuracy benchmark. No controls in this exploration save over the alignment or colouring tool.</p><p>Modern release: {index.release}. {study?.pieces.filter(p=>p.height.source?.includes('fallback')).length??'—'} model pieces use illustrative fallback heights. Watermarked areas remain excluded from classified damage.</p><a href="https://www.londonpicturearchive.org.uk/view-item?i=343662" target="_blank" rel="noreferrer">LCC Sheet 88 · The London Archives ↗</a><a href={definition.source.url} target="_blank" rel="noreferrer">Open the supplied source image ↗</a><a href="/proto/london-island/compare/overlay">Open the alignment and colour workspace ↗</a></div></dialog>
  </main><nav className="proto-picker" aria-label="Prototype variants" ref={picker}><span className="proto-picker-highlight" aria-hidden="true"/>{names.map((name,i)=><button className="proto-picker-item" key={name} data-active={i===current?'':undefined} aria-current={i===current?'true':undefined} onClick={()=>select(i)}>{name}</button>)}</nav></>;
}
