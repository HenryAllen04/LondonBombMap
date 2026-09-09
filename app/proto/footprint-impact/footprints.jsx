'use client';
import {useRef,useState} from 'react';
import {path,colour,area} from './geometry';

export default function Footprints({study,filter,onInspect}) {
  const [zoom,setZoom]=useState(1),[paper,setPaper]=useState(false),[outlines,setOutlines]=useState(true);
  const svg=useRef(null),[x0,y0,x1,y1]=study.bounds,cx=(x0+x1)/2,cy=(y0+y1)/2;
  const span=Math.max(x1-x0,y1-y0)*1.24/zoom;
  const matrix=[...study.matrix];matrix[4]-=study.centre[0];matrix[5]-=study.centre[1];
  const active=kind=>filter==='all'||filter===kind;
  function patch(coordinates,kind,category){
    if(!coordinates.length)return null;
    return <g key={`${kind}-${category}`} opacity={active(kind)?1:.1} onClick={()=>onInspect({kind,category,area:area(coordinates)})} className="impact-svg-patch">
      <path d={path(coordinates)} fill={colour(category)} fillOpacity={kind==='outside'?.3:1} fillRule="evenodd"/>
      {kind==='outside'&&<path d={path(coordinates)} fill="url(#impact-historic-hatch)" fillRule="evenodd" stroke={colour(category)} strokeWidth="1" vectorEffect="non-scaling-stroke"/>}
    </g>;
  }
  return <div className="impact-plan">
    <div className="impact-plan-toolbar"><label><input type="checkbox" checked={paper} onChange={e=>setPaper(e.target.checked)}/>Original paper</label><label><input type="checkbox" checked={outlines} onChange={e=>setOutlines(e.target.checked)}/>Modern outlines</label></div>
    <svg ref={svg} viewBox={`${cx-span/2} ${cy-span/2} ${span} ${span}`} role="img" aria-label="Plan comparison of historical damage and modern building footprints. Solid colour is overlap, hatching is outside the modern model, grey is unclassified modern area.">
      <defs><pattern id="impact-historic-hatch" width="2.1" height="2.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0V2.1" stroke="currentColor" strokeWidth=".32" opacity=".7"/></pattern><pattern id="impact-neutral-hatch" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".25" fill="currentColor" opacity=".55"/></pattern><clipPath id="impact-scope"><path d={path(study.scope)}/></clipPath></defs>
      <path d={path(study.scope)} className="impact-site-fill"/>
      {paper&&<image href={study.source.url} width={study.source.width} height={study.source.height} transform={`matrix(${matrix.join(' ')})`} opacity=".85"/>}
      <g clipPath="url(#impact-scope)">
        {study.fragments.map(f=>patch(f.outside,'outside',f.category))}
        <g opacity={active('neutral')?1:.12} onClick={()=>onInspect({kind:'neutral',area:study.metrics.neutral})} className="impact-svg-patch"><path d={path(study.parts.neutral)} fill="#c5c7be" fillRule="evenodd"/><path d={path(study.parts.neutral)} fill="url(#impact-neutral-hatch)" fillRule="evenodd"/></g>
        {study.fragments.map(f=>patch(f.overlap,'overlap',f.category))}
      </g>
      {outlines&&study.buildings.map(b=><path key={b.id} d={path(b.coordinates)} fill="none" stroke="#474d44" strokeWidth="2" fillRule="evenodd" vectorEffect="non-scaling-stroke" pointerEvents="none"/>)}
      <path d={path(study.scope)} fill="none" stroke="#77756a" strokeWidth="1" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    </svg>
    <div className="impact-plan-bottom"><span>North ↑<br/>Dashed line: trial site boundary</span><div className="impact-controls"><button aria-label="Zoom plan out" disabled={zoom<=.7} onClick={()=>setZoom(v=>Math.max(.7,v/1.2))}>−</button><button aria-label="Zoom plan in" disabled={zoom>=2.5} onClick={()=>setZoom(v=>Math.min(2.5,v*1.2))}>+</button><button onClick={()=>setZoom(1)}>Fit plan</button></div></div>
  </div>;
}
