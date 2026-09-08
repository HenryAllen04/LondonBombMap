import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import polygonClipping from 'polygon-clipping';
import { writeFile } from 'node:fs/promises';
const meta=await fetch('https://tiles.openfreemap.org/planet').then(r=>r.json());
const template=meta.tiles[0];
function tile(lon,lat,z){return [Math.floor((lon+180)/360*2**z),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z)];}
const round=(v)=>Array.isArray(v)?v.map(round):Math.round(v*1e6)/1e6;
async function capture(box,z,layers){
 const [x0,y0]=tile(box[0],box[3],z),[x1,y1]=tile(box[2],box[1],z),jobs=[];
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)jobs.push([x,y]);
 const features=[];
 // Four requests at a time, and only the bounded London/pilot tiles.
 for(let n=0;n<jobs.length;n+=4){
  await Promise.all(jobs.slice(n,n+4).map(async([x,y])=>{
   const url=template.replace('{z}',z).replace('{x}',x).replace('{y}',y);
   const response=await fetch(url);if(!response.ok)throw new Error(`${response.status}: ${url}`);
   const tileData=new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer())));
   for(const name of layers){const layer=tileData.layers[name];if(!layer)continue;
    for(let i=0;i<layer.length;i++){
     const f=layer.feature(i).toGeoJSON(x,y,z);
     if(name==='transportation' && ['path','track','service','rail','transit','ferry'].includes(f.properties.class))continue;
     const [west,south,east,north]=box;
     const inside=([x,y])=>x>=west&&x<=east&&y>=south&&y<=north;
     if(['Polygon','MultiPolygon'].includes(f.geometry.type)){
      const clip=polygonClipping.intersection(f.geometry.coordinates,[[[west,south],[east,south],[east,north],[west,north],[west,south]]]);
      if(!clip.length)continue;
      f.geometry={type:'MultiPolygon',coordinates:clip};
     }else if(['LineString','MultiLineString'].includes(f.geometry.type)){
      const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
      // Keep nearby linework; the borough mesh clips its display at the physical edge.
      const visible=lines.filter(line=>line.some(inside));if(!visible.length)continue;
      f.geometry={type:'MultiLineString',coordinates:visible};
     }
     if(z===11){
      const simplify=ring=>ring.filter((p,i)=>i===0||i===ring.length-1||Math.hypot(p[0]-ring[i-1][0],p[1]-ring[i-1][1])>.00004);
      if(f.geometry.type==='MultiLineString')f.geometry.coordinates=f.geometry.coordinates.map(simplify);
     }
     f.geometry.coordinates=round(f.geometry.coordinates);
     f.properties={layer:name,class:f.properties.class,name:f.properties.name,height:f.properties.render_height,base:f.properties.render_min_height,tile:`${z}/${x}/${y}`,id:f.id};
     features.push(f);
    }
   }
  }));
 }
 return {type:'FeatureCollection',source:template,captured:new Date().toISOString(),bbox:box,features};
}
const context=await capture([-.515,51.28,.335,51.695],11,['water','landcover','park','transportation']);
await writeFile('public/proto/london-island/context.json',JSON.stringify(context));
console.log('London context',context.features.length);
const detail=await capture([-.155,51.482,-.125,51.502],14,['building','water','park','transportation']);
await writeFile('public/proto/london-island/pimlico.json',JSON.stringify(detail));
console.log('Pimlico detail',detail.features.length);
