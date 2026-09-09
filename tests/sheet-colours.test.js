import {describe,it,expect} from 'vitest';
import source from '../data/pimlico-overlay-source.json';
import {initialOverlay} from '../lib/map-overlay';
import {extractSheet,extractSheetMask} from '../lib/sheet-colours';
import {newColours,generateMask} from '../lib/map-colours';
const pixels=(w,h,fn)=>Uint8ClampedArray.from(Array.from({length:w*h},(_,i)=>[...fn(i%w,Math.floor(i/w)),255]).flat());
describe('full-sheet colour extraction',()=>{
 it('excludes black backing and retains source/registration provenance in the full export',()=>{
  const definition={...source,source:{...source.source,width:12,height:12},exclusions:[],mapExtent:{x:3,y:3,width:6,height:6}};
  const rgba=pixels(12,12,(x,y)=>x>=3&&x<9&&y>=3&&y<9?[224,149,62]:[20,20,20]);
  const result=extractSheet(rgba,initialOverlay(source),definition);
  expect(result.features.some(f=>f.properties.category==='destroyed')).toBe(false);
  expect(result.features.filter(f=>f.properties.category==='blast')).toHaveLength(1);
  expect(result.metadata.colours.find(c=>c.category==='blast').pixels).toBe(36);
  expect(result.metadata.source.sha256).toBe(source.source.sha256);
  expect(result.metadata.alignment.scope).toContain('extrapolated');
 });
 it('matches untiled detection across tile seams, including dark fills and small connected patches',()=>{
  const width=23,height=17,rgba=pixels(width,height,(x,y)=>x<5?[47,44,62]:y<8?[224,149,62]:[74,57,161]);
  const exclusions=[{x:10,y:10,width:3,height:4}],settings={...newColours({x:0,y:0,width,height},{}),automatic:{version:1},minPatch:3};
  const expected=generateMask(rgba,settings,exclusions);
  for(const tileSize of [2,4,8,16])expect(extractSheetMask(rgba,width,height,{tileSize,exclusions}).labels).toEqual(expected);
 });
 it('filters small patches after joining tiles and retains excluded areas',()=>{
  const rgba=pixels(8,8,(x,y)=>y===3&&x>=2&&x<=5?[224,149,62]:[240,230,210]);
  const a=extractSheetMask(rgba,8,8,{tileSize:4,minPatch:4});expect(a.labels[3*8+3]).toBe(5);expect(a.components[3*8+3]).toBe(a.components[3*8+4]);
  const b=extractSheetMask(rgba,8,8,{tileSize:4,minPatch:5,exclusions:[{x:0,y:0,width:1,height:1}]});expect(b.labels[3*8+3]).toBe(0);expect(b.labels[0]).toBe(255);
 });
});
