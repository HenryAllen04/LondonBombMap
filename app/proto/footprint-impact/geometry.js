import clipping from 'polygon-clipping';
import {polygonArea} from '@/lib/filled-buildings';
import {applyMatrix,overlayMatrix,toPlane,fromPlane} from '@/lib/map-overlay';
import {COLOUR_CLASSES,buildColourArtifact,displayedSections} from '@/lib/map-colours';

export const polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
export const path=coordinates=>coordinates.flatMap(p=>p.map(r=>r.map((v,i)=>`${i?'L':'M'}${v[0]},${v[1]}`).join(' ')+'Z')).join(' ');
export const area=polygonArea;
const union=items=>items.length?clipping.union(...items):[];
export const colour=id=>COLOUR_CLASSES.find(c=>c.id===id)?.colour??'#b8b8ac';
export const fmt=n=>Math.round(n).toLocaleString('en-GB');

export function partition(history,modern) {
  return {overlap:clipping.intersection(history,modern),outside:clipping.difference(history,modern),neutral:clipping.difference(modern,history)};
}

export function makeStudy(config,definition,index,site) {
  const artifact=buildColourArtifact(config,definition,index);
  const matrix=overlayMatrix(config,definition.pivot);
  const centre=applyMatrix(matrix,site.boundary.reduce((a,p)=>[a[0]+p[0]/site.boundary.length,a[1]+p[1]/site.boundary.length],[0,0]));
  const local=p=>{const q=toPlane(p);return q.map((v,i)=>Math.round((v-centre[i])*1e6)/1e6);};
  const pixel=p=>applyMatrix(matrix,p).map((v,i)=>v-centre[i]);
  const geographic=p=>fromPlane(p.map((v,i)=>v+centre[i]));
  const convert=g=>polys(g).map(p=>p.map(r=>r.map(local)));
  const scope=[[[...site.boundary,site.boundary[0]].map(pixel)]];
  const buildings=index.features.map(b=>({...b,coordinates:clipping.intersection(convert(b.geometry),scope)})).filter(b=>area(b.coordinates)>.001);
  const modern=union(buildings.map(b=>b.coordinates));
  const regions=artifact.metadata.colourRegions.features.map(f=>({category:f.properties.category,coordinates:clipping.intersection(convert(f.geometry),scope)})).filter(f=>area(f.coordinates)>.000001);
  const known=regions.filter(f=>f.category!=='excluded'),history=union(known.map(f=>f.coordinates));
  const excluded=union(regions.filter(f=>f.category==='excluded').map(f=>f.coordinates));
  const parts=partition(history,modern);
  const fragments=known.map(f=>({...f,...partition(f.coordinates,modern)}));
  const pieces=buildings.flatMap(b=>b.renderPieces.map(p=>{
    const coordinates=clipping.intersection(convert(p.geometry),scope),height=p.height;
    return {id:p.id,componentId:b.id,coordinates,height,
      neutral:clipping.difference(coordinates,history),
      overlap:known.map(r=>({category:r.category,coordinates:clipping.intersection(coordinates,r.coordinates)})).filter(r=>r.coordinates.length)};
  })).filter(p=>p.coordinates.length);
  const metrics={history:area(history),overlap:area(parts.overlap),outside:area(parts.outside),modern:area(modern),neutral:area(parts.neutral),excluded:area(clipping.intersection(modern,excluded))};
  const points=scope.flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const ids=new Set(buildings.map(b=>b.id)),mode=config.colours.surfaceMode??'site-aware';
  const baseline=displayedSections(artifact,mode).features.filter(f=>ids.has(f.properties.componentId)).map(f=>({
    ...f,geometry:{type:'MultiPolygon',coordinates:clipping.intersection(convert(f.geometry),scope).map(p=>p.map(r=>r.map(geographic)))},color:colour(f.properties.category),stripes:[],
  })).filter(f=>f.geometry.coordinates.length);
  return {scope,modern,regions,fragments,pieces,parts,metrics,bounds,centre,matrix,pixel,geographic,baseline,baselineMode:mode,
    buildings:buildings.map(b=>({...b,geometry:{type:'MultiPolygon',coordinates:b.coordinates.map(p=>p.map(r=>r.map(geographic)))}})),
    classes:COLOUR_CLASSES.filter(c=>known.some(r=>r.category===c.id)),
    source:definition.source,config,site,
  };
}

export function exportStudy(study) {
  const features=[];
  function add(coordinates,kind,category=null) {
    if(!coordinates.length)return;
    features.push({type:'Feature',geometry:{type:'MultiPolygon',coordinates:coordinates.map(p=>p.map(r=>r.map(study.geographic)))},properties:{kind,category,areaSquareMetres:area(coordinates),historicallyVerified:false}});
  }
  for(const fragment of study.fragments){add(fragment.overlap,'overlapping-damage',fragment.category);add(fragment.outside,'damage-outside-modern',fragment.category);}
  add(study.parts.neutral,'modern-without-classified-damage');
  return {type:'FeatureCollection',features,metadata:{meaning:'Plan-area intersections from draft colour evidence; roof projection is counterfactual, not a blast simulation or proof of surviving buildings.',sourceImageSha256:study.source.sha256,alignment:study.config.adjustment,landmarks:study.config.points,model:study.config.model,scope:study.scope.map(p=>p.map(r=>r.map(study.geographic))),metrics:study.metrics}};
}
