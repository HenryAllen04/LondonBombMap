import polygonClipping from 'polygon-clipping';
import { bounds } from '../app/proto/borough-plates/matching.js';
import { toMetres } from './local-history.js';
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
function ringArea(ring){const r=ring.map(toMetres);return Math.abs(r.reduce((sum,p,i)=>{const q=r[(i+1)%r.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;}
const area=ps=>ps.reduce((sum,p)=>sum+ringArea(p[0])-p.slice(1).reduce((s,r)=>s+ringArea(r),0),0);
export function historicalCoverage(areas,buildings){
 const modern=buildings.map(f=>({f,box:bounds(f.matchGeometry??f.geometry)}));
 return areas.map(f=>{
  const b=bounds(f.geometry),shape=polygons(f.geometry),overlaps=[];
  for(const {f:building,box} of modern){
   if(box.maxX<b.minX||box.minX>b.maxX||box.maxY<b.minY||box.minY>b.maxY)continue;
   const intersection=polygonClipping.intersection(shape,polygons(building.matchGeometry??building.geometry));
   if(intersection.length&&area(intersection)>.01)overlaps.push({building,intersection});
  }
  const total=area(shape),covered=overlaps.length?area(polygonClipping.union(...overlaps.map(o=>o.intersection))):0;
  return {id:f.properties.id,category:f.properties.category,siteId:f.properties.siteId,
   areaSquareMetres:total,coveredByModernBuildingsSquareMetres:covered,
   outsideModernBuildingsSquareMetres:Math.max(0,total-covered),modernCoverage:total?Math.min(1,covered/total):0,
   modernBuildingIds:[...new Set(overlaps.map(o=>o.building.properties.buildingId))],
   historicalIdentity:'unreviewed',note:'Ground outside modern roofs may reflect redevelopment, tracing or alignment error. It remains part of the historical layer.'};
 });
}
