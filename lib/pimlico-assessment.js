import { createMatcher } from '../app/proto/borough-plates/matching.js';
import polygonClipping from 'polygon-clipping';

export const DISPLAY_RULES={minimumCoverage:.6,minimumMargin:.15};
export const SHIFT_TESTS=[[-3,0],[3,0],[0,-3],[0,3]];
const assigned=result=>result.status==='candidate'?result.candidates[0].id:null;
export function translateAreas(areas,east,north) {
  return areas.map(f=>({...f,geometry:{...f.geometry,coordinates:f.geometry.coordinates.map(r=>r.map(([x,y])=>[x+east/(111320*Math.cos(51.49*Math.PI/180)),y+north/111320]))}}));
}
export function assessBuildings(buildings,areas) {
  const match=createMatcher(areas),shifts=SHIFT_TESTS.map(([x,y])=>createMatcher(translateAreas(areas,x,y)));
  const categories=[...new Set(areas.map(f=>f.properties.category))];
  const categoryMatch=createMatcher(categories.map(category=>({properties:{id:category,category,status:'draft'},geometry:{type:'MultiPolygon',coordinates:polygonClipping.union(...areas.filter(f=>f.properties.category===category).map(f=>f.geometry.coordinates))}})));
  return buildings.map(f=>{
    // Use complete source geometry. Cropping the display must not inflate coverage.
    const geometry=f.matchGeometry??f.geometry,result=match(geometry,DISPLAY_RULES);
    const changedShifts=shifts.flatMap((shift,i)=>assigned(shift(geometry,DISPLAY_RULES))!==assigned(result)?[SHIFT_TESTS[i]]:[]);
    const whole=categoryMatch(geometry,DISPLAY_RULES);
    return {...f,properties:{...f.properties,assessment:{...result,
      wholeBuilding:{status:whole.status,category:whole.status==='candidate'?whole.candidates[0].category:null,categoryOverlaps:whole.candidates},
      sensitivity:{distanceMetres:3,changedShifts,meaning:'Deliberate translation test; not measured registration error'},
      historicalIdentity:'unreviewed',bombIncident:null}}};
  });
}
