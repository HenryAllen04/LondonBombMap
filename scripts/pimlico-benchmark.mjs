import { readFile, writeFile } from 'node:fs/promises';
import { evaluateRegistration } from '../lib/registration.js';
import { createHash } from 'node:crypto';
import { createMatcher } from '../app/proto/borough-plates/matching.js';
import { projectTrace } from '../lib/trace-projection.js';
import { PILOT_BOUNDS, pilotRegion, pilotBuildings, pilotFeatureGroups } from '../lib/pimlico-pilot.js';

const read = path => readFile(new URL('../'+path, import.meta.url), 'utf8');
const [detailText, traceText, boundaryText] = await Promise.all([
  read('public/proto/london-island/pimlico.json'), read('data/pimlico-traces.json'), read('app/proto/borough-plates/boroughs.json'),
]);
const detail=JSON.parse(detailText),traces=JSON.parse(traceText),region=pilotRegion(JSON.parse(boundaryText));
const groups=pilotFeatureGroups(detail,region),buildings=pilotBuildings(detail,region);
const areas=traces.areas.map(a=>{
  const ring=a.ring.map(p=>projectTrace(p,traces.anchors));
  return {type:'Feature',properties:{id:a.id,category:a.category,status:'draft'},geometry:{type:'Polygon',coordinates:[[...ring,ring[0]]]}};
});
const matcher=createMatcher(areas);
const results=buildings.map(f=>({id:f.properties.partId,sourceId:f.properties.id??null,tile:f.properties.tile,groupId:f.properties.groupId,result:matcher(f.geometry)}));
const count=rows=>Object.fromEntries(['candidate','partial','ambiguous','unmatched','invalid'].map(status=>[status,rows.filter(r=>r.result.status===status).length]));
const assignment=r=>r.status==='candidate'?r.candidates[0].id:null;
const sensitivity=[];
for(const [east,north] of [[-5,0],[-3,0],[3,0],[5,0],[0,-5],[0,-3],[0,3],[0,5]]){
  const shifted=areas.map(f=>({...f,geometry:{...f.geometry,coordinates:f.geometry.coordinates.map(r=>r.map(([x,y])=>[x+east/(111320*Math.cos(51.49*Math.PI/180)),y+north/111320]))}}));
  const match=createMatcher(shifted),rows=buildings.map(f=>({result:match(f.geometry)}));
  sensitivity.push({eastMetres:east,northMetres:north,statusCounts:count(rows),changedCandidateAssignments:rows.filter((r,i)=>assignment(r.result)!==assignment(results[i].result)).length});
}
const ids=new Map();for(const r of results)if(r.sourceId!==null)ids.set(String(r.sourceId),(ids.get(String(r.sourceId))??0)+1);
const calibration=traces.anchors.map(a=>{const p=projectTrace(a.pixel,traces.anchors);return Math.hypot((p[0]-a.coordinates[0])*111320*Math.cos(51.49*Math.PI/180),(p[1]-a.coordinates[1])*111320);});
const groupedResults=groups.map(f=>({result:matcher(f.geometry)}));
const statusCounts=count(results),touched=new Set(results.flatMap(r=>r.result.candidates.map(c=>c.id)));
const tileBaseline={
  title:'Pimlico data-readiness benchmark',generatedAt:new Date().toISOString(),
  scope:{bounds:PILOT_BOUNDS,description:'Test rectangle intersected with Westminster; not an official Pimlico boundary',unit:'Deduplicated, clipped snapshot footprint part; not a house'},
  inputs:{modernSource:detail.source,captured:detail.captured,modernSha256:createHash('sha256').update(detailText).digest('hex'),traceSha256:createHash('sha256').update(traceText).digest('hex'),boundarySha256:createHash('sha256').update(boundaryText).digest('hex'),historicalSource:traces.source},
  registration:{fitPoints:traces.anchors.length,fitRmseMetres:Math.sqrt(calibration.reduce((s,v)=>s+v*v,0)/calibration.length),independentCheckPoints:0,heldOutRmseMetres:null,heldOutP95Metres:null,note:'Three affine fitting anchors reproduce themselves. Fit error is not a positional-accuracy test.'},
  previousGrouping:{tileFeatureGroups:groups.length,polygonComponents:buildings.length,groupsWithMultipleComponents:groups.filter(f=>f.geometry.coordinates.length>1).length,largestGroupComponents:Math.max(...groups.map(f=>f.geometry.coordinates.length)),statusCounts:count(groupedResults),note:"Previous matcher scored disconnected polygon bundles together. Current pilot splits components, retaining holes and source group references."},
  inventory:{footprintParts:buildings.length,draftAreas:areas.length,areasIntersectingModernParts:touched.size,partsWithOverlap:results.filter(r=>r.result.candidates.length).length,statusCounts,partsMissingSourceId:results.filter(r=>r.sourceId===null).length,distinctSourceIds:ids.size,sourceIdsRepeatedAcrossParts:[...ids.values()].filter(n=>n>1).length,partsMissingPositiveHeight:buildings.filter(f=>!(Number(f.properties.height)>0)).length,addressFieldsRetained:0,verifiedHistoricalProperties:0},
  rules:{minimumCoverage:.6,minimumMargin:.15,areaUnits:'metres squared; local planar approximation',note:'Uncalibrated display thresholds, not confidence or probability'},
  sensitivity:{note:'Deliberate translations of draft areas, not measured registration errors',runs:sensitivity},
  accuracy:{historicalIdentity:null,damageClassification:null,bombEventLocation:null,reason:'No independently reviewed historical footprints, addresses, damage labels or incident records have been supplied.'},
  decision:'NO-GO for verified house-level damage publishing. GO for inspecting and indexing snapshot parts with provisional source links.',
  records:results.map(r=>({id:r.id,sourceId:r.sourceId,tile:r.tile,groupId:r.groupId,status:r.result.status,candidateArea:assignment(r.result),overlaps:r.result.candidates.map(c=>({areaId:c.id,category:c.category,modernCoverage:c.coverage,historicalCoverage:c.historicalCoverage,iou:c.iou})),verified:false})),
};
const index=JSON.parse(await read('public/proto/london-island/building-index.json'));
const registration=evaluateRegistration(JSON.parse(await read('data/pimlico-registration.json')));
const report={title:'Pimlico geometry diagnostics and historical site review',generatedAt:new Date().toISOString(),
  interpretation:'Modern roof overlap measures display coverage, not historical accuracy or the completeness of bomb sites. Replacement buildings are a different observation unit from historical properties.',
  modernSource:{provider:index.provider,release:index.release,captured:index.captured,fingerprints:index.fingerprints},
  inventory:index.summary,registration,
  draftTracePlacement:{fittingAnchors:traces.anchors.length,independentCheckPoints:0,note:'Legacy areas retain the original placement. Four local groups are replaced by screenshot-based historical terrace segments using a separate exploratory local transform.'},
  localStudy:index.localStudy,historicalSites:index.historicalSites,historicalAreaCoverage:index.historicalCoverage,
  sourceComparison:{note:'Different sources and geometry units; count changes are not accuracy gains. Overture can reuse OSM.',
    oldTileFeatures:tileBaseline.previousGrouping.tileFeatureGroups,oldTileComponents:tileBaseline.inventory.footprintParts,
    modernBuildingRecords:index.summary.buildingRecords,modernComponents:index.summary.components},
  tileBaseline:{...tileBaseline,records:undefined},
  accuracy:{historicalIdentity:null,damageClassification:null,bombEventLocation:null,reason:'Original source and independent historical reference cases are still pending.'},
  decision:'Modern building records are indexed. Historical house-level damage remains unverified.',
  records:index.features.map(f=>({id:f.id,buildingId:f.properties.buildingId,release:index.release,clipped:f.properties.clipped,
    status:f.properties.assessment.status,overlaps:f.properties.assessment.candidates,sensitivity:f.properties.assessment.sensitivity,
    verified:false}))};
const output=new URL('../public/proto/london-island/benchmark.json',import.meta.url);
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,records:undefined,tileBaseline:undefined},null,2));
