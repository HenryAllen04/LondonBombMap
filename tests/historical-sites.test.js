import { describe,expect,it } from 'vitest';
import { assessBuildings } from '../lib/pimlico-assessment';
import { historicalCoverage } from '../lib/historical-coverage';
import { historicalAreas,localPlacement,localChecks } from '../lib/local-history';
import study from '../data/pimlico-local-study.json';
import traces from '../data/pimlico-traces.json';
const rect=(id,x,y,w,h,category='blast')=>({type:'Feature',properties:{id,buildingId:id,category},geometry:{type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]}});
describe('historical sites independent of replacement roofs',()=>{
 it('retains a historical terrace even when the replacement building has no overlap',()=>{
  const row=rect('old',-.14,51.49,.0001,.0005),replacement=rect('new',-.1398,51.49,.0001,.0005);
  const [result]=historicalCoverage([row],[replacement]);
  expect(result.modernCoverage).toBe(0);expect(result.outsideModernBuildingsSquareMetres).toBeGreaterThan(300);
  expect(result.historicalIdentity).toBe('unreviewed');
 });
 it('unions modern coverage so overlapping source records cannot double count the historical area',()=>{
  const row=rect('old',-.14,51.49,.001,.001),a=rect('a',-.14,51.49,.0006,.001),b=rect('b',-.1396,51.49,.0006,.001);
  const [result]=historicalCoverage([row],[a,b]);expect(result.modernCoverage).toBeCloseTo(1);expect(result.outsideModernBuildingsSquareMetres).toBeCloseTo(0);
 });
 it('combines separate traces of one damage category for whole-building display',()=>{
  const building=rect('new',-.14,51.49,.001,.001),left=rect('a',-.14,51.49,.0004,.001),right=rect('b',-.1396,51.49,.0004,.001);
  const result=assessBuildings([building],[left,right])[0].properties.assessment;
  expect(result.status).toBe('partial');expect(result.wholeBuilding.category).toBe('blast');
 });
 it('does not resolve competing categories or small partial overlaps into a whole-building fill',()=>{
  const building=rect('new',-.14,51.49,.001,.001),a=rect('a',-.14,51.49,.00065,.001),b=rect('b',-.13965,51.49,.00065,.001,'destroyed');
  expect(assessBuildings([building],[a,b])[0].properties.assessment.wholeBuilding.category).toBe(null);
  expect(assessBuildings([building],[rect('small',-.14,51.49,.0001,.001)])[0].properties.assessment.candidates).toHaveLength(1);
 });
 it('replaces only the four reviewed local groups and preserves their historical site relationships',()=>{
  const areas=historicalAreas(traces,study);
  expect(areas.some(f=>study.replaces.includes(f.properties.id))).toBe(false);
  expect(areas.some(f=>f.properties.id==='p88-01')).toBe(true);
  expect(areas.filter(f=>f.properties.siteId===study.site.id)).toHaveLength(5);
 });
 it('uses only fitting junctions for the transform and reports separate checks',()=>{
  const placement=localPlacement(study),changed={...study,points:study.points.map(p=>p.role==='check'?{...p,coordinates:[p.coordinates[0]+.001,p.coordinates[1]]}:p)};
  expect(localPlacement(changed).coordinates([700,350])).toEqual(placement.coordinates([700,350]));
  expect(placement.pixel(placement.coordinates([700,350]))[0]).toBeCloseTo(700);
  expect(localChecks(changed).checkRmseMetres).toBeGreaterThan(localChecks(study).checkRmseMetres);
  expect(localChecks(study).status).toBe('exploratory');
 });
});
