import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pilotRegion } from '../lib/pimlico-pilot.js';
import { prepareModernBuildings, buildingPieces } from '../lib/modern-buildings.js';
import { assessBuildings, DISPLAY_RULES } from '../lib/pimlico-assessment.js';
import { historicalAreas, localChecks, localPlacement, placementComparison } from '../lib/local-history.js';
import { historicalCoverage } from '../lib/historical-coverage.js';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const [modernText,boundaryText,traceText,studyText]=await Promise.all([read('public/proto/london-island/pimlico-overture.json'),read('app/proto/borough-plates/boroughs.json'),read('data/pimlico-traces.json'),read('data/pimlico-local-study.json')]);
const modern=JSON.parse(modernText),traces=JSON.parse(traceText),region=pilotRegion(JSON.parse(boundaryText));
const study=JSON.parse(studyText),areas=historicalAreas(traces,study);
const features=assessBuildings(prepareModernBuildings(modern,region),areas).map(f=>({...f,renderPieces:buildingPieces(f,modern)}));
const digest=text=>createHash('sha256').update(text).digest('hex');
const statuses=['candidate','partial','ambiguous','unmatched','invalid'];
const summary={buildingRecords:new Set(features.map(f=>f.properties.buildingId)).size,components:features.length,
  historicalDraftAreas:areas.length,wholeBuildingFills:features.filter(f=>f.properties.assessment.wholeBuilding.category).length,
  clippedComponents:features.filter(f=>f.properties.clipped).length,renderPieces:features.reduce((n,f)=>n+f.renderPieces.length,0),
  withDraftOverlap:features.filter(f=>f.properties.assessment.candidates.length).length,
  statusCounts:Object.fromEntries(statuses.map(s=>[s,features.filter(f=>f.properties.assessment.status===s).length])),
  translationSensitive:features.filter(f=>f.properties.assessment.sensitivity.changedShifts.length).length,
  candidateTranslationSensitive:features.filter(f=>f.properties.assessment.status==='candidate'&&f.properties.assessment.sensitivity.changedShifts.length).length,
  sourceDatasets:[...new Set(features.flatMap(f=>f.properties.sources.map(s=>s.dataset)))],
  parentHeightSources:Object.fromEntries([...new Set(features.map(f=>f.properties.height.source))].map(s=>[s,features.filter(f=>f.properties.height.source===s).length])),
  verifiedHistoricalProperties:0,addressesRetained:0};
const result={type:'FeatureCollection',schemaVersion:1,provider:modern.provider,release:modern.release,captured:modern.captured,
  generatedAt:new Date().toISOString(),source:modern.source,license:modern.license,attribution:modern.attribution,
  fingerprints:{modern:digest(modernText),boundaries:digest(boundaryText),traces:digest(traceText),localStudy:digest(studyText)},
  displayRules:DISPLAY_RULES,registration:{state:'unvalidated',fitPoints:traces.anchors.length,independentCheckPoints:0,heldOutRmseMetres:null},
  localStudy:{id:study.id,sourceImage:study.sourceImage,traceNote:study.traceNote,registration:localChecks(study),placementComparison:placementComparison(traces,study)},
  historicalSites:[{...study.site,geometry:{type:'Polygon',coordinates:[[...study.site.ring,study.site.ring[0]].map(localPlacement(study).coordinates)]}}],
  summary,historicalAreas:areas,historicalCoverage:historicalCoverage(areas,features),features};
await writeFile(new URL('public/proto/london-island/building-index.json',root),JSON.stringify(result)+'\n');
console.log(JSON.stringify(summary,null,2));
