import polygonClipping from 'polygon-clipping';
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;

// Retain partial coverage without assigning an entire modern house a damage category.
export function roofFragments(geometry,candidates,areas){
 const groups=new Map();
 for(const candidate of candidates){
  const source=areas.find(f=>f.properties.id===candidate.id);if(!source)continue;
  const intersection=polygonClipping.intersection(polygons(geometry),polygons(source.geometry));
  if(!intersection.length)continue;
  const previous=groups.get(candidate.category);
  groups.set(candidate.category,{category:candidate.category,color:candidate.color,coordinates:previous?polygonClipping.union(previous.coordinates,intersection):intersection});
 }
 return [...groups.values()].flatMap(group=>{
  const competing=[...groups.values()].filter(other=>other.category!==group.category);
  const coordinates=competing.length?polygonClipping.difference(group.coordinates,...competing.map(other=>other.coordinates)):group.coordinates;
  return coordinates.length?[{category:group.category,color:group.color,geometry:{type:'MultiPolygon',coordinates}}]:[];
 });
}
