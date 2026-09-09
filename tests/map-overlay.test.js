import {describe,it,expect} from 'vitest';
import definition from '../data/pimlico-overlay-source.json';
import {initialOverlay,overlayMatrix,exportOverlay,applyMatrix,invertMatrix,fitOverlay,fromPlane} from '../lib/map-overlay';

describe('selected sheet alignment',()=>{
 it('fits a move/rotation/uniform scale and inverts source pixels',()=>{
  const expected=[2,.5,-.5,2,-1500,-750];
  const points=[[1000,400],[1200,400],[1100,600]].map((pixel,i)=>({id:String(i),role:'fit',pixel,coordinates:fromPlane(applyMatrix(expected,pixel))}));
  const matrix=fitOverlay(points,'similarity');
  matrix.forEach((n,i)=>expect(n).toBeCloseTo(expected[i],6));
  const pixel=[1142.7,436.2],roundtrip=applyMatrix(invertMatrix(matrix),applyMatrix(matrix,pixel));
  roundtrip.forEach((n,i)=>expect(n).toBeCloseTo(pixel[i],8));
 });
 it('preserves sheet placement when a different crop is selected',()=>{
  const config=initialOverlay(definition),first=exportOverlay(config,definition);
  config.selection={x:1050,y:360,width:150,height:150};
  const second=exportOverlay(config,definition);
  expect(second.metadata.transform).toEqual(first.metadata.transform);
  expect(second.features[0].geometry).not.toEqual(first.features[0].geometry);
 });
 it('moves the paper in metres with north pointing up',()=>{
  const config=initialOverlay(definition),first=overlayMatrix(config,definition.pivot);
  config.adjustment.east=6;config.adjustment.north=-1;
  const second=overlayMatrix(config,definition.pivot);
  const a=applyMatrix(first,[1120,420]),b=applyMatrix(second,[1120,420]);
  expect(b[0]-a[0]).toBeCloseTo(6,7);expect(b[1]-a[1]).toBeCloseTo(1,7);
 });
 it('does not use held-out check points to fit the image',()=>{
  const config=initialOverlay(definition),first=exportOverlay(config,definition);
  config.points.find(p=>p.role==='check').coordinates[0]+=.0001;
  const second=exportOverlay(config,definition);
  expect(second.metadata.transform).toEqual(first.metadata.transform);
  expect(second.metadata.checks.rmseMetres).not.toBe(first.metadata.checks.rmseMetres);
 });
 it('exports a reusable geographic boundary and full transform through JSON roundtrip',()=>{
  const config=initialOverlay(definition);config.model='affine';config.adjustment={east:3,north:2,rotation:4,scale:1.05};
  const artifact=exportOverlay(config,definition),saved=JSON.parse(JSON.stringify({...config,artifact}));
  expect(exportOverlay(saved,definition)).toEqual(artifact);
  expect(artifact.features[0].geometry.coordinates[0]).toHaveLength(5);
  expect(artifact.features[0].geometry.coordinates[0][0][0]).toBeGreaterThan(-.16);
  expect(artifact.metadata.checks.count).toBe(3);
 });
 it('rejects stale image identity, out-of-sheet crops and duplicate checkpoints',()=>{
  const config=initialOverlay(definition);
  expect(()=>exportOverlay({...config,source:{...config.source,sha256:'wrong'}},definition)).toThrow('different source');
  expect(()=>exportOverlay({...config,selection:{x:2050,y:20,width:20,height:30}},definition)).toThrow('inside the sheet');
  config.points[3].pixel=[...config.points[0].pixel];
  expect(()=>exportOverlay(config,definition)).toThrow('independent check');
 });
 it('rejects a degenerate fit and out-of-range adjustments',()=>{
  const config=initialOverlay(definition);
  expect(()=>exportOverlay({...config,adjustment:{...config.adjustment,scale:0}},definition)).toThrow('supported range');
  config.points.filter(p=>p.role==='fit').forEach((p,i)=>{p.pixel=[100+i*20,100];});
  expect(()=>exportOverlay(config,definition)).toThrow('collinear');
 });
});
