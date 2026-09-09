import clipping from 'polygon-clipping';

const signed=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
export const polygonArea=ps=>ps.reduce((s,p)=>s+Math.max(0,Math.abs(signed(p[0]))-p.slice(1).reduce((a,r)=>a+Math.abs(signed(r)),0)),0);
function centre(polygons){
 let weight=0,x=0,y=0;
 for(const polygon of polygons)for(let ringIndex=0;ringIndex<polygon.length;ringIndex++){
  const ring=polygon[ringIndex],a=signed(ring);if(Math.abs(a)<1e-10)continue;
  let cx=0,cy=0;for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],cross=p[0]*q[1]-q[0]*p[1];cx+=(p[0]+q[0])*cross;cy+=(p[1]+q[1])*cross;}
  const w=Math.abs(a)*(ringIndex?-1:1);weight+=w;x+=cx/(6*a)*w;y+=cy/(6*a)*w;
 }
 return weight?[x/weight,y/weight]:[0,0];
}
function halfPlane(box,axis,limit){
 const result=[];
 for(let i=0;i<box.length;i++){
  const p=box[i],q=box[(i+1)%box.length],a=p[0]*axis[0]+p[1]*axis[1]-limit,b=q[0]*axis[0]+q[1]*axis[1]-limit;
  if(a<=0)result.push(p);
  if((a<0&&b>0)||(a>0&&b<0)){const t=a/(a-b);result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
 }
 return result.length>=3?[[[...result,result[0]]]]:[];
}
// Display geometry only: ordered, straight cuts replace pixel-shaped edges.
// Evidence proportions determine each colour's share of the complete footprint.
export function fillBuilding(coordinates,evidence){
 const groups=evidence.filter(e=>e.coverage>1e-10&&e.coordinates.length).map(e=>({...e,centre:centre(e.coordinates)}));
 const total=polygonArea(coordinates),support=groups.reduce((s,e)=>s+e.coverage,0);
 if(!groups.length||!total)return [{category:null,coordinates,coverage:1,sourceCoverage:0}];
 if(groups.length===1)return [{category:groups[0].category,coordinates,coverage:1,sourceCoverage:groups[0].coverage}];
 const points=coordinates.flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=Math.max(maxX-minX,maxY-minY)+1;
 const box=[[minX-pad,minY-pad],[maxX+pad,minY-pad],[maxX+pad,maxY+pad],[minX-pad,maxY+pad]];
 const mean=groups.reduce((m,e)=>[m[0]+e.centre[0]*e.coverage/support,m[1]+e.centre[1]*e.coverage/support],[0,0]);
 let xx=0,yy=0,xy=0;for(const e of groups){const dx=e.centre[0]-mean[0],dy=e.centre[1]-mean[1];xx+=dx*dx*e.coverage;yy+=dy*dy*e.coverage;xy+=dx*dy*e.coverage;}
 const angle=xx+yy<1e-10?(maxX-minX>=maxY-minY?0:Math.PI/2):.5*Math.atan2(2*xy,xx-yy),axis=[Math.cos(angle),Math.sin(angle)],dot=p=>p[0]*axis[0]+p[1]*axis[1];
 groups.sort((a,b)=>dot(a.centre)-dot(b.centre)||a.category.localeCompare(b.category));
 const low=Math.min(...points.map(dot)),high=Math.max(...points.map(dot));
 let remaining=coordinates,cumulative=0;const parts=[];
 for(let i=0;i<groups.length;i++){
  const group=groups[i];cumulative+=group.coverage/support;
  let part;
  if(i===groups.length-1)part=remaining;
  else{
   let left=low,right=high;
   for(let n=0;n<32;n++){const middle=(left+right)/2,clip=halfPlane(box,axis,middle),a=clip.length?polygonArea(clipping.intersection(coordinates,clip)):0;if(a<total*cumulative)left=middle;else right=middle;}
   const clip=halfPlane(box,axis,(left+right)/2);part=clipping.intersection(remaining,clip);remaining=clipping.difference(remaining,clip);
  }
  if(part.length)parts.push({category:group.category,coordinates:part,coverage:polygonArea(part)/total,sourceCoverage:group.coverage});
 }
 return parts;
}
