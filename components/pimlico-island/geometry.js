import clipping from 'polygon-clipping';
import {toPlane,fromPlane,applyMatrix,invertMatrix,rectangleRing} from '@/lib/map-overlay';
import {polygons} from '@/lib/pimlico-pilot';

// A display cut within the captured data, including both banks of the Thames.
export const EXTENT=[-.151,51.4825,-.129,51.4955];
export const project=p=>{const [x,y]=toPlane(p);return [x,-y];};
export const unproject=([x,y])=>fromPlane([x,-y]);
export const localGeometry=g=>polygons(g).map(p=>p.map(r=>r.map(project)));
export function islandRegion(){
  const [w,s,e,n]=EXTENT;
  return {type:'Feature',properties:{name:'Pimlico display cut'},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}};
}
export function splitSurface(features,region=islandRegion()){
  const outline=localGeometry(region.geometry);
  const water=features.filter(f=>f.properties.layer==='water'&&['Polygon','MultiPolygon'].includes(f.geometry.type)).map(f=>clipping.intersection(localGeometry(f.geometry),outline)).filter(p=>p.length);
  const river=water.length?clipping.union(...water):[];
  return {outline,river,land:river.length?clipping.difference(outline,river):outline};
}
export function paperUV(point,matrix,source){
  const pixel=applyMatrix(invertMatrix(matrix),[point[0],-point[1]]);
  return [pixel[0]/source.width,1-pixel[1]/source.height];
}
export function selectedArea(config,matrix){
  return [[rectangleRing(config.selection).map(p=>{const [x,y]=applyMatrix(matrix,p);return [x,-y];})]];
}
