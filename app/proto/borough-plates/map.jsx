"use client";
import { useEffect, useRef, useState } from 'react';
import polygonClipping from 'polygon-clipping';
import { damageAreas } from '@/lib/damage';
import { bounds, createMatcher } from './matching';

const match = createMatcher(damageAreas.features);
const pilot = {center:[-.141,51.489],zoom:16.6,pitch:56,bearing:-25};

export default function BoroughMap({ borough, controller, colours, category, minimumCoverage, onSelect, onStats, onCamera }) {
  const container=useRef(null), latest=useRef(null), [status,setStatus]=useState('Loading borough map…');
  latest.current={borough,colours,category,minimumCoverage,onSelect,onStats,onCamera};
  useEffect(()=>{
    let disposed=false,map,observer,refresh, lastSignature='';
    const timer=setTimeout(()=>{if(!disposed)setStatus('Map loading is delayed. Check your connection.');},20000);
    import('maplibre-gl').then(({Map,setWorkerUrl})=>{
      if(disposed)return;
      setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      map=new Map({container:container.current,style:'/map-style.json',...pilot,minZoom:9,maxZoom:19,maxPitch:65,attributionControl:false,canvasContextAttributes:{antialias:true}});
      controller.current={map,refresh:()=>refresh?.(),focus:focusBorough,pilot:()=>map.jumpTo(pilot)};
      function focusBorough(feature,overview=false){
        const b=bounds(feature.geometry);
        map.getSource('borough-outline')?.setData(feature);
        const world=[[[-.7,51.2],[.5,51.2],[.5,51.8],[-.7,51.8],[-.7,51.2]]];
        map.getSource('borough-mask')?.setData({type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:polygonClipping.difference(world,feature.geometry.coordinates)}});
        if(overview)map.fitBounds([[b.minX,b.minY],[b.maxX,b.maxY]],{padding:45,pitch:0,bearing:0,duration:0});
        else if(feature.properties.name==='Westminster')map.jumpTo(pilot);
        else map.jumpTo({center:[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2],zoom:15.5,pitch:56,bearing:-25});
      }
      map.on('error',()=>{if(!disposed)setStatus('Some map resources could not load. Retry if the map is incomplete.');});
      map.on('load',()=>{
        if(disposed)return;
        const before=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
        map.addLayer({id:'plate-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:14,paint:{'fill-extrusion-color':'#d9d5c8','fill-extrusion-height':['coalesce',['get','render_height'],8],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':1}},before);
        map.addSource('plate-matches',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        map.addLayer({id:'plate-colours',type:'fill-extrusion',source:'plate-matches',layout:{visibility:latest.current.colours?'visible':'none'},paint:{'fill-extrusion-color':['get','color'],'fill-extrusion-height':['get','height'],'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':1}},before);
        map.addSource('borough-outline',{type:'geojson',data:latest.current.borough});
        map.addSource('borough-mask',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
        map.addLayer({id:'borough-mask',type:'fill',source:'borough-mask',paint:{'fill-color':'#e8e5dc','fill-opacity':.92}});
        map.addLayer({id:'borough-outline',type:'line',source:'borough-outline',paint:{'line-color':'#7a7467','line-width':1.3,'line-dasharray':[3,2]}});
        refresh=()=>{
          if(disposed)return;
          const current=latest.current;
          const source=map.querySourceFeatures('openmaptiles',{sourceLayer:'building'});
          const signature=current.minimumCoverage+'|'+source.map(f=>JSON.stringify(f.geometry)).sort().join('|');
          if(signature===lastSignature)return;
          lastSignature=signature;
          const coloured=[],rows=[],seen=new Set();let ambiguous=0,partial=0,invalid=0;
          for(const f of source){
            if(!['Polygon','MultiPolygon'].includes(f.geometry.type))continue;
            const key=JSON.stringify(f.geometry);if(seen.has(key))continue;seen.add(key);
            let result;
            try {result=match(f.geometry,{minimumCoverage:current.minimumCoverage});}
            catch {invalid++;continue;}
            if(result.status==='ambiguous')ambiguous++;
            if(result.status==='partial')partial++;
            if(result.status==='candidate'){
              const best=result.candidates[0];
              const id='part-'+rows.length;
              const row={id,...result,geometry:f.geometry,tileFeatureId:f.id??null};
              rows.push(row);
              coloured.push({type:'Feature',geometry:f.geometry,properties:{...best,id,height:(Number(f.properties.render_height)||8)+.15,base:Number(f.properties.render_min_height)||0}});
            }
          }
          map.getSource('plate-matches').setData({type:'FeatureCollection',features:coloured});
          controller.current.rows=rows;
          current.onStats({candidates:rows.length,ambiguous,partial,invalid,rows});
        };
        map.on('idle',refresh);
        focusBorough(latest.current.borough);
        clearTimeout(timer);setStatus('');
      });
      map.on('move',()=>latest.current.onCamera({pitch:map.getPitch(),zoom:map.getZoom()}));
      map.on('click',e=>{
        if(!map.getLayer('plate-colours'))return;
        const hit=map.queryRenderedFeatures(e.point,{layers:['plate-colours']})[0];
        if(hit){latest.current.onSelect(controller.current.rows?.find(r=>r.id===hit.properties.id)??null);return;}
        const raw=map.queryRenderedFeatures(e.point,{layers:['plate-buildings']})[0];
        if(raw){try{latest.current.onSelect({...match(raw.geometry,{minimumCoverage:latest.current.minimumCoverage}),geometry:raw.geometry,tileFeatureId:raw.id??null});}catch{latest.current.onSelect({status:'invalid',candidates:[],reason:'This footprint could not be compared'});}}
        else latest.current.onSelect(null);
      });
      observer=new ResizeObserver(()=>map.resize());observer.observe(container.current);
    }).catch(()=>{if(!disposed)setStatus('The map could not start.');});
    return()=>{disposed=true;clearTimeout(timer);observer?.disconnect();map?.remove();controller.current=null;};
  },[controller]);
  useEffect(()=>{controller.current?.focus(borough);},[borough,controller]);
  useEffect(()=>{
    const m=controller.current?.map;if(!m?.getLayer('plate-colours'))return;
    m.setLayoutProperty('plate-colours','visibility',colours?'visible':'none');
    m.setFilter('plate-colours',category?['==',['get','category'],category]:null);
  },[colours,category,controller]);
  useEffect(()=>{controller.current?.refresh();},[minimumCoverage,controller]);
  return <><div ref={container} className="lb-map-engine" aria-label={`3D map of ${borough.properties.name}`}/>{status&&<div className="lb-map-status" role="status">{status}{!status.startsWith('Loading')&&<button onClick={()=>location.reload()}>Retry</button>}</div>}</>;
}
