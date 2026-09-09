import {describe,it,expect} from 'vitest';
import source from '../data/pimlico-overlay-source.json';
import {initialOverlay,overlayMatrix,applyMatrix,fromPlane,rectangleRing} from '../lib/map-overlay';
import {newColours,encodeMask,buildColourArtifact,COLOUR_CLASSES,displayedSections} from '../lib/map-colours';
import {invalidateSites} from '../lib/historical-sites';
const definition={...source,exclusions:[]};
function fixture(){
 const c=initialOverlay(definition);c.selection={x:1078,y:385,width:20,height:20};c.colours=newColours(c.selection,{test:'fixed'});
 // Six historical rows beside a courtyard occupied by the modern replacement.
 const labels=new Uint8Array(400);for(let y=0;y<18;y++)for(let x=0;x<6;x++)labels[y*20+x]=Math.floor(y/3)+1;
 c.colours.runs=encodeMask(labels);
 const geometry={type:'Polygon',coordinates:[rectangleRing({x:1088,y:390,width:5,height:10}).map(p=>fromPlane(applyMatrix(overlayMatrix(c,definition.pivot),p)))]};
 const index={fingerprints:{test:'fixed'},features:[{type:'Feature',id:'replacement',properties:{buildingId:'replacement'},geometry}]};
 c.colours.sites=[{id:'old-site',name:'Old rows and courtyard',boundary:rectangleRing(c.selection).slice(0,-1),targets:['replacement'],relationship:'rebuilt-site',note:'User identified replacement; geometry checked against paper',review:'draft'}];
 return {c,index};
}
describe('historical sites linked to modern replacements',()=>{
 it('links all six colours outside the modern footprint without changing either geometry',()=>{
  const {c,index}=fixture(),mask=c.colours.runs,geometry=index.features[0].geometry;
  const out=buildColourArtifact(c,definition,index),f=out.features[0];
  expect(f.properties.coverage).toBe(0);expect(f.properties.status).toBe('unresolved');
  expect(f.properties.display.categories).toEqual(COLOUR_CLASSES.map(c=>c.id));
  expect(f.properties.display.rebuilt).toBe(true);expect(f.properties.display.basis).toBe('draft-site');expect(f.properties.display.paintEligible).toBe(false);
  expect(f.geometry).toEqual(geometry);expect(c.colours.runs).toEqual(mask);
  expect(out.metadata.sites.features[0].properties.categories).toHaveLength(6);
  expect(out.metadata.filledSections.features.map(f=>f.properties.category).sort()).toEqual(COLOUR_CLASSES.map(c=>c.id).sort());
  expect(out.metadata.filledSections.features.reduce((sum,f)=>sum+f.properties.coverage,0)).toBeCloseTo(1,6);
  expect(out.metadata.filledSections.features.every(f=>f.properties.evidenceBasis==='draft-site')).toBe(true);
 });
 it('requires checked notes for adoption and invalidates checks on evidence changes',()=>{
  const {c,index}=fixture();c.colours.sites[0].review='checked';
  expect(buildColourArtifact(c,definition,index).features[0].properties.display.paintEligible).toBe(true);
  c.colours.sites=invalidateSites(c.colours.sites);
  expect(buildColourArtifact(c,definition,index).features[0].properties.display.paintEligible).toBe(false);
  c.colours.sites[0].review='checked';c.colours.sites[0].note='';expect(()=>buildColourArtifact(c,definition,index)).toThrow('evidence notes');
 });
 it('keeps minor colours despite mixed-share rules and protects excluded evidence',()=>{
  const {c,index}=fixture();const mask=new Uint8Array(400);mask.fill(1,0,399);mask[399]=6;c.colours.runs=encodeMask(mask);c.colours.rules.mixedShare=.45;
  const out=buildColourArtifact(c,definition,index);expect(out.features[0].properties.display.categories).toEqual(['destroyed','minor']);
  const excluded=buildColourArtifact(c,{...definition,exclusions:[c.selection]},index);
  expect(excluded.features[0].properties.display.categories).toEqual([]);expect(excluded.metadata.sites.features[0].properties.excludedCoverage).toBeCloseTo(1);
 });
 it('does not assign site colours to unlinked neighbours and roundtrips through JSON',()=>{
  const {c,index}=fixture();index.features.push({...index.features[0],id:'neighbour',properties:{buildingId:'neighbour'}});
  const out=buildColourArtifact(JSON.parse(JSON.stringify(c)),definition,index);
  expect(out.features.find(f=>f.id==='neighbour').properties.display.categories).toEqual([]);
  expect(out.metadata.sites.features[0].properties.targets).toEqual(['replacement']);
 });
 it('rejects self-crossing boundaries, duplicate targets and unrelated buildings',()=>{
  const {c,index}=fixture(),site=c.colours.sites[0];
  site.boundary=[[1078,385],[1098,405],[1078,405],[1098,385]];
  expect(()=>buildColourArtifact(c,definition,index)).toThrow();
  site.boundary=rectangleRing(c.selection).slice(0,-1);site.targets.push('replacement');expect(()=>buildColourArtifact(c,definition,index)).toThrow('only one');
  site.targets=['replacement'];site.boundary=[[1078,385],[1080,385],[1080,387],[1078,387]];expect(()=>buildColourArtifact(c,definition,index)).toThrow('must touch');
 });
});

