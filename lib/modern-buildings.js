import polygonClipping from 'polygon-clipping';
import { polygons } from './pimlico-pilot.js';

// Canonicalise ring direction and start vertex so source ordering does not change keys.
function canonicalRing(ring) {
  const points=ring.slice(0,-1).map(p=>p.map(n=>Number(n.toFixed(7))));
  if(!points.length)throw new Error('Empty building ring');
  const variants=[points,[...points].reverse()].map(items=>{
    let first=0;
    for(let i=1;i<items.length;i++)if(items[i][0]<items[first][0]||(items[i][0]===items[first][0]&&items[i][1]<items[first][1]))first=i;
    return JSON.stringify([...items.slice(first),...items.slice(0,first)]);
  });
  return variants.sort()[0];
}
export function geometryKey(rings) {
  const text=[canonicalRing(rings[0]),...rings.slice(1).map(canonicalRing).sort()].join('|');
  let hash=14695981039346656037n;
  for(let i=0;i<text.length;i++){hash^=BigInt(text.charCodeAt(i));hash=BigInt.asUintN(64,hash*1099511628211n);}
  return hash.toString(16).padStart(16,'0');
}
export function buildingHeight(properties) {
  const base=Number.isFinite(properties.min_height)&&properties.min_height>=0?properties.min_height:0;
  if(Number.isFinite(properties.height)&&properties.height>0)return {base,height:properties.height,top:base+properties.height,source:'Source height (not independently surveyed)'};
  if(Number.isFinite(properties.num_floors)&&properties.num_floors>0){const height=properties.num_floors*3;return {base,height,top:base+height,source:'Estimated: 3 m per source floor'};}
  return {base,height:8,top:base+8,source:'Illustrative 8 m fallback'};
}

export function prepareModernBuildings(collection, region) {
  const records=[],seen=new Set();
  for(const f of collection.features){
    const p=f.properties;
    if(p.type!=='building'||p.is_underground===true)continue;
    if(typeof p.id!=='string'||!p.id)throw new Error('Modern building is missing its source ID');
    if(seen.has(p.id))throw new Error(`Duplicate modern building ID: ${p.id}`);
    seen.add(p.id);
    for(const rings of polygons(f.geometry)){
      const coordinates=polygonClipping.intersection([rings],polygons(region.geometry));
      if(!coordinates.length)continue;
      const fullGeometry={type:'Polygon',coordinates:rings};
      const clipped=JSON.stringify(coordinates)!==JSON.stringify(polygonClipping.union([rings]));
      const componentId=`overture:${p.id}:${geometryKey(rings)}`;
      records.push({type:'Feature',id:componentId,geometry:{type:'MultiPolygon',coordinates},matchGeometry:fullGeometry,
        properties:{id:componentId,buildingId:p.id,version:p.version,sourceName:p.names?.primary??null,sources:p.sources??[],hasParts:p.has_parts===true,
          clipped,height:buildingHeight(p),release:collection.release,identity:'Modern building record; historical correspondence unverified'}});
    }
  }
  return records.sort((a,b)=>a.id.localeCompare(b.id));
}

export function buildingPieces(building, collection) {
  const parts=collection.features.filter(f=>f.properties.type==='building_part'&&f.properties.building_id===building.properties.buildingId&&f.properties.is_underground!==true);
  const pieces=parts.flatMap(part=>{
    const coordinates=polygonClipping.intersection(polygons(part.geometry),polygons(building.geometry));
    return coordinates.length?[{id:part.properties.id,geometry:{type:'MultiPolygon',coordinates},height:buildingHeight(part.properties)}]:[];
  });
  const uncovered=pieces.length?polygonClipping.difference(polygons(building.geometry),...pieces.map(p=>polygons(p.geometry))):polygons(building.geometry);
  if(uncovered.length)pieces.push({id:building.id,geometry:{type:'MultiPolygon',coordinates:uncovered},height:building.properties.height});
  return pieces;
}
