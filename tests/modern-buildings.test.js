import { describe, expect, it } from 'vitest';
import { prepareModernBuildings, geometryKey, buildingHeight, buildingPieces } from '../lib/modern-buildings';
import { assessBuildings } from '../lib/pimlico-assessment';
const rect=(x,y,w,h)=>[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]];
const feature=(id,coordinates)=>({type:'Feature',properties:{id,type:'building'},geometry:{type:'Polygon',coordinates}});
const region={geometry:{type:'Polygon',coordinates:rect(-.14,51.49,.001,.001)}};
describe('complete modern building records',()=>{
 it('keeps IDs stable after input reordering or a change of crop',()=>{
  const a=feature('a',rect(-.1402,51.4901,.0005,.0005)),b=feature('b',rect(-.1399,51.4907,.0002,.0002));
  const first=prepareModernBuildings({features:[a,b]},region);
  const second=prepareModernBuildings({features:[b,a]},{geometry:{type:'Polygon',coordinates:rect(-.1401,51.49,.0011,.001)}});
  expect(first.map(f=>f.id)).toEqual(second.map(f=>f.id));
 });
 it('does not turn the visible fragment into a 100% whole-building match',()=>{
  const modern=prepareModernBuildings({features:[feature('a',rect(-.1405,51.49,.0006,.0002))]},region);
  const area={...feature('damage',rect(-.14,51.49,.0001,.0002)),properties:{id:'damage',category:'blast',status:'draft'}};
  const assessment=assessBuildings(modern,[area])[0].properties.assessment;
  expect(modern[0].properties.clipped).toBe(true);expect(assessment.status).toBe('partial');
  expect(assessment.candidates[0].coverage).toBeCloseTo(1/6);
 });
 it('canonicalises ring orientation and start without discarding holes',()=>{
  const rings=rect(0,0,1,1),r=rings[0];
  expect(geometryKey(rings)).toBe(geometryKey([[r[2],r[1],r[0],r[3],r[2]]]));
  expect(geometryKey(rings)).not.toBe(geometryKey([...rings,...rect(.2,.2,.2,.2)]));
 });
 it('retains identity when unrelated buildings share identical geometry',()=>{
  expect(prepareModernBuildings({features:[feature('a',rect(-.14,51.49,.001,.001)),feature('b',rect(-.14,51.49,.001,.001))]},region)).toHaveLength(2);
 });
 it('distinguishes source heights, floor estimates and fallbacks including elevated parts',()=>{
  expect(buildingHeight({height:10,min_height:4})).toMatchObject({base:4,height:10,top:14});
  expect(buildingHeight({num_floors:4})).toMatchObject({height:12,source:'Estimated: 3 m per source floor'});
  expect(buildingHeight({height:-1})).toMatchObject({height:8,source:'Illustrative 8 m fallback'});
 });
 it('uses linked 3D parts and preserves uncovered parent geometry',()=>{
  const parent=prepareModernBuildings({features:[feature('a',rect(-.14,51.49,.001,.001))]},region)[0];
  const part=feature('part',rect(-.14,51.49,.0005,.001));part.properties={...part.properties,type:'building_part',building_id:'a',height:20};
  const pieces=buildingPieces(parent,{features:[part]});
  expect(pieces).toHaveLength(2);expect(pieces[0].height.top).toBe(20);
  expect(pieces[1].geometry.coordinates[0][0].every(([x])=>x>=-.1395)).toBe(true);
 });
});
