import { describe, expect, it } from 'vitest';
import { fitAffine, applyAffine, evaluateRegistration } from '../lib/registration';
const grid=([x,y])=>[530000+2*x+.1*y,179000-.2*x-2*y];
const point=(id,pixel,role='fit')=>({id,pixel,grid:grid(pixel),role,reviewer:'Test reviewer',sourceReference:'Synthetic test only'});
const data=points=>({schemaVersion:1,crs:'EPSG:27700',sourceImage:{id:'synthetic-test',sha256:'a'.repeat(64)},medianFrontageMetres:6,points});
describe('held-out image registration',()=>{
 it('fits all supplied anchors instead of silently using only three',()=>{
  const points=[point('a',[0,0]),point('b',[100,0]),point('c',[0,100]),point('d',[100,100])];points[3].grid[0]+=4;
  const model=fitAffine(points);
  expect(applyAffine(model,[100,100])[0]).toBeCloseTo(grid([100,100])[0]+3);
 });
 it('reports independent errors even when fitting error is zero',()=>{
  const points=[point('a',[0,0]),point('b',[100,0]),point('c',[0,100]),point('d',[50,50],'check')];points[3].grid[0]+=10;
  const result=evaluateRegistration(data(points));
  expect(result.fit.rmseMetres).toBeLessThan(.0001);expect(result.heldOut.rmseMetres).toBeCloseTo(10);expect(result.state).toBe('needs-review');
 });
 it('rejects fitting/check leakage and collinear fitting geometry',()=>{
  expect(()=>evaluateRegistration(data([point('a',[0,0]),point('b',[0,0],'check')]))).toThrow('duplicated');
  expect(()=>fitAffine([point('a',[0,0]),point('b',[1,1]),point('c',[2,2])])).toThrow('collinear');
 });
 it('leaves absent measurements null rather than reporting zero accuracy',()=>{
  const result=evaluateRegistration(data([]));expect(result.state).toBe('pending');expect(result.heldOut).toBeNull();expect(result.fit).toBeNull();
 });
 it('meets only the registration gate after the full independent test budget',()=>{
  const fit=Array.from({length:12},(_,i)=>point(`fit-${i}`,[(i%4)*100,Math.floor(i/4)*100]));
  const check=Array.from({length:8},(_,i)=>point(`check-${i}`,[(i%4)*100+40,Math.floor(i/4)*100+40],'check'));
  const result=evaluateRegistration(data([...fit,...check]));expect(result.state).toBe('registration-gate-met');expect(result).not.toHaveProperty('verified');
 });
});
