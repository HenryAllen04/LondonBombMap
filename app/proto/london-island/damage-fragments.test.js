import { describe,it,expect } from 'vitest';
import { roofFragments } from './damage-fragments';
const box=(x0,y0,x1,y1)=>({type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]});
const source=(id,geometry)=>({type:'Feature',properties:{id},geometry});
const candidate=(id,category)=>({id,category,color:category==='minor'?'#e4c75d':'#e4a462'});
function area(fragments){return fragments.flatMap(f=>f.geometry.coordinates).reduce((sum,p)=>sum+p.reduce((total,ring,index)=>{let a=0;for(let i=1;i<ring.length;i++)a+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];return total+(index?-1:1)*Math.abs(a/2);},0),0);}
describe('partial roof colours',()=>{
 it('clips a small draft patch to the roof without filling the whole building',()=>{
  const result=roofFragments(box(0,0,10,10),[candidate('a','minor')],[source('a',box(9,3,12,5))]);
  expect(area(result)).toBe(2);expect(result[0].category).toBe('minor');
 });
 it('leaves conflicting categories uncoloured',()=>{
  const result=roofFragments(box(0,0,10,10),[candidate('a','minor'),candidate('b','blast')],[source('a',box(0,0,6,10)),source('b',box(4,0,10,10))]);
  expect(area(result)).toBe(80);expect(result).toHaveLength(2);
 });
 it('unions same-category patches instead of drawing duplicate caps',()=>{
  const result=roofFragments(box(0,0,10,10),[candidate('a','minor'),candidate('b','minor')],[source('a',box(0,0,6,10)),source('b',box(4,0,10,10))]);
  expect(result).toHaveLength(1);expect(area(result)).toBe(100);
 });
 it('preserves a courtyard as an uncoloured hole',()=>{
  const roof=box(0,0,10,10);roof.coordinates.push(box(3,3,7,7).coordinates[0]);
  expect(area(roofFragments(roof,[candidate('a','minor')],[source('a',box(-1,-1,11,11))]))).toBe(84);
 });
});
