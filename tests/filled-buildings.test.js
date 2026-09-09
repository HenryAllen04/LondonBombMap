import {describe,it,expect} from 'vitest';
import clipping from 'polygon-clipping';
import {fillBuilding,polygonArea} from '../lib/filled-buildings';
const rect=(x,y,w,h)=>[[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]];
const evidence=(category,coverage,coordinates)=>({category,coverage,coordinates});
function verifyPartition(original,parts){
 expect(polygonArea(clipping.union(...parts.map(p=>p.coordinates)))).toBeCloseTo(polygonArea(original),5);
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)expect(polygonArea(clipping.intersection(parts[i].coordinates,parts[j].coordinates))).toBeLessThan(1e-6);
 expect(parts.reduce((s,p)=>s+p.coverage,0)).toBeCloseTo(1,6);
}
describe('complete building surface fills',()=>{
 it('fills the object with clean pink/purple divisions in the matched proportions and spatial order',()=>{
  const shape=rect(0,0,100,10),parts=fillBuilding(shape,[evidence('repairable',.6,rect(0,2,60,6)),evidence('beyond-repair',.2,rect(80,2,20,6))]);
  verifyPartition(shape,parts);expect(parts).toHaveLength(2);
  expect(parts[0].category).toBe('repairable');expect(parts[0].coverage).toBeCloseTo(.75,6);
  expect(parts[1].category).toBe('beyond-repair');expect(parts[1].coverage).toBeCloseTo(.25,6);
  expect(parts[0].coordinates[0][0]).toHaveLength(5);
 });
 it('keeps all six colours, including small shares, without extending beyond the footprint',()=>{
  const shape=rect(0,0,60,10),colours=['destroyed','beyond-repair','doubtful','repairable','blast','minor'];
  const parts=fillBuilding(shape,colours.map((c,i)=>evidence(c,i===5?.001:.1,rect(i*10,2,5,5))));
  verifyPartition(shape,parts);expect(parts.map(p=>p.category)).toEqual(colours);expect(parts.at(-1).coverage).toBeGreaterThan(0);
 });
 it('preserves courtyards and separate components in the complete partition',()=>{
  const shape=[...rect(0,0,30,30),...rect(40,0,10,10)];shape[0].push(rect(5,5,20,20)[0][0].slice().reverse());
  const parts=fillBuilding(shape,[evidence('blast',.2,rect(0,0,5,30)),evidence('repairable',.5,rect(40,0,10,10))]);
  verifyPartition(shape,parts);expect(polygonArea(clipping.intersection(clipping.union(...parts.map(p=>p.coordinates)),rect(5,5,20,20)))).toBeLessThan(1e-6);
 });
 it('fills one detected colour, but leaves a building with no evidence unknown',()=>{
  const shape=rect(0,0,10,10);
  const filled=fillBuilding(shape,[evidence('blast',.12,rect(2,2,2,6))]);expect(filled[0].coordinates).toEqual(shape);expect(filled[0].sourceCoverage).toBe(.12);
  expect(fillBuilding(shape,[])[0].category).toBe(null);
 });
});
