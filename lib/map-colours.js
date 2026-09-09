import {fillBuilding} from './filled-buildings.js';
import {validateSites,buildHistoricalSites,siteDisplay} from './historical-sites.js';
import clipping from 'polygon-clipping';
import {exportOverlay,overlayMatrix,applyMatrix,invertMatrix,toPlane,fromPlane,rectangleRing} from './map-overlay.js';

export const COLOUR_CLASSES=[
 {id:'destroyed',name:'Black',label:'Total destruction',colour:'#353746'},
 {id:'beyond-repair',name:'Purple',label:'Beyond repair',colour:'#8361b5'},
 {id:'doubtful',name:'Red',label:'Repair doubtful',colour:'#c34b65'},
 {id:'repairable',name:'Pink',label:'Repairable',colour:'#ef95ad'},
 {id:'blast',name:'Orange',label:'Blast damage',colour:'#e4a462'},
 {id:'minor',name:'Yellow',label:'Minor damage',colour:'#e4c75d'},
];
export const EXCLUDED=255,MAX_PIXELS=160000;
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const pair=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function colourGrid(selection){
 const x=Math.floor(selection.x),y=Math.floor(selection.y),width=Math.ceil(selection.x+selection.width)-x,height=Math.ceil(selection.y+selection.height)-y;
 if(width*height>MAX_PIXELS)throw new Error('Choose a smaller colour area (up to 160,000 source pixels). Alignment can still use the full sheet.');
 return {x,y,width,height};
}
export function newColours(selection,fingerprints){return {schemaVersion:1,grid:colourGrid(selection),fingerprints,samples:[],strokes:[],tolerance:36,minPatch:3,runs:[],rules:{minimumCoverage:.35,mixedShare:.2},reviews:{}};}
export function encodeMask(mask){
 const runs=[];for(let i=0;i<mask.length;){const start=i,label=mask[i];while(i<mask.length&&mask[i]===label)i++;if(label)runs.push([start,i-start,label]);}return runs;
}
export function decodeMask(runs,size){const labels=new Uint8Array(size);for(const [start,length,label]of runs)labels.fill(label,start,start+length);return labels;}
const inRectangle=(x,y,r)=>x>=r.x&&y>=r.y&&x<r.x+r.width&&y<r.y+r.height;
// A conservative palette pass for this paper scan. Pale paper and green map
// markings stay unclassified; darkness alone is not enough to identify ink fill.
export function automaticPixelLabel(r,g,b){
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,s=max?delta/max:0;
 if(max<95&&s<.5)return 1;
 if(delta<40||s<.3||max<95)return 0;
 let h=delta===0?0:max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(h<0)h+=360;
 if(h>=225&&h<295&&b>r*1.12)return 2;
 if(h>=295&&h<350&&r>125)return 4;
 if((h>=350||h<12)&&s>.5)return 3;
 if(h>=12&&h<42&&s>.34)return 5;
 if(h>=42&&h<72&&s>.3&&max>140)return 6;
 return 0;
}
export function generateMask(rgba,settings,exclusions=[]){
 const {grid,samples,tolerance,minPatch,strokes}=settings,{width,height}=grid,size=width*height;
 if(rgba.length!==size*4)throw new Error('Source pixels do not match the selected area.');
 const labels=new Uint8Array(size),distance=new Float32Array(size).fill(Infinity);
 const colourDistance=(i,rgb)=>Math.hypot(rgba[i*4]-rgb[0],rgba[i*4+1]-rgb[1],rgba[i*4+2]-rgb[2]);
 const neighbours=i=>[i%width?i-1:-1,i%width<width-1?i+1:-1,i>=width?i-width:-1,i+width<size?i+width:-1];
 if(settings.automatic?.version===1){
  const candidates=new Uint8Array(size);
  for(let i=0;i<size;i++)candidates[i]=automaticPixelLabel(rgba[i*4],rgba[i*4+1],rgba[i*4+2]);
  for(let i=0;i<size;i++){
   labels[i]=candidates[i];
   if(candidates[i]===1){
    const x=i%width,y=Math.floor(i/width);let dark=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height&&candidates[(y+dy)*width+x+dx]===1)dark++;
    if(dark<5)labels[i]=0;
   }
  }
 }
 for(const sample of samples){
  const label=COLOUR_CLASSES.findIndex(c=>c.id===sample.category)+1;
  let connected;
  if(sample.scope==='patch'){
   connected=new Uint8Array(size);const x=Math.floor(sample.point[0])-grid.x,y=Math.floor(sample.point[1])-grid.y;
   if(x<0||y<0||x>=width||y>=height)continue;
   const queue=[y*width+x];connected[queue[0]]=1;
   for(let q=0;q<queue.length;q++)for(const n of neighbours(queue[q]))if(n>=0&&!connected[n]&&colourDistance(n,sample.rgb)<=tolerance){connected[n]=1;queue.push(n);}
  }
  for(let i=0;i<size;i++){
   if(connected&&!connected[i])continue;
   const d=colourDistance(i,sample.rgb);
   if(d>tolerance)continue;
   if(d<distance[i]-1){labels[i]=label;distance[i]=d;}
   else if(Math.abs(d-distance[i])<=1&&labels[i]!==label)labels[i]=0;
  }
 }
 const seen=new Uint8Array(size);
 for(let i=0;i<size;i++)if(labels[i]&&!seen[i]){
  const group=[i],label=labels[i];seen[i]=1;
  for(let q=0;q<group.length;q++)for(const n of neighbours(group[q]))if(n>=0&&!seen[n]&&labels[n]===label){seen[n]=1;group.push(n);}
  if(group.length<minPatch)for(const n of group)labels[n]=0;
 }
 function dab(point,stroke){
  const cx=point[0]-grid.x,cy=point[1]-grid.y,r=stroke.radius;
  for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(height,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(width,Math.ceil(cx+r));x++)if(Math.hypot(x+.5-cx,y+.5-cy)<=r)labels[y*width+x]=stroke.label;
 }
 for(const stroke of strokes){
  for(let i=0;i<stroke.points.length;i++){
   const p=stroke.points[i],previous=stroke.points[i-1]??p,steps=Math.max(1,Math.ceil(Math.hypot(p[0]-previous[0],p[1]-previous[1])/(stroke.radius*.5)));
   for(let n=1;n<=steps;n++)dab([previous[0]+(p[0]-previous[0])*n/steps,previous[1]+(p[1]-previous[1])*n/steps],stroke);
  }
 }
 for(let i=0;i<size;i++)if(exclusions.some(r=>inRectangle(grid.x+i%width+.5,grid.y+Math.floor(i/width)+.5,r)))labels[i]=EXCLUDED;
 return labels;
}
export function maskRectangles(mask,grid){
 const byLabel=new Map();
 for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;){
  const start=x,label=mask[y*grid.width+x];while(x<grid.width&&mask[y*grid.width+x]===label)x++;
  if(label){const rows=byLabel.get(label)??[];rows.push({x:grid.x+start,y:grid.y+y,width:x-start,height:1});byLabel.set(label,rows);}
 }
 return byLabel;
}
export function validateColours(config,definition,index){
 const c=config.colours;if(!c)return;
 if(c.surfaceMode!==undefined&&!['filled','overlap','site-aware'].includes(c.surfaceMode))throw new Error('Invalid building colour finish.');
 if(c.automatic&&c.automatic.version!==1)throw new Error('Unsupported automatic colour version.');
 if(c.schemaVersion!==1||JSON.stringify(c.grid)!==JSON.stringify(colourGrid(config.selection)))throw new Error('The selected area changed. Open Colour areas and refresh the source area before saving.');
 if(!index||JSON.stringify(c.fingerprints)!==JSON.stringify(index.fingerprints))throw new Error('Modern building data changed. Reload before saving colour assignments.');
 validateSites(c.sites,config.selection,index);
 if(!Number.isFinite(c.tolerance)||c.tolerance<5||c.tolerance>100||!Number.isInteger(c.minPatch)||c.minPatch<1||c.minPatch>40)throw new Error('Colour tolerance or minimum patch size is outside the supported range.');
 if(!c.rules||!Number.isFinite(c.rules.minimumCoverage)||c.rules.minimumCoverage<.1||c.rules.minimumCoverage>.9||!Number.isFinite(c.rules.mixedShare)||c.rules.mixedShare<.1||c.rules.mixedShare>.45)throw new Error('Invalid building coverage rules.');
 if(!Array.isArray(c.samples)||c.samples.length>40||!Array.isArray(c.strokes)||c.strokes.length>500)throw new Error('Use at most 40 samples and 500 correction strokes.');
 for(const s of c.samples)if(!COLOUR_CLASSES.some(k=>k.id===s.category)||!pair(s.point)||s.point[0]<0||s.point[0]>=definition.source.width||s.point[1]<0||s.point[1]>=definition.source.height||!Array.isArray(s.rgb)||s.rgb.length!==3||s.rgb.some(n=>!Number.isInteger(n)||n<0||n>255)||!['area','patch'].includes(s.scope))throw new Error('Invalid colour sample.');
 let pointCount=0;
 for(const s of c.strokes){
  if(!Number.isFinite(s.radius)||s.radius<.5||s.radius>12||![0,1,2,3,4,5,6,EXCLUDED].includes(s.label)||!Array.isArray(s.points)||!s.points.length||s.points.some(p=>!pair(p)||p[0]<0||p[0]>definition.source.width||p[1]<0||p[1]>definition.source.height))throw new Error('Invalid correction stroke.');
  pointCount+=s.points.length;
 }
 if(pointCount>20000)throw new Error('Too many brush points. Save a smaller correction set.');
 const size=c.grid.width*c.grid.height;let end=0;
 if(!Array.isArray(c.runs)||c.runs.length>size)throw new Error('Invalid colour mask.');
 for(const run of c.runs){if(!Array.isArray(run)||run.length!==3||!run.every(Number.isInteger)||run[0]<end||run[1]<1||run[0]+run[1]>size||![1,2,3,4,5,6,EXCLUDED].includes(run[2]))throw new Error('Invalid or overlapping colour-mask runs.');end=run[0]+run[1];}
 if(c.reviews&&Object.values(c.reviews).some(r=>!r||!['checked','needs-correction'].includes(r.status)||typeof r.note!=='string'||r.note.length>2000))throw new Error('Invalid visual review.');
}
const signedArea=ring=>ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
const area=polys=>polys.reduce((sum,p)=>sum+Math.max(0,Math.abs(signedArea(p[0]))-p.slice(1).reduce((s,r)=>s+Math.abs(signedArea(r)),0)),0);
const mapGeometry=(g,project)=>({type:'MultiPolygon',coordinates:polygons(g).map(p=>p.map(r=>r.map(project)))});
export function buildColourArtifact(config,definition,index){
 validateColours(config,definition,index);
 if(!config.colours)return null;
 const c=config.colours,matrix=overlayMatrix(config,definition.pivot),inverse=invertMatrix(matrix),labels=decodeMask(c.runs,c.grid.width*c.grid.height);
 // The known watermark mask remains unknown even if a posted/editable mask paints over it.
 for(let i=0;i<labels.length;i++)if((definition.exclusions??[]).some(r=>inRectangle(c.grid.x+i%c.grid.width+.5,c.grid.y+Math.floor(i/c.grid.width)+.5,r)))labels[i]=EXCLUDED;
 const rects=maskRectangles(labels,c.grid),selectionPoly=[[rectangleRing(config.selection)]],regions=[];
 for(const [label,rows]of rects){
  const union=clipping.union(...rows.map(r=>[[rectangleRing(r)]]));
  const coordinates=clipping.intersection(union,selectionPoly);
  if(coordinates.length)regions.push({label,geometry:{type:'MultiPolygon',coordinates}});
 }
 const project=p=>fromPlane(applyMatrix(matrix,p));
 const features=[],sections=[],workingBuildings=new Map(),workingEvidence=new Map();
 for(const building of index.features){
  // Round only the working pixel coordinates to avoid near-coincident clipping edges.
  // The exported modern geometry remains the exact source footprint.
  const geometry=mapGeometry(building.geometry,p=>applyMatrix(inverse,toPlane(p)).map(n=>Math.round(n*1e6)/1e6)),coords=geometry.coordinates;
  const points=coords.flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),r=config.selection;
  if(Math.max(...xs)<r.x||Math.min(...xs)>r.x+r.width||Math.max(...ys)<r.y||Math.min(...ys)>r.y+r.height)continue;
  const total=area(coords);if(!total)continue;
  const inside=area(clipping.intersection(coords,selectionPoly));if(inside/total<.005)continue;
  const categories=[],colouredPolygons=[],evidence=[];let excluded=0;
  workingBuildings.set(building.id,coords);workingEvidence.set(building.id,evidence);
  function addSection(coordinates,category,coverage){
   if(!coordinates.length||coverage<1e-10)return;
   sections.push({type:'Feature',id:`${building.id}:overlap:${category??'unknown'}`,geometry:mapGeometry({type:'MultiPolygon',coordinates},project),properties:{componentId:building.id,buildingId:building.properties.buildingId,category,coverage,kind:category?'historical-overlap':'unknown',historicallyVerified:false,meaning:category?'Part of the modern footprint overlapping a historical colour region; not an original property or flat boundary':'Remainder of the modern footprint without usable historical colour evidence'}});
  }
  for(const region of regions){
   const intersection=clipping.intersection(coords,region.geometry.coordinates),overlap=area(intersection)/total;
   if(region.label===EXCLUDED){excluded=overlap;continue;}
   if(overlap>0){const category=COLOUR_CLASSES[region.label-1].id;categories.push({category,coverage:overlap});evidence.push({category,coverage:overlap,coordinates:intersection});colouredPolygons.push(intersection);addSection(intersection,category,overlap);}
  }
  const remainder=colouredPolygons.length?clipping.difference(coords,...colouredPolygons):coords;
  addSection(remainder,null,area(remainder)/total);
  categories.sort((a,b)=>b.coverage-a.coverage);
  const coverage=categories.reduce((s,p)=>s+p.coverage,0),significant=categories.filter(p=>p.coverage>=.05&&p.coverage/coverage>=c.rules.mixedShare);
  const status=coverage<c.rules.minimumCoverage?'unresolved':significant.length>1?'mixed':'single';
  features.push({type:'Feature',id:building.id,geometry:building.geometry,properties:{componentId:building.id,buildingId:building.properties.buildingId,name:building.properties.sourceName??(building.properties.buildingId===definition.rebuiltBuildingId?'Russell House':'Modern building'),
   status,category:status==='single'?categories[0]?.category:null,categories,mixedCategories:status==='mixed'?significant.map(p=>p.category):[],coverage,excludedCoverage:excluded,unclassifiedCoverage:Math.max(0,inside/total-coverage-excluded),outsideSelectionCoverage:Math.max(0,1-inside/total),
   relationship:building.properties.buildingId===definition.rebuiltBuildingId?'rebuilt-site':'site-overlap-unverified',historicallyVerified:false,review:c.reviews?.[building.id]??{status:'unreviewed',note:''}}});
 }
 const sites=buildHistoricalSites(c.sites,regions,index,inverse,project,COLOUR_CLASSES);
 for(const feature of features)feature.properties.display=siteDisplay(feature.properties,sites);
 const filledSections=[];
 for(const feature of features){
  const parent=feature.properties,site=sites.features.find(s=>s.id===parent.display.siteId);
  let evidence=workingEvidence.get(feature.id);
  if(site){const boundary=c.sites.find(s=>s.id===site.id).boundary,polygon=[[[...boundary,boundary[0]]]];evidence=site.properties.categories.map(e=>{const region=regions.find(r=>r.label<=6&&COLOUR_CLASSES[r.label-1].id===e.category);return {...e,coordinates:region?clipping.intersection(polygon,region.geometry.coordinates):[]};});}
  for(const part of fillBuilding(workingBuildings.get(feature.id),evidence))filledSections.push({type:'Feature',id:`${feature.id}:fill:${part.category??'unknown'}`,geometry:mapGeometry({type:'MultiPolygon',coordinates:part.coordinates},project),properties:{componentId:feature.id,buildingId:parent.buildingId,name:parent.name,category:part.category,coverage:part.coverage,sourceCoverage:part.sourceCoverage,evidenceBasis:site?parent.display.basis:'footprint-overlap',siteId:site?.id??null,kind:part.category?'inferred-building-fill':'unknown',rebuiltSite:parent.display.rebuilt,historicallyVerified:false,meaning:'Illustrative colours extended to the modern building edges; straight display boundaries are not measured damage boundaries'}});
 }
 for(const section of sections){const parent=features.find(f=>f.id===section.properties.componentId);Object.assign(section.properties,{name:parent.properties.name,rebuiltSite:parent.properties.display.rebuilt,relationship:parent.properties.relationship});}
 return {type:'FeatureCollection',metadata:{sites,filledSections:{type:'FeatureCollection',metadata:{meaning:'Illustrative complete building fills: colour locations order straight sections; matched colour proportions determine their areas',method:'spatially-ordered-area-partition',sourceImageSha256:definition.source.sha256,fingerprints:index.fingerprints},features:filledSections},sections:{type:'FeatureCollection',metadata:{meaning:'Modern building partitions derived from direct historical colour overlap, independent of whole-building/site display rules',sourceImageSha256:definition.source.sha256,fingerprints:index.fingerprints},features:sections},meaning:'Historical area colours displayed on complete modern building objects; not evidence that those buildings were bombed',sourceImageSha256:definition.source.sha256,fingerprints:index.fingerprints,rules:c.rules,
  counts:features.reduce((a,f)=>(a[f.properties.status]++,a),{single:0,mixed:0,unresolved:0}),reviewed:features.filter(f=>f.properties.review.status==='checked').length,
  colourRegions:{type:'FeatureCollection',features:regions.map(r=>({type:'Feature',id:`region-${r.label}`,properties:{category:r.label===EXCLUDED?'excluded':COLOUR_CLASSES[r.label-1].id},geometry:mapGeometry(r.geometry,project)}))}},features};
}
export function exportColourOverlay(config,definition,index){
 const artifact=exportOverlay(config,definition),colours=buildColourArtifact(config,definition,index);
 if(colours){artifact.metadata.scope='Selected area alignment with draft historical area colours on modern building objects';artifact.colourAssignments=colours;}
 return artifact;
}

export function displayedSections(artifact,mode='site-aware'){
 if(!artifact)return null;
 if(mode==='filled')return artifact.metadata.filledSections;
 if(mode==='overlap')return artifact.metadata.sections;
 // Only an authored replacement relationship justifies moving site evidence
 // onto a building that occupies a different historical footprint.
 const linked=new Set(artifact.features.filter(f=>f.properties.display.siteId&&f.properties.display.rebuilt).map(f=>f.id));
 return {type:'FeatureCollection',metadata:{...artifact.metadata.sections.metadata,method:'replacement-sites-and-direct-overlap',meaning:'Direct overlap except for explicitly linked replacement sites, which use illustrative complete fills. Draft site links remain provisional.'},features:[
  ...artifact.metadata.sections.features.filter(f=>!linked.has(f.properties.componentId)),
  ...artifact.metadata.filledSections.features.filter(f=>linked.has(f.properties.componentId)),
 ]};
}
