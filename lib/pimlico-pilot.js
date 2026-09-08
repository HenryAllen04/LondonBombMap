import polygonClipping from 'polygon-clipping';

// A test crop, not an administrative or historical sheet boundary.
export const PILOT_BOUNDS = [-.15, 51.4835, -.13, 51.4945];
export const PILOT_CENTER = [-.14, 51.489];
export const polygons = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

export function pilotRegion(boroughs) {
  const [w, s, e, n] = PILOT_BOUNDS;
  const westminster = boroughs.features.find(f => f.properties.name === 'Westminster');
  if (!westminster) throw new Error('Westminster boundary is missing');
  const coordinates = polygonClipping.intersection(polygons(westminster.geometry), [[[w,s],[e,s],[e,n],[w,n],[w,s]]]);
  return {type:'Feature', properties:{name:'Pimlico'}, geometry:{type:'MultiPolygon', coordinates}};
}

export function pilotFeatureGroups(detail, region) {
  const seen = new Set();
  return detail.features.flatMap(f => {
    if (f.properties.layer !== 'building' || !['Polygon','MultiPolygon'].includes(f.geometry.type)) return [];
    const signature = JSON.stringify(f.geometry);
    if (seen.has(signature)) return [];
    seen.add(signature);
    const coordinates = polygonClipping.intersection(polygons(f.geometry), polygons(region.geometry));
    if (!coordinates.length) return [];
    // Local snapshot key; deliberately does not claim to be a property/OSM ID.
    const partId = `pimlico-part-${String(seen.size).padStart(4, '0')}`;
    return [{...f, properties:{...f.properties, partId}, geometry:{type:'MultiPolygon', coordinates}}];
  });
}

export function pilotBuildings(detail, region) {
  return pilotFeatureGroups(detail, region).flatMap(f => f.geometry.coordinates.map((rings, index) => ({
    ...f,
    properties:{...f.properties, groupId:f.properties.partId, partId:`${f.properties.partId}-${String(index+1).padStart(3,'0')}`},
    geometry:{type:'Polygon', coordinates:rings},
  })));
}
