import { describe, expect, it } from 'vitest';
import { createMatcher } from './matching';

function rect(x,y,w,h) { return {type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]}; }
function record(id,geometry) { return {type:'Feature',geometry,properties:{id,category:'blast',color:'#e4a462',status:'draft'}}; }
describe('draft polygon matching', () => {
  it('finds intersecting polygons even when the footprint centre is outside', () => {
    const match=createMatcher([record('a',rect(0,0,1,1))]);
    const result=match(rect(.8,0,1,1));
    expect(result.status).toBe('partial');
    expect(result.candidates[0].coverage).toBeCloseTo(.2);
  });
  it('rejects touching edges as an area match', () => {
    expect(createMatcher([record('a',rect(0,0,1,1))])(rect(1,0,1,1)).status).toBe('unmatched');
  });
  it('respects courtyard holes', () => {
    const g=rect(0,0,10,10);g.coordinates.push(rect(2,2,4,4).coordinates[0]);
    expect(createMatcher([record('a',g)])(rect(3,3,1,1)).status).toBe('unmatched');
  });
  it('retains ties as ambiguous instead of choosing the first category', () => {
    const result=createMatcher([record('a',rect(0,0,1,1)),record('b',rect(0,0,1,1))])(rect(0,0,1,1));
    expect(result.status).toBe('ambiguous');expect(result.candidates).toHaveLength(2);
  });
  it('does not turn perfect overlap into a verified historical identity', () => {
    const result=createMatcher([record('a',rect(0,0,1,1))])(rect(0,0,1,1));
    expect(result.status).toBe('candidate');expect(result.candidates[0].iou).toBeCloseTo(1);expect(result.verified).toBe(false);
  });
  it('accounts for disconnected parts of a multipolygon', () => {
    const g={type:'MultiPolygon',coordinates:[rect(0,0,1,1).coordinates,rect(3,0,1,1).coordinates]};
    expect(createMatcher([record('a',rect(0,0,1,1))])(g).candidates[0].coverage).toBeCloseTo(.5);
  });
});
