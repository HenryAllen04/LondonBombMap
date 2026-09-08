import { fitAffine, applyAffine } from './registration.js';
import { projectTrace } from './trace-projection.js';

const metresPerDegree=111320;
const longitudeScale=metresPerDegree*Math.cos(51.49*Math.PI/180);
export const toMetres=([lon,lat])=>[(lon+.14)*longitudeScale,(lat-51.49)*metresPerDegree];
export const fromMetres=([east,north])=>[east/longitudeScale-.14,north/metresPerDegree+51.49];
export function localPlacement(study){
 const points=study.points.filter(p=>p.role==='fit');
 const model=fitAffine(points.map(p=>({pixel:p.pixel,grid:toMetres(p.coordinates)})));
 const inverse=fitAffine([[0,0],[1000,0],[0,1000]].map(pixel=>({pixel:applyAffine(model,pixel),grid:pixel})));
 return {coordinates:pixel=>fromMetres(applyAffine(model,pixel)),pixel:coordinates=>applyAffine(inverse,toMetres(coordinates))};
}
export function placementComparison(traces,study){
 const placement=localPlacement(study);
 return study.comparisonProbes.map(probe=>{
  const old=traces.areas.find(a=>a.id===probe.legacyId);
  const centre=old.ring.reduce((sum,p)=>sum.map((n,i)=>n+p[i]/old.ring.length),[0,0]);
  const previous=toMetres(projectTrace(centre,traces.anchors)),target=toMetres(placement.coordinates(probe.targetPixel));
  return {...probe,eastMetres:previous[0]-target[0],northMetres:previous[1]-target[1],distanceMetres:Math.hypot(previous[0]-target[0],previous[1]-target[1]),
   note:'Previous rectangle centre relative to an estimated corresponding historical row centre. Approximate placement diagnostic, not a landmark residual or a uniform correction for the sheet.'};
 });
}
export function localChecks(study){
 const placement=localPlacement(study);
 const residuals=study.points.map(p=>{const actual=toMetres(p.coordinates),predicted=toMetres(placement.coordinates(p.pixel));return {...p,errorMetres:Math.hypot(actual[0]-predicted[0],actual[1]-predicted[1])};});
 const checks=residuals.filter(p=>p.role==='check');
 return {status:'exploratory',fitPoints:residuals.length-checks.length,checkPoints:checks.length,
  checkRmseMetres:checks.length?Math.sqrt(checks.reduce((s,p)=>s+p.errorMetres**2,0)/checks.length):null,
  checkMaxMetres:checks.length?Math.max(...checks.map(p=>p.errorMetres)):null,residuals,
  note:study.method};
}
export function historicalAreas(traces,study){
 const placement=localPlacement(study);
 const make=(a,project,source)=>{const ring=a.ring.map(project);return {type:'Feature',properties:{id:a.id,category:a.category,status:'draft',source,siteId:a.siteId??null,description:a.description??null},geometry:{type:'Polygon',coordinates:[[...ring,ring[0]]]}};};
 return [...traces.areas.filter(a=>!study.replaces.includes(a.id)).map(a=>make(a,p=>projectTrace(p,traces.anchors),'legacy-full-sheet')),
  ...study.areas.map(a=>make(a,placement.coordinates,study.id))];
}
