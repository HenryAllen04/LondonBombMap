import {describe,it,expect} from 'vitest';
import clipping from 'polygon-clipping';
import source from '../data/pimlico-overlay-source.json';
import {initialOverlay,overlayMatrix,applyMatrix,fromPlane,rectangleRing,toPlane} from '../lib/map-overlay';
import {newColours,generateMask,encodeMask,decodeMask,buildColourArtifact,exportColourOverlay,EXCLUDED} from '../lib/map-colours';

const definition={...source,exclusions:[]};
const config=()=>{const c=initialOverlay(definition);c.selection={x:1078,y:385,width:20,height:20};c.colours=newColours(c.selection,{snapshot:'fixed'});return c;};
const building=(c,r,id='test-building')=>({type:'Feature',id,properties:{buildingId:id,sourceName:id},geometry:{type:'Polygon',coordinates:[rectangleRing(r).map(p=>fromPlane(applyMatrix(overlayMatrix(c,definition.pivot),p)))]}});
const index=(c,rect=c.selection)=>({fingerprints:{snapshot:'fixed'},features:[building(c,rect)]});
const pixels=(w,h,fn)=>Uint8ClampedArray.from(Array.from({length:w*h},(_,i)=>[...fn(i%w,Math.floor(i/w)),255]).flat());

describe('paper colour extraction and complete building assignment',()=>{
 it('finds similar patches and allows connected-only sampling',()=>{
  const c=config(),s=c.colours,p=pixels(20,20,(x)=>x<5||x>14?[220,130,60]:[240,240,230]);
  s.samples=[{id:'orange',category:'blast',point:[1079,386],rgb:[220,130,60],scope:'area'}];
  let labels=generateMask(p,s);expect(labels[0]).toBe(5);expect(labels[19]).toBe(5);expect(labels[10]).toBe(0);
  s.samples[0].scope='patch';labels=generateMask(p,s);expect(labels[0]).toBe(5);expect(labels[19]).toBe(0);
  expect(decodeMask(encodeMask(labels),400)).toEqual(labels);
 });
 it('applies brushes after suggestions and keeps excluded evidence unknown',()=>{
  const c=config(),s=c.colours,p=pixels(20,20,()=>[220,130,60]);
  s.samples=[{id:'orange',category:'blast',point:[1079,386],rgb:[220,130,60],scope:'area'}];
  s.strokes=[{label:0,radius:2,points:[[1080,387]]},{label:1,radius:2,points:[[1090,397]]}];
  const mask=generateMask(p,s,[{x:1088,y:395,width:4,height:4}]);
  expect(mask[2*20+2]).toBe(0);expect(mask[12*20+12]).toBe(EXCLUDED);expect(mask[19]).toBe(5);
 });
 it('retains mixed categories and exports the whole footprint',()=>{
  const c=config(),mask=new Uint8Array(400);for(let y=0;y<20;y++)for(let x=0;x<20;x++)mask[y*20+x]=x<10?1:2;
  c.colours.runs=encodeMask(mask);const i=index(c),out=buildColourArtifact(c,definition,i),f=out.features[0];
  expect(f.properties.status).toBe('mixed');expect(f.properties.mixedCategories.sort()).toEqual(['beyond-repair','destroyed']);
  expect(f.geometry).toEqual(i.features[0].geometry);expect(f.properties.coverage).toBeCloseTo(1,5);
  expect(f.properties.historicallyVerified).toBe(false);
 });
 it('counts off-selection geometry in coverage and never paints from a sliver',()=>{
  const c=config();c.colours.runs=encodeMask(new Uint8Array(400).fill(5));
  const i=index(c,{...c.selection,width:80}),f=buildColourArtifact(c,definition,i).features[0];
  expect(f.properties.coverage).toBeCloseTo(.25,5);expect(f.properties.status).toBe('unresolved');expect(f.properties.outsideSelectionCoverage).toBeCloseTo(.75,5);
 });
 it('keeps a single colour for insignificant competing coverage',()=>{
  const c=config(),mask=new Uint8Array(400).fill(5);mask.fill(3,0,20);c.colours.runs=encodeMask(mask);
  const f=buildColourArtifact(c,definition,index(c)).features[0];expect(f.properties.status).toBe('single');expect(f.properties.category).toBe('blast');expect(f.properties.categories).toHaveLength(2);
 });
 it('protects the known watermark even when a submitted mask colours it',()=>{
  const c=config();c.colours.runs=encodeMask(new Uint8Array(400).fill(5));
  const d={...definition,exclusions:[c.selection]};const f=buildColourArtifact(c,d,index(c)).features[0];
  expect(f.properties.status).toBe('unresolved');expect(f.properties.excludedCoverage).toBeCloseTo(1,5);
 });
 it('retains source identity and recalculates overlap when alignment changes',()=>{
  const c=config();c.colours.runs=encodeMask(new Uint8Array(400).fill(5));const i=index(c),before=exportColourOverlay(c,definition,i);
  c.adjustment.east=10;const after=exportColourOverlay(c,definition,i);
  expect(after.colourAssignments.features[0].geometry).toEqual(before.colourAssignments.features[0].geometry);
  expect(after.colourAssignments.features[0].properties.coverage).toBeLessThan(before.colourAssignments.features[0].properties.coverage);
 });
 it('rejects stale grids, malformed masks and changed building snapshots',()=>{
  const c=config();c.colours.runs=[[0,401,5]];expect(()=>buildColourArtifact(c,definition,index(c))).toThrow('mask');
  c.colours.runs=[];c.colours.fingerprints={snapshot:'old'};expect(()=>buildColourArtifact(c,definition,index(c))).toThrow('building data changed');
  c.colours.fingerprints={snapshot:'fixed'};c.selection.width=21;expect(()=>buildColourArtifact(c,definition,index(c))).toThrow('selected area changed');
 });
});

