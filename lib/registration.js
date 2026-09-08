const finitePair=value=>Array.isArray(value)&&value.length===2&&value.every(Number.isFinite);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);

export function fitAffine(points) {
  if(points.length<3)throw new Error('At least three fitting points are required.');
  if(points.some(p=>!finitePair(p.pixel)||!finitePair(p.grid)))throw new Error('Pixel and grid coordinates must be finite pairs.');
  const centre=[0,1].map(axis=>points.reduce((sum,p)=>sum+p.pixel[axis],0)/points.length);
  const scale=Math.max(...points.map(p=>Math.hypot(p.pixel[0]-centre[0],p.pixel[1]-centre[1])));
  if(!scale)throw new Error('Fitting points are collinear or coincident.');
  const columns=[points.map(()=>1),...centre.map((c,axis)=>points.map(p=>(p.pixel[axis]-c)/scale))];
  const q=[],r=Array.from({length:3},()=>[0,0,0]);
  for(let j=0;j<3;j++){
    const v=[...columns[j]];
    for(let i=0;i<j;i++){r[i][j]=dot(q[i],v);for(let k=0;k<v.length;k++)v[k]-=r[i][j]*q[i][k];}
    r[j][j]=Math.sqrt(dot(v,v));
    if(r[j][j]<1e-9)throw new Error('Fitting points are collinear or too poorly distributed.');
    q.push(v.map(n=>n/r[j][j]));
  }
  const coefficients=[0,1].map(axis=>{
    const b=q.map(v=>dot(v,points.map(p=>p.grid[axis]))),x=[0,0,0];
    for(let i=2;i>=0;i--)x[i]=(b[i]-x.reduce((s,v,j)=>j>i?s+r[i][j]*v:s,0))/r[i][i];
    return x;
  });
  return {centre,scale,coefficients};
}
export function applyAffine(model,pixel) {
  const terms=[1,(pixel[0]-model.centre[0])/model.scale,(pixel[1]-model.centre[1])/model.scale];
  return model.coefficients.map(c=>dot(c,terms));
}
function metrics(residuals) {
  if(!residuals.length)return null;
  const values=residuals.map(p=>p.errorMetres).sort((a,b)=>a-b),n=values.length;
  return {count:n,medianMetres:n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2,
    rmseMetres:Math.sqrt(values.reduce((s,v)=>s+v*v,0)/n),p95Metres:values[Math.ceil(n*.95)-1],maxMetres:values[n-1]};
}
export function evaluateRegistration(data) {
  if(data.schemaVersion!==1||data.crs!=='EPSG:27700'||!Array.isArray(data.points))throw new Error('Use schemaVersion 1, EPSG:27700 and a points array.');
  const ids=new Set(),pixels=new Set(),grids=new Set();
  for(const p of data.points){
    if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw new Error('Every landmark must have a unique ID.');
    if(!['fit','check'].includes(p.role)||!finitePair(p.pixel)||!finitePair(p.grid))throw new Error(`Invalid coordinates or role for ${p.id}.`);
    if(!p.sourceReference||!p.reviewer)throw new Error(`Record sourceReference and reviewer for ${p.id}.`);
    const pixel=JSON.stringify(p.pixel),grid=JSON.stringify(p.grid);
    if(pixels.has(pixel)||grids.has(grid))throw new Error('A fitting/check landmark is duplicated. Held-out points must be independent.');
    ids.add(p.id);pixels.add(pixel);grids.add(grid);
  }
  const fit=data.points.filter(p=>p.role==='fit'),check=data.points.filter(p=>p.role==='check');
  const blockers=[];
  if(fit.length<12)blockers.push('Add at least 12 distributed fitting landmarks.');
  if(check.length<8)blockers.push('Add at least 8 independent check landmarks.');
  if(!data.sourceImage?.id||!/^[a-f0-9]{64}$/i.test(data.sourceImage?.sha256??''))blockers.push('Identify the source image and its SHA-256 checksum.');
  const frontage=data.medianFrontageMetres;
  if(!Number.isFinite(frontage)||frontage<=0)blockers.push('Record the median frontage width measured in the reviewed sample.');
  if(fit.length<3)return {state:'pending',fitPoints:fit.length,checkPoints:check.length,fit:null,heldOut:null,blockers,residuals:[],model:null};
  const model=fitAffine(fit),residuals=data.points.map(p=>{const predicted=applyAffine(model,p.pixel);return {id:p.id,role:p.role,grid:p.grid,predicted,errorMetres:Math.hypot(predicted[0]-p.grid[0],predicted[1]-p.grid[1])};});
  const heldOut=metrics(residuals.filter(p=>p.role==='check'));
  if(heldOut&&frontage>0&&heldOut.p95Metres>=frontage/2)blockers.push('Check-point P95 must be below half the measured frontage width.');
  return {state:blockers.length?'needs-review':'registration-gate-met',fitPoints:fit.length,checkPoints:check.length,
    fit:metrics(residuals.filter(p=>p.role==='fit')),heldOut,blockers,residuals,model,
    note:'Registration only. This does not verify historical footprint extraction, property identity or bomb events.'};
}
