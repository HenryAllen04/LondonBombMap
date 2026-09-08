import { describe, expect, it } from 'vitest';
import { pilotBuildings, pilotFeatureGroups, pilotRegion, PILOT_BOUNDS } from '../lib/pimlico-pilot';
import boroughs from '../app/proto/borough-plates/boroughs.json';
import detail from '../public/proto/london-island/pimlico.json';
import { createMatcher } from '../app/proto/borough-plates/matching';

const rect=(x,y,w,h)=>[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]];
const region={geometry:{type:'Polygon',coordinates:rect(-.15,51.48,.03,.03)}};
describe('Pimlico indexing unit',()=>{
 it('separates disconnected tile polygons so one damaged component is not diluted by a remote one',()=>{
  const a=rect(-.145,51.49,.001,.001),b=rect(-.135,51.49,.001,.001);
  const data={features:[{properties:{layer:'building',id:7},geometry:{type:'MultiPolygon',coordinates:[a,b]}}]};
  const parts=pilotBuildings(data,region),groups=pilotFeatureGroups(data,region);
  const match=createMatcher([{properties:{id:'damage',category:'blast',status:'draft'},geometry:{type:'Polygon',coordinates:a}}]);
  expect(parts).toHaveLength(2);expect(new Set(parts.map(f=>f.properties.partId)).size).toBe(2);
  expect(parts.map(f=>f.properties.id)).toEqual([7,7]);
  expect(match(groups[0].geometry).status).toBe('partial');
  expect(parts.map(f=>match(f.geometry).status).sort()).toEqual(['candidate','unmatched']);
 });
 it('retains courtyard holes inside the same part',()=>{
  const rings=[...rect(-.145,51.49,.005,.005),...rect(-.144,51.491,.001,.001)];
  const parts=pilotBuildings({features:[{properties:{layer:'building'},geometry:{type:'Polygon',coordinates:rings}}]},region);
  expect(parts).toHaveLength(1);expect(parts[0].geometry.coordinates).toHaveLength(2);
 });
 it('uses the same bounded geometry for the scene and benchmark',()=>{
  const clipped=pilotBuildings(detail,pilotRegion(boroughs));
  expect(clipped.length).toBeGreaterThan(0);
  for(const f of clipped)for(const ring of f.geometry.coordinates)for(const [x,y] of ring){
   expect(x).toBeGreaterThanOrEqual(PILOT_BOUNDS[0]);expect(x).toBeLessThanOrEqual(PILOT_BOUNDS[2]);
   expect(y).toBeGreaterThanOrEqual(PILOT_BOUNDS[1]);expect(y).toBeLessThanOrEqual(PILOT_BOUNDS[3]);
  }
 });
});
