'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,RotateCcw,RotateCw,Plus,Minus} from 'lucide-react';
import Today from './today';
import Ghosts from './ghosts';
import Compare from './compare';
import sample from './sample.json';
import '../borough-plates/system/tokens.css';
import '../bomb-sites/picker.css';
import './study.css';

const names=['Today','Ghosts','Compare'],modes=['today','ghosts','compare'],variants=[Today,Ghosts,Compare];
const appearance={palette:{background:'#dde2df',modelColour:'#eee8db'},form:{thickness:.1,lift:.75},camera:{tilt:67,bearing:11},surface:{buildingHeight:1,buildings:true,damageColours:false,mapDetails:true,labels:false,light:3.3,damageView:'areas'}};

export default function Harness({initial}){
 const [current,setCurrent]=useState(initial),[replay,setReplay]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[drag,setDrag]=useState('pan'),[selected,setSelected]=useState(null),[copied,setCopied]=useState('');
 const container=useRef(null),engine=useRef(null),picker=useRef(null),dialog=useRef(null),config=useRef({mode:modes[initial],mix:1,height:8,opacity:.25});
 const outputs=useRef({}),copyTimer=useRef(null);
 function update(values){Object.assign(config.current,values);engine.current?.setHistory(config.current);}
 function select(i){setSelected(null);engine.current?.inspect(null);setCurrent(i);setReplay(n=>n+1);update({mode:modes[i],mix:1});const url=new URL(location.href);url.searchParams.set('v',i+1);history.replaceState(null,'',url);}
 useEffect(()=>{
  const abort=new AbortController();let scene;setReady(false);setError('');
  const timer=setTimeout(()=>{setError('The local model did not load in time. Retry to load the saved geometry.');abort.abort();},60000);
  import('./scene').then(({createIsland})=>abort.signal.aborted?null:createIsland(container.current,'paper',{onReady:()=>{},onBuilding:setSelected,onSelect:()=>{},onCamera:()=>{}},abort.signal)).then(result=>{
   if(!result)return;scene=result;if(abort.signal.aborted){scene.dispose();return;}
   engine.current=scene;scene.apply(appearance);scene.setDragMode('pan');scene.focusSite();scene.setHistory(config.current);setReady(true);
  }).catch(e=>{if(!abort.signal.aborted)setError(e.message||'The 3D scene could not load.');}).finally(()=>clearTimeout(timer));
  return()=>{clearTimeout(timer);abort.abort();scene?.dispose();engine.current=null;};
 },[attempt]);
 useEffect(()=>()=>clearTimeout(copyTimer.current),[]);
 useLayoutEffect(()=>{
  function measure(){picker.current?.setAttribute('data-position',innerWidth<=720?'top':'bottom');const el=picker.current?.querySelector('[data-active]'),highlight=picker.current?.querySelector('.proto-picker-highlight');if(el&&highlight){highlight.style.width=el.offsetWidth+'px';highlight.style.transform=`translateX(${el.offsetLeft}px)`;}}
  measure();let second;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>picker.current?.setAttribute('data-ready',''));});window.addEventListener('resize',measure);
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);window.removeEventListener('resize',measure);};
 },[current]);
 useEffect(()=>{
  function keys(e){
   if(e.defaultPrevented||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey||dialog.current?.open)return;
   const n=Number(e.key);if(n>=1&&n<=3){e.preventDefault();select(n-1);}
   else if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&e.target.tagName!=='CANVAS'){e.preventDefault();select((current+(e.key==='ArrowRight'?1:2))%3);}
   else if(e.key.toLowerCase()==='r'){setReplay(n=>n+1);update({mix:1});}
  }
  document.addEventListener('keydown',keys);return()=>document.removeEventListener('keydown',keys);
 },[current]);
 function tune(key,value){update({[key]:value});outputs.current[key].textContent=key==='height'?`${value} m`:`${Math.round(value*100)}%`;}
 async function copy(){try{await navigator.clipboard.writeText(JSON.stringify(config.current,null,2));setCopied('Copied');}catch{setCopied('Copy unavailable');}clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(''),2000);}
 const Variant=variants[current];
 return <><main className="borough-study change-study">
  <header className="change-header"><a href="/"><ArrowLeft size={16}/> London Before</a><span>PIMLICO / A STUDY OF CHANGE</span><button onClick={()=>dialog.current.showModal()}>View the evidence ↗</button></header>
  <div className="change-workspace">
   <aside className="change-sidebar"><div><span className="change-eyebrow">CAMBRIDGE STREET / ALDERNEY STREET</span><h1>The same site.<br/>A different shape.</h1><p className="change-lead">A small experiment in seeing what used to stand beneath the map.</p></div>
    <Variant key={`${current}-${replay}`} onMix={mix=>update({mix})}/>
    <div className="change-evidence"><strong>Approximate historical layout</strong><p>Two terrace envelopes from the wartime sheet. Placement and heights remain unverified; these are not individual houses.</p><button onClick={()=>dialog.current.showModal()}><img src={sample.sourceImage} alt="Pimlico's original wartime bomb damage sheet" width="1067" height="672"/><span>Open the original sheet ↗</span></button></div>
   </aside>
   <section className="change-map" aria-label="Pimlico buildings comparison">
    <div className="change-canvas" ref={container}/>
    <div className="change-map-title"><span className="change-eyebrow">ONE SITE / THE SAME VIEWPOINT</span><strong>{current===0?'Present-day buildings':current===1?'Earlier outlines + today’s buildings':'Historical layout ↔ today'}</strong></div>
    <details className="change-tuning"><summary>Tune comparison</summary><label>Illustrative terrace height <output ref={el=>outputs.current.height=el}>8 m</output><input aria-label="Illustrative terrace height" type="range" min="0" max="20" step="1" defaultValue="8" onChange={e=>tune('height',Number(e.target.value))}/></label><label>Modern opacity in Ghosts <output ref={el=>outputs.current.opacity=el}>25%</output><input aria-label="Modern opacity in Ghosts" type="range" min="0" max="1" step=".05" defaultValue=".25" onChange={e=>tune('opacity',Number(e.target.value))}/></label><button onClick={copy}>{copied||'Copy comparison settings'}</button></details>
    <div className="change-map-bottom"><div className="change-legend"><span><i/> Modern buildings</span>{current>0&&<span><i className="historical"/> Historical envelopes</span>}<small>Dashed boundary: study site</small></div><div className="change-navigation"><button aria-label="Rotate left" disabled={!ready} onClick={()=>engine.current.rotate(-20)}><RotateCcw size={16}/></button><button aria-label="Rotate right" disabled={!ready} onClick={()=>engine.current.rotate(20)}><RotateCw size={16}/></button><button aria-label="Zoom out" disabled={!ready} onClick={()=>engine.current.zoom(1.2)}><Minus size={16}/></button><button aria-label="Zoom in" disabled={!ready} onClick={()=>engine.current.zoom(1/1.2)}><Plus size={16}/></button><button disabled={!ready} onClick={()=>engine.current.focusSite()}>Reset view</button></div></div>
    <div className="change-drag"><button aria-pressed={drag==='pan'} disabled={!ready} onClick={()=>{setDrag('pan');engine.current.setDragMode('pan');}}>Pan</button><button aria-pressed={drag==='orbit'} disabled={!ready} onClick={()=>{setDrag('orbit');engine.current.setDragMode('orbit');}}>Orbit</button><small>Scroll to zoom · click a modern building to inspect</small></div>
    {!ready&&!error&&<div className="change-loading" role="status">Loading the saved Pimlico model…</div>}
    {error&&<div className="change-loading" role="alert"><p>{error}</p><button onClick={()=>{setDrag('pan');setAttempt(n=>n+1);}}>Retry model</button></div>}
    {selected&&<aside className="change-inspector"><button aria-label="Close building details" onClick={()=>{setSelected(null);engine.current.inspect(null);}}>×</button><strong>{selected.name||'Modern building'}</strong><p>{selected.height.toFixed(1)} m · {selected.heightSource}</p><small>Modern identity only. Historical correspondence is unreviewed.</small></aside>}
   </section>
  </div>
  <footer className="change-footer"><p><a href="https://docs.overturemaps.org/attribution/">Overture · ODbL</a> / <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> / <a href="https://data.london.gov.uk/dataset/london-boroughs-e55pw">GLA / OS · OGL v3</a> · Context via OpenFreeMap</p><p>Historical source © The London Archives (City of London) · 1940–1945 cumulative damage</p></footer>

  <dialog className="change-dialog" ref={dialog} aria-labelledby="change-source-title"><header><h2 id="change-source-title">The original terrace layout.</h2><button aria-label="Close evidence" onClick={()=>dialog.current.close()}>×</button></header><img src={sample.sourceImage} alt="The two dark-coloured terrace rows between Cambridge Street and Alderney Street, near the centre of Sheet 88" width="1067" height="672"/><p>{sample.method}</p><p>Teal identifies historical geometry in this experiment; it is not a damage category. The 8 m default height is illustrative. The Victorian footprint dataset was not used.</p><a href={sample.source} target="_blank" rel="noreferrer">Sheet 88 · The London Archives ↗</a><p>Image © The London Archives (City of London). Private reference served in local development.</p></dialog>
 </main>
  <nav ref={picker} className="proto-picker" aria-label="Prototype variants"><span className="proto-picker-highlight" aria-hidden="true"/>{names.map((name,i)=><button key={name} className="proto-picker-item" data-active={current===i?'':undefined} aria-current={current===i?'true':undefined} onClick={()=>select(i)}>{name}</button>)}</nav>
 </>;
}
