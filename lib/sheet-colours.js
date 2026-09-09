import clipping from 'polygon-clipping';
import {generateMask,newColours,COLOUR_CLASSES} from './map-colours.js';
import {applyMatrix,fromPlane,overlayMatrix,rectangleRing} from './map-overlay.js';

export function extractSheetMask(rgba,width,height,{tileSize=256,minPatch=3,exclusions=[],progress=()=>{}}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>16000000||rgba.length!==width*height*4)throw new Error('Unsupported source image size.');
 if(!Number.isInteger(tileSize)||tileSize<2||tileSize>256||!Number.isInteger(minPatch)||minPatch<1||minPatch>40)throw new Error('Invalid sheet extraction settings.');
 const labels=new Uint8Array(width*height);let done=0;const tiles=Math.ceil(width/tileSize)*Math.ceil(height/tileSize);
 for(let y=0;y<height;y+=tileSize)for(let x=0;x<width;x+=tileSize){
  // A one-pixel halo keeps the dark-ink neighbourhood filter identical at tile seams.
  const left=Math.max(0,x-1),top=Math.max(0,y-1),right=Math.min(width,x+tileSize+1),bottom=Math.min(height,y+tileSize+1),w=right-left,h=bottom-top;
  const pixels=new Uint8ClampedArray(w*h*4);
  for(let row=0;row<h;row++)pixels.set(rgba.subarray(((top+row)*width+left)*4,((top+row)*width+right)*4),row*w*4);
  const settings={...newColours({x:left,y:top,width:w,height:h},{}),automatic:{version:1},minPatch:1};
  const tile=generateMask(pixels,settings,exclusions);
  for(let row=y;row<Math.min(height,y+tileSize);row++)labels.set(tile.subarray((row-top)*w+x-left,(row-top)*w+Math.min(width,x+tileSize)-left),row*width+x);
  progress({phase:'Reading colours',completed:++done,total:tiles});
 }
 // Resolve connected regions across all tile boundaries before removing small patches.
 const components=new Int32Array(labels.length),queue=new Int32Array(labels.length),regions=[];
 for(let i=0;i<labels.length;i++)if(labels[i]&&!components[i]){
  const label=labels[i],id=regions.length+1;let size=1;queue[0]=i;components[i]=id;
  for(let q=0;q<size;q++){
   const p=queue[q],x=p%width;
   for(const n of [x?p-1:-1,x<width-1?p+1:-1,p>=width?p-width:-1,p+width<labels.length?p+width:-1])if(n>=0&&!components[n]&&labels[n]===label){components[n]=id;queue[size++]=n;}
  }
  regions.push({id,label,start:i,pixels:size});
  if(size<minPatch&&label!==255)for(let q=0;q<size;q++)labels[queue[q]]=0;
 }
 return {labels,components,regions};
}
export function extractSheet(rgba,config,definition,progress=()=>{}){
 const {width,height}=definition.source,minPatch=config.colours?.minPatch??3;
 const extent=definition.mapExtent,exclusions=[...(definition.exclusions??[])];
 if(extent)exclusions.push({x:0,y:0,width:extent.x,height,reason:'Outside map frame'},{x:extent.x+extent.width,y:0,width:width-extent.x-extent.width,height,reason:'Outside map frame'},{x:0,y:0,width,height:extent.y,reason:'Outside map frame'},{x:0,y:extent.y+extent.height,width,height:height-extent.y-extent.height,reason:'Outside map frame'});
 const {labels,components,regions}=extractSheetMask(rgba,width,height,{minPatch,exclusions,progress});
 const rows=new Map();
 for(let y=0;y<height;y++)for(let x=0;x<width;){
  const start=x,id=components[y*width+x],label=labels[y*width+x];while(x<width&&components[y*width+x]===id)x++;
  if(label){const group=rows.get(id)??[];group.push({x:start,y,width:x-start,height:1});rows.set(id,group);}
 }
 const matrix=overlayMatrix(config,definition.pivot),project=p=>fromPlane(applyMatrix(matrix,p)),features=[];
 for(const [id,rects] of rows){
  const pieces=[];for(let i=0;i<rects.length;i+=256)pieces.push(clipping.union(...rects.slice(i,i+256).map(r=>[[rectangleRing(r)]])));
  const merged=pieces.length===1?pieces[0]:clipping.union(...pieces),region=regions[id-1];
  features.push({type:'Feature',id:`sheet-${region.label}-${region.start}`,properties:{category:region.label===255?'excluded':COLOUR_CLASSES[region.label-1].id,sourcePixelCount:region.pixels,historicallyVerified:false},geometry:{type:'MultiPolygon',coordinates:merged.map(p=>p.map(r=>r.map(project)))}});
  if(features.length%100===0)progress({phase:'Joining colour regions',completed:features.length,total:rows.size});
 }
 return {type:'FeatureCollection',metadata:{meaning:'Automatic historical colour regions across the full source image; not modern-building assignments',source:definition.source,automatic:{version:1,minPatch},alignment:{model:config.model,points:config.points,adjustment:config.adjustment,pivot:definition.pivot,locallySelectedArea:config.selection,scope:'Local alignment extrapolated across the sheet; independent checks required outside the selected area'},mapExtent:extent,exclusions,manualCorrectionsIncluded:false,colours:COLOUR_CLASSES.map((c,i)=>({category:c.id,pixels:regions.filter(r=>r.label===i+1&&r.pixels>=minPatch).reduce((s,r)=>s+r.pixels,0)}))},features};
}
