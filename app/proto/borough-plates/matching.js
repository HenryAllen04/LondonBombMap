import RBush from 'rbush';
import polygonClipping from 'polygon-clipping';

// Local planar approximation for the Pimlico study. Ratios are not probabilities.
const project = ([lng, lat]) => [(lng + .14) * 111320 * Math.cos(51.49 * Math.PI / 180), (lat - 51.49) * 111320];
function polygons(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  throw new Error('Matching requires Polygon or MultiPolygon geometry');
}
function projected(geometry) { return polygons(geometry).map(p => p.map(r => r.map(project))); }
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(sum) / 2;
}
function area(polys) { return polys.reduce((sum, p) => sum + Math.max(0, ringArea(p[0]) - p.slice(1).reduce((s, r) => s + ringArea(r), 0)), 0); }
export function bounds(geometry) {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const p of polygons(geometry)) for (const r of p) for (const [x,y] of r) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Non-finite coordinates');
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  if (!Number.isFinite(minX)) throw new Error('Empty polygon');
  return {minX,minY,maxX,maxY};
}

export function createMatcher(features) {
  const index = new RBush();
  index.load(features.map(feature => {
    const geometry = projected(feature.geometry);
    return {...bounds(feature.geometry),feature,geometry,area:area(geometry)};
  }));
  return function match(geometry, {minimumCoverage=.6, minimumMargin=.15}={}) {
    const subject = projected(geometry), subjectArea = area(subject);
    if (subjectArea <= 0) return {status:'invalid', candidates:[], verified:false, reason:'Zero-area footprint'};
    const candidates = index.search(bounds(geometry)).flatMap(item => {
      const overlap = area(polygonClipping.intersection(subject,item.geometry));
      if (overlap < .01) return [];
      return [{id:item.feature.properties.id, category:item.feature.properties.category,
        color:item.feature.properties.color, sourceStatus:item.feature.properties.status,
        coverage:Math.min(1,overlap/subjectArea), historicalCoverage:Math.min(1,overlap/item.area),
        iou:overlap/(subjectArea+item.area-overlap), overlapArea:overlap}];
    }).sort((a,b) => b.coverage-a.coverage || a.id.localeCompare(b.id));
    if (!candidates.length) return {status:'unmatched',candidates,verified:false,reason:'No overlap with the available draft traces'};
    const best=candidates[0], margin=best.coverage-(candidates[1]?.coverage??0);
    const status=best.coverage<minimumCoverage?'partial':margin<minimumMargin?'ambiguous':'candidate';
    return {status,candidates,verified:false,margin,
      reason:status==='candidate'?'Geometric candidate only; the source is an unverified area group':status==='ambiguous'?'Competing damage areas overlap this footprint':'The strongest overlap is below the display threshold'};
  };
}
