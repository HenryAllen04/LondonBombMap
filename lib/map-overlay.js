import {fitAffine,applyAffine} from './registration.js';
import {toMetres,fromMetres} from './local-history.js';

export const ZERO_ADJUSTMENT={east:0,north:0,rotation:0,scale:1};
export const toPlane=coordinates=>{const [x,y]=toMetres(coordinates);return [x,-y];};
export const fromPlane=([x,y])=>fromMetres([x,-y]);
export const applyMatrix=(m,[x,y])=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
export function invertMatrix(m){
 const d=m[0]*m[3]-m[1]*m[2];
 if(!Number.isFinite(d)||Math.abs(d)<1e-10)throw new Error('The alignment is degenerate. Spread fitting landmarks around the area.');
 return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];
}
export const rectangleRing=r=>[[r.x,r.y],[r.x+r.width,r.y],[r.x+r.width,r.y+r.height],[r.x,r.y+r.height],[r.x,r.y]];
export function fitOverlay(points,mode){
 const pairs=points.filter(p=>p.role==='fit').map(p=>({pixel:p.pixel,grid:toPlane(p.coordinates)}));
 // The affine solver also checks that the fitting points span an area.
 const affine=fitAffine(pairs);
 if(mode==='affine'){
  const o=applyAffine(affine,[0,0]),x=applyAffine(affine,[1,0]),y=applyAffine(affine,[0,1]);
  return [x[0]-o[0],x[1]-o[1],y[0]-o[0],y[1]-o[1],...o];
 }
 const mean=key=>[0,1].map(i=>pairs.reduce((s,p)=>s+p[key][i],0)/pairs.length),p=mean('pixel'),q=mean('grid');
 let denominator=0,dot=0,cross=0;
 for(const pair of pairs){const x=pair.pixel[0]-p[0],y=pair.pixel[1]-p[1],u=pair.grid[0]-q[0],v=pair.grid[1]-q[1];denominator+=x*x+y*y;dot+=x*u+y*v;cross+=x*v-y*u;}
 const a=dot/denominator,b=cross/denominator;
 return [a,b,-b,a,q[0]-a*p[0]+b*p[1],q[1]-b*p[0]-a*p[1]];
}
export function overlayMatrix(config,pivot){
 const base=fitOverlay(config.points,config.model),origin=applyMatrix(base,pivot),a=config.adjustment;
 const angle=a.rotation*Math.PI/180,c=Math.cos(angle)*a.scale,s=Math.sin(angle)*a.scale;
 const project=p=>{const q=applyMatrix(base,p),x=q[0]-origin[0],y=q[1]-origin[1];return [origin[0]+c*x-s*y+a.east,origin[1]+s*x+c*y-a.north];};
 const o=project([0,0]),x=project([1,0]),y=project([0,1]);
 const matrix=[x[0]-o[0],x[1]-o[1],y[0]-o[0],y[1]-o[1],...o];
 invertMatrix(matrix);
 return matrix;
}
export function overlayResiduals(config,matrix){
 return config.points.filter(p=>p.role!=='exclude').map(p=>{const predicted=applyMatrix(matrix,p.pixel),actual=toPlane(p.coordinates);return {id:p.id,role:p.role,errorMetres:Math.hypot(predicted[0]-actual[0],predicted[1]-actual[1]),predicted:fromPlane(predicted)};});
}
const pair=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function exportOverlay(config,definition){
 if(config?.schemaVersion!==1||config.source?.sha256!==definition.source.sha256||config.source?.width!==definition.source.width||config.source?.height!==definition.source.height)throw new Error('This alignment belongs to a different source image.');
 const r=config.selection,s=definition.source;
 if(!r||![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<12||r.height<12||r.x+r.width>s.width||r.y+r.height>s.height)throw new Error('Select an area at least 12 × 12 pixels inside the sheet.');
 if(!['similarity','affine'].includes(config.model))throw new Error('Choose a supported alignment model.');
 const a=config.adjustment;
 if(!a||!Number.isFinite(a.east)||Math.abs(a.east)>200||!Number.isFinite(a.north)||Math.abs(a.north)>200||!Number.isFinite(a.rotation)||Math.abs(a.rotation)>30||!Number.isFinite(a.scale)||a.scale<.5||a.scale>2)throw new Error('Alignment adjustments exceed the supported range.');
 if(!config.display||!Number.isFinite(config.display.opacity)||config.display.opacity<0||config.display.opacity>1||typeof config.display.outlines!=='boolean')throw new Error('Invalid overlay display settings.');
 if(!Array.isArray(config.points)||config.points.length<3||config.points.length>40)throw new Error('Use 3–40 landmark pairs.');
 const ids=new Set(),pixels=new Set(),coordinates=new Set();
 for(const p of config.points){
  if(typeof p.id!=='string'||!p.id.trim()||p.id.length>100||ids.has(p.id)||!['fit','check','exclude'].includes(p.role)||!pair(p.pixel)||!pair(p.coordinates))throw new Error('Each landmark needs a unique name and valid paired coordinates.');
  if(p.pixel[0]<0||p.pixel[0]>s.width||p.pixel[1]<0||p.pixel[1]>s.height||p.coordinates[0]<-.18||p.coordinates[0]>-.1||p.coordinates[1]<51.46||p.coordinates[1]>51.52)throw new Error('Landmark outside the supported sheet/Pimlico context.');
  if(p.role!=='exclude'){
   const pixel=JSON.stringify(p.pixel),coordinate=JSON.stringify(p.coordinates);
   if(pixels.has(pixel)||coordinates.has(coordinate))throw new Error('Do not reuse a fitting landmark as an independent check.');
   pixels.add(pixel);coordinates.add(coordinate);
  }
  ids.add(p.id);
 }
 const matrix=overlayMatrix(config,definition.pivot),residuals=overlayResiduals(config,matrix),checks=residuals.filter(p=>p.role==='check');
 return {
  type:'FeatureCollection',features:[{type:'Feature',id:'selected-study-area',properties:{sourceImageSha256:s.sha256,status:'unverified-local-alignment'},geometry:{type:'Polygon',coordinates:[rectangleRing(r).map(p=>fromPlane(applyMatrix(matrix,p)))]}}],
  metadata:{source:s,selection:r,transform:{pixelToLocalMetres:matrix,localOrigin:[-.14,51.49],axes:['east','south'],metresPerDegree:111320,longitudeScaleLatitude:51.49,pivot:definition.pivot},
   scope:'Selected area only; no validated full-sheet registration or building colour assignments',residuals,
   checks:{count:checks.length,rmseMetres:checks.length?Math.sqrt(checks.reduce((sum,p)=>sum+p.errorMetres**2,0)/checks.length):null,maxMetres:checks.length?Math.max(...checks.map(p=>p.errorMetres)):null}}
 };
}
export function initialOverlay(definition){
 return {schemaVersion:1,source:definition.source,selection:{...definition.selection},model:'similarity',adjustment:{...ZERO_ADJUSTMENT},points:structuredClone(definition.points),display:{opacity:.7,outlines:true}};
}
