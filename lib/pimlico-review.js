import polygonClipping from 'polygon-clipping';
import {localPlacement,toMetres,fromMetres} from './local-history.js';

export const DEFAULT_ADJUSTMENT={east:0,north:0,rotation:0,scale:1};
const polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const pair=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function reviewPlacement(points,adjustment){
 const base=localPlacement({points}),origin=toMetres(base.coordinates([700,350]));
 const angle=adjustment.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 return pixel=>{const p=toMetres(base.coordinates(pixel)),x=(p[0]-origin[0])*adjustment.scale,y=(p[1]-origin[1])*adjustment.scale;
  return fromMetres([origin[0]+x*c-y*s+adjustment.east,origin[1]+x*s+y*c+adjustment.north]);};
}
export function reviewResiduals(points,adjustment){
 const project=reviewPlacement(points,adjustment);
 return points.filter(p=>p.role!=='exclude').map(p=>{const expected=toMetres(p.coordinates),predicted=toMetres(project(p.pixel));return {...p,predicted:project(p.pixel),errorMetres:Math.hypot(expected[0]-predicted[0],expected[1]-predicted[1])};});
}
export function sectionGeometry(building,ring){
 if(!Array.isArray(ring)||ring.length<3||ring.length>128||ring.some(p=>!pair(p)))throw new Error('Draw a section with 3–128 corners.');
 // Reject self-crossing boundaries: the author must choose one clear section.
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let i=0;i<ring.length;i++)for(let j=i+2;j<ring.length;j++){
  if(i===0&&j===ring.length-1)continue;
  const a=ring[i],b=ring[(i+1)%ring.length],c=ring[j],d=ring[(j+1)%ring.length];
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)throw new Error('The section boundary crosses itself. Undo a corner and redraw.');
 }
 const coordinates=polygonClipping.intersection(polys(building.geometry),[[[...ring,ring[0]]]]);
 if(!coordinates.length)throw new Error('The drawn section does not touch the selected building.');
 return {type:'MultiPolygon',coordinates};
}
export function targetGeometry(target,index){
 const building=index.features.find(f=>f.id===target.componentId);
 if(!building)throw new Error('A selected building is no longer in this source snapshot.');
 if(target.kind==='building')return {building,geometry:building.geometry};
 if(target.kind==='part'){
  const part=building.renderPieces.find(p=>p.id===target.partId&&p.id!==building.id);
  if(!part)throw new Error('Choose a supplied building part. This building may not have one.');
  return {building,geometry:part.geometry};
 }
 if(target.kind==='section')return {building,geometry:sectionGeometry(building,target.ring)};
 throw new Error('Choose a whole building, supplied part or named section.');
}
export function exportReview(config,index,study){
 if(config.schemaVersion!==1||config.sourceImageSha256!==study.sourceImage.sha256)throw new Error('This review uses a different source image.');
 if(JSON.stringify(config.fingerprints)!==JSON.stringify(index.fingerprints))throw new Error('The source snapshot changed. Reload the tool before saving.');
 const a=config.adjustment;
 if(!a||!Number.isFinite(a.east)||Math.abs(a.east)>40||!Number.isFinite(a.north)||Math.abs(a.north)>40||!Number.isFinite(a.rotation)||Math.abs(a.rotation)>5||!Number.isFinite(a.scale)||a.scale<.95||a.scale>1.05)throw new Error('Alignment controls are outside the supported range.');
 if(!Array.isArray(config.points)||config.points.length<3||config.points.length>40)throw new Error('Use 3–40 landmark pairs.');
 const ids=new Set(),pixels=new Set(),coordinates=new Set();
 for(const p of config.points){
  if(!p.id||ids.has(p.id)||!pair(p.pixel)||!pair(p.coordinates)||!['fit','check','exclude'].includes(p.role))throw new Error('Invalid or duplicate landmark.');
  if(p.pixel[0]<0||p.pixel[0]>1067||p.pixel[1]<0||p.pixel[1]>672||p.coordinates[0]<-.16||p.coordinates[0]>-.12||p.coordinates[1]<51.48||p.coordinates[1]>51.50)throw new Error('Landmark outside the Pimlico study.');
  if(p.kind==='rebuilt-site'&&p.role!=='exclude')throw new Error('Exclude rebuilt sites from alignment measurements.');
  if(p.role!=='exclude'){
   const pixel=JSON.stringify(p.pixel),coordinate=JSON.stringify(p.coordinates);
   if(pixels.has(pixel)||coordinates.has(coordinate))throw new Error('A fitting/check landmark is duplicated. Choose independent features.');
   pixels.add(pixel);coordinates.add(coordinate);
  }
  ids.add(p.id);
 }
 const project=reviewPlacement(config.points,a);
 if(!Array.isArray(config.assignments)||config.assignments.length>200)throw new Error('Use at most 200 assignments.');
 const seen=new Set(),features=[];
 for(const assignment of config.assignments){
  if(typeof assignment.id!=='string'||seen.has(assignment.id)||!assignment.name?.trim()||assignment.name.length>120)throw new Error('Each assignment needs a unique ID and a short name.');
  seen.add(assignment.id);
  const row=study.areas.find(r=>r.id===assignment.rowId);
  if(!row||!['surviving','rebuilt','uncertain'].includes(assignment.relationship)||!['draft','reviewed'].includes(assignment.reviewStatus))throw new Error('Invalid historical row or relationship.');
  if(assignment.reviewStatus==='reviewed'&&(!assignment.reviewer?.trim()||!assignment.evidence?.trim()))throw new Error('Reviewed assignments need a reviewer and evidence notes.');
  if(!Array.isArray(assignment.targets)||!assignment.targets.length||assignment.targets.length>100)throw new Error('Choose at least one target object.');
  const targetIds=new Set();
  for(const [i,target]of assignment.targets.entries()){
   const {building,geometry}=targetGeometry(target,index),key=JSON.stringify({...target,id:undefined});
   if(targetIds.has(key))throw new Error('A target was selected twice in one assignment.');
   targetIds.add(key);
   if(target.kind==='section'&&!target.name?.trim())throw new Error('Name the drawn section.');
   features.push({type:'Feature',id:`${assignment.id}:${target.id??i}`,geometry,properties:{assignmentId:assignment.id,name:target.name||assignment.name,
    historicalRowId:row.id,category:row.category,relationship:assignment.relationship,reviewStatus:assignment.reviewStatus,
    buildingId:building.properties.buildingId,componentId:building.id,partId:target.partId??null,unit:target.kind,
    evidence:assignment.evidence??'',reviewer:assignment.reviewer??'',
    paintEligible:assignment.relationship==='surviving'&&assignment.reviewStatus==='reviewed',
    historicalGeometry:{type:'Polygon',coordinates:[[...row.ring,row.ring[0]].map(project)]}}});
  }
 }
 for(let i=0;i<features.length;i++)for(let j=i+1;j<features.length;j++){
  const a=features[i],b=features[j];
  if(a.properties.componentId!==b.properties.componentId||a.properties.category===b.properties.category)continue;
  if(polygonClipping.intersection(polys(a.geometry),polys(b.geometry)).length){
   for(const [f,other]of [[a,b],[b,a]]){f.properties.paintEligible=false;f.properties.conflicts=[...new Set([...(f.properties.conflicts??[]),other.properties.assignmentId])];}
  }
 }
 return {type:'FeatureCollection',metadata:{schemaVersion:1,sourceImageSha256:config.sourceImageSha256,fingerprints:index.fingerprints,
  status:'Authored correspondence; review labels are human assertions, not measured historical accuracy',residuals:reviewResiduals(config.points,a)},features};
}