const planarPolys=g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).map(p=>p.map(r=>r.map(toPlane)));
const polygonArea=ps=>ps.reduce((s,p)=>s+p.reduce((sum,r,i)=>{const value=Math.abs(r.reduce((a,v,j)=>{const n=r[(j+1)%r.length];return a+v[0]*n[1]-n[0]*v[1];},0)/2);return sum+(i?-value:value);},0),0);
describe('matched building sections',()=>{
 it('colours a small overlap below the whole-building threshold and retains the grey remainder',()=>{
  const c=config(),mask=new Uint8Array(400);mask.fill(4,0,80);c.colours.runs=encodeMask(mask);
  const i=index(c),a=buildColourArtifact(c,definition,i),parts=a.metadata.sections.features;
  expect(a.features[0].properties.status).toBe('unresolved');expect(parts).toHaveLength(2);
  expect(parts.find(p=>p.properties.category==='repairable').properties.coverage).toBeCloseTo(.2,6);
  expect(parts.find(p=>p.properties.kind==='unknown').properties.coverage).toBeCloseTo(.8,6);
  const overlap=clipping.intersection(...parts.map(p=>planarPolys(p.geometry)));
  expect(polygonArea(overlap)).toBeLessThan(1e-6);
  expect(polygonArea(clipping.union(...parts.map(p=>planarPolys(p.geometry))))).toBeCloseTo(polygonArea(planarPolys(i.features[0].geometry)),5);
 });
 it('keeps all six categories and respects holes and off-selection portions',()=>{
  const c=config(),mask=Uint8Array.from({length:400},(_,i)=>i%6+1);c.colours.runs=encodeMask(mask);
  const i=index(c,{...c.selection,width:40});
  i.features[0].geometry.coordinates.push(building(c,{x:1083,y:390,width:4,height:4}).geometry.coordinates[0].slice().reverse());
  const parts=buildColourArtifact(c,definition,i).metadata.sections.features;
  expect(new Set(parts.filter(p=>p.properties.category).map(p=>p.properties.category)).size).toBe(6);
  expect(parts.some(p=>p.properties.kind==='unknown')).toBe(true);
  expect(parts.reduce((sum,p)=>sum+p.properties.coverage,0)).toBeCloseTo(1,6);
  const union=clipping.union(...parts.map(p=>planarPolys(p.geometry)));
  expect(polygonArea(union)).toBeCloseTo(polygonArea(planarPolys(i.features[0].geometry)),5);
  const hole=planarPolys(building(c,{x:1083,y:390,width:4,height:4}).geometry);
  expect(polygonArea(clipping.intersection(union,hole))).toBeLessThan(1e-6);
 });
 it('leaves watermark-obscured portions unknown even when the mask labels them',()=>{
  const c=config();c.colours.runs=encodeMask(new Uint8Array(400).fill(6));
  const a=buildColourArtifact(c,{...definition,exclusions:[{...c.selection,width:10}]},index(c));
  const parts=a.metadata.sections.features;expect(parts).toHaveLength(2);
  expect(parts.find(f=>f.properties.category==='minor').properties.coverage).toBeCloseTo(.5,6);
  expect(parts.find(f=>f.properties.kind==='unknown').properties.coverage).toBeCloseTo(.5,6);
 });
});
