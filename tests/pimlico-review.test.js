import {describe,it,expect} from 'vitest';
import {DEFAULT_ADJUSTMENT,reviewPlacement,sectionGeometry,exportReview,targetGeometry} from '../lib/pimlico-review';
import study from '../data/pimlico-local-study.json';
const ring=[[-.142,51.488],[-.141,51.488],[-.141,51.489],[-.142,51.489]];
const geometry={type:'Polygon',coordinates:[[...ring,ring[0]]]};
const building={id:'component',geometry,properties:{buildingId:'source-id'},renderPieces:[{id:'part',geometry}]};
const index={fingerprints:{modern:'snapshot'},features:[building]};
const assignment=(patch={})=>({id:'assignment',name:'Northern wing',rowId:study.areas[0].id,relationship:'surviving',reviewStatus:'reviewed',reviewer:'Reviewer',evidence:'Reviewed corner correspondence',targets:[{kind:'building',componentId:'component'}],...patch});
const config=(patch={})=>({schemaVersion:1,sourceImageSha256:study.sourceImage.sha256,fingerprints:index.fingerprints,points:structuredClone(study.points),adjustment:{...DEFAULT_ADJUSTMENT},assignments:[assignment()],...patch});
describe('explicit historical correspondence authoring',()=>{
 it('exports the entire chosen object instead of its historical overlap',()=>{
  const exported=exportReview(config(),index,study).features[0];
  expect(exported.geometry).toEqual(geometry);expect(exported.properties.historicalGeometry).not.toEqual(geometry);
  expect(exported.properties.paintEligible).toBe(true);expect(exported.properties.buildingId).toBe('source-id');
 });
 it('keeps section boundaries within the chosen parent and supports supplied parts',()=>{
  const section=sectionGeometry(building,[[-.143,51.4885],[-.140,51.4885],[-.140,51.490],[-.143,51.490]]);
  expect(Math.min(...section.coordinates.flat(2).map(p=>p[1]))).toBeCloseTo(51.4885);
  expect(Math.max(...section.coordinates.flat(2).map(p=>p[1]))).toBeCloseTo(51.489);
  expect(targetGeometry({kind:'part',componentId:'component',partId:'part'},index).geometry).toEqual(geometry);
  expect(()=>targetGeometry({kind:'part',componentId:'component',partId:'missing'},index)).toThrow('supplied');
 });
 it('rejects self-crossing and disjoint section polygons',()=>{
  expect(()=>sectionGeometry(building,[ring[0],ring[2],ring[1],ring[3]])).toThrow('crosses');
  expect(()=>sectionGeometry(building,ring.map(([x,y])=>[x+.01,y]))).toThrow('does not touch');
 });
 it('preserves authored object geometry when only the historical alignment changes',()=>{
  const first=exportReview(config(),index,study),second=exportReview(config({adjustment:{...DEFAULT_ADJUSTMENT,east:3}}),index,study);
  expect(first.features[0].geometry).toEqual(second.features[0].geometry);
  expect(first.features[0].properties.historicalGeometry).not.toEqual(second.features[0].properties.historicalGeometry);
  expect(first.features[0].id).toBe(second.features[0].id);
 });
 it('keeps an authored target ID when other targets are removed',()=>{
  const targets=[{id:'whole',kind:'building',componentId:'component'},{id:'roof',kind:'part',componentId:'component',partId:'part'}];
  const before=exportReview(config({assignments:[assignment({targets})]}),index,study);
  const after=exportReview(config({assignments:[assignment({targets:targets.slice(1)})]}),index,study);
  expect(after.features[0].id).toBe(before.features[1].id);
 });
 it('never makes a rebuilt link or unreviewed assignment paint eligible',()=>{
  for(const patch of [{relationship:'rebuilt'},{reviewStatus:'draft'}])expect(exportReview(config({assignments:[assignment(patch)]}),index,study).features[0].properties.paintEligible).toBe(false);
 });
 it('blocks conflicting category assignments to the same modern object',()=>{
  const other=assignment({id:'other',rowId:study.areas[1].id});
  const output=exportReview(config({assignments:[assignment(),other]}),index,study);
  expect(output.features.every(f=>f.properties.paintEligible===false)).toBe(true);
  expect(output.features[0].properties.conflicts).toEqual(['other']);
 });
 it('rejects duplicated fit/check features and stale source fingerprints',()=>{
  const points=structuredClone(study.points);points[3].coordinates=points[0].coordinates;
  expect(()=>exportReview(config({points}),index,study)).toThrow('duplicated');
  expect(()=>exportReview(config({fingerprints:{modern:'old'}}),index,study)).toThrow('snapshot changed');
 });
 it('requires attributed evidence for a reviewed correspondence',()=>{
  expect(()=>exportReview(config({assignments:[assignment({evidence:''})]}),index,study)).toThrow('evidence');
 });
 it('does not fit check-only points',()=>{
  const changed=study.points.map(p=>p.role==='check'?{...p,coordinates:[p.coordinates[0]+.001,p.coordinates[1]]}:p);
  expect(reviewPlacement(changed,DEFAULT_ADJUSTMENT)([700,350])).toEqual(reviewPlacement(study.points,DEFAULT_ADJUSTMENT)([700,350]));
 });
});
