import clipping from 'polygon-clipping';
import {applyMatrix,toPlane} from './map-overlay.js';

const polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const signed=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
const area=ps=>ps.reduce((s,p)=>s+Math.max(0,Math.abs(signed(p[0]))-p.slice(1).reduce((a,r)=>a+Math.abs(signed(r)),0)),0);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const onSegment=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);}
export const invalidateSites=sites=>(sites??[]).map(s=>({...s,review:'draft'}));
export function validateSites(sites,selection,index){
 if(sites===undefined)return;
 if(!Array.isArray(sites)||sites.length>100)throw new Error('Use at most 100 historical sites per selected area.');
 const ids=new Set(),targets=new Set(),known=new Set(index.features.map(f=>f.id));
 for(const site of sites){
  if(!site||typeof site.id!=='string'||!site.id||ids.has(site.id))throw new Error('Each historical site needs a unique ID.');ids.add(site.id);
  if(typeof site.name!=='string'||!site.name.trim()||site.name.length>160||typeof site.note!=='string'||site.note.length>2000||!['rebuilt-site','surviving-site','uncertain'].includes(site.relationship)||!['draft','checked'].includes(site.review))throw new Error('Invalid historical site details.');
  if(site.review==='checked'&&!site.note.trim())throw new Error('Add evidence notes before checking a site link.');
  if(!Array.isArray(site.targets)||!site.targets.length||site.targets.length>100)throw new Error('Choose at least one modern building for the site.');
  for(const id of site.targets){if(!known.has(id)||targets.has(id))throw new Error('A building can belong to only one historical site.');targets.add(id);}
  const b=site.boundary,r=selection;
  if(!Array.isArray(b)||b.length<3||b.length>100||b.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))||p[0]<r.x||p[0]>r.x+r.width||p[1]<r.y||p[1]>r.y+r.height))throw new Error('Draw 3–100 site corners inside the selected paper area. Expand the selection first if needed.');
  if(Math.abs(signed(b))<1)throw new Error('The site boundary is too small.');
  for(let i=0;i<b.length;i++){
   if(Math.hypot(b[i][0]-b[(i+1)%b.length][0],b[i][1]-b[(i+1)%b.length][1])<.01)throw new Error('Site corners must be distinct.');
   for(let j=i+1;j<b.length;j++)if(j!==i+1&&!(i===0&&j===b.length-1)&&intersects(b[i],b[(i+1)%b.length],b[j],b[(j+1)%b.length]))throw new Error('Site boundaries cannot cross themselves.');
  }
 }
}
export function buildHistoricalSites(sites,regions,index,inverse,project,classes){
 return {type:'FeatureCollection',features:(sites??[]).map(site=>{
  const ring=[...site.boundary,site.boundary[0]],polygon=[[ring]],total=area(polygon);
  for(const id of site.targets){
   const g=index.features.find(f=>f.id===id).geometry;
   const target=polys(g).map(p=>p.map(r=>r.map(c=>applyMatrix(inverse,toPlane(c)).map(n=>Math.round(n*1e6)/1e6))));
   if(area(clipping.intersection(polygon,target))<1e-6)throw new Error(`The site “${site.name}” must touch each linked modern building.`);
  }
  const categories=classes.map((c,i)=>{const region=regions.find(r=>r.label===i+1);return {category:c.id,coverage:region?area(clipping.intersection(polygon,region.geometry.coordinates))/total:0};});
  const excluded=regions.find(r=>r.label===255),excludedCoverage=excluded?area(clipping.intersection(polygon,excluded.geometry.coordinates))/total:0;
  const coverage=categories.reduce((s,c)=>s+c.coverage,0);
  return {type:'Feature',id:site.id,geometry:{type:'Polygon',coordinates:[ring.map(project)]},properties:{name:site.name,targets:site.targets,relationship:site.relationship,review:site.review,note:site.note,categories,coverage,excludedCoverage,unclassifiedCoverage:Math.max(0,1-coverage-excludedCoverage),historicallyVerified:false,meaning:'Historical site colours linked to modern buildings; not a reconstruction of original building geometry'}};
 })};
}
export function siteDisplay(properties,sites){
 const site=sites.features.find(f=>f.properties.targets.includes(properties.componentId));
 const categories=site?site.properties.categories.filter(c=>c.coverage>1e-8).map(c=>c.category):properties.status==='mixed'?properties.mixedCategories:properties.category?[properties.category]:[];
 return {categories,basis:site?`${site.properties.review==='checked'?'reviewed':'draft'}-site`:'footprint-overlap',siteId:site?.id??null,rebuilt:site?site.properties.relationship==='rebuilt-site':properties.relationship==='rebuilt-site',paintEligible:!!site&&site.properties.review==='checked'&&categories.length>0};
}