describe('3D colour technique comparisons',()=>{
 it('keeps all six site colours on a linked replacement, with unknown neighbours unchanged',()=>{
  const {c,index}=fixture();index.features.push({...index.features[0],id:'neighbour',properties:{buildingId:'neighbour'}});
  const snapshot=JSON.stringify(c),out=buildColourArtifact(c,definition,index),balanced=displayedSections(out,'site-aware');
  const replacement=balanced.features.filter(f=>f.properties.componentId==='replacement');
  expect(replacement.map(f=>f.properties.category).sort()).toEqual(COLOUR_CLASSES.map(c=>c.id).sort());
  expect(replacement.every(f=>f.properties.kind==='inferred-building-fill'&&f.properties.evidenceBasis==='draft-site')).toBe(true);
  expect(replacement.reduce((n,f)=>n+f.properties.coverage,0)).toBeCloseTo(1,6);
  const neighbour=balanced.features.filter(f=>f.properties.componentId==='neighbour');
  expect(neighbour).toEqual(out.metadata.sections.features.filter(f=>f.properties.componentId==='neighbour'));
  expect(neighbour[0].properties.category).toBe(null);
  expect(displayedSections(out,'overlap').features.every(f=>f.properties.category===null)).toBe(true);
  expect(JSON.stringify(c)).toBe(snapshot);
 });
 it('preserves large unknown corners and exclusions while full fill remains an explicit alternative',()=>{
  const {c,index}=fixture();c.colours.sites=[];
  const mask=new Uint8Array(400);for(let y=5;y<8;y++)for(let x=10;x<15;x++)mask[y*20+x]=5;
  c.colours.runs=encodeMask(mask);
  const out=buildColourArtifact(c,{...definition,exclusions:[{x:1088,y:397,width:5,height:3}]},index);
  const balanced=displayedSections(out,'site-aware');
  expect(balanced.features).toEqual(out.metadata.sections.features);
  expect(balanced.features.find(f=>f.properties.category===null).properties.coverage).toBeCloseTo(.7,5);
  expect(displayedSections(out,'filled').features).toHaveLength(1);
  expect(displayedSections(out,'filled').features[0].properties.coverage).toBeCloseTo(1);
 });
 it('does not extrapolate uncertain or surviving-site links in the balanced view, and accepts the saved choice',()=>{
  for(const relationship of ['uncertain','surviving-site']){
   const {c,index}=fixture();c.colours.sites[0].relationship=relationship;c.colours.surfaceMode='site-aware';
   const out=buildColourArtifact(JSON.parse(JSON.stringify(c)),definition,index);
   expect(displayedSections(out).features).toEqual(out.metadata.sections.features);
  }
 });
});
