import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import clipping from 'polygon-clipping';
import {buildDirtForOutline} from '@/dirt';
import dirtConfig from '@/dirt-config.json';
import {prepareModernBuildings,buildingPieces} from '@/lib/modern-buildings';
import {overlayMatrix,applyMatrix,rectangleRing,exportOverlay} from '@/lib/map-overlay';
import {newColours,generateMask,decodeMask,maskRectangles,COLOUR_CLASSES,EXCLUDED} from '@/lib/map-colours';
import {islandRegion,localGeometry,project,splitSurface,paperUV,selectedArea} from './geometry';

const LAND=12,RIVER=-5;
const shapes=coordinates=>coordinates.map(rings=>{
  const shape=new T.Shape(rings[0].map(p=>new T.Vector2(...p)));
  shape.holes=rings.slice(1).map(r=>new T.Path(r.map(p=>new T.Vector2(...p))));
  return shape;
});
function flat(coordinates,z=0){const g=new T.ShapeGeometry(shapes(coordinates));g.translate(0,0,z);return g;}
function extrude(coordinates,height,base=0){const g=new T.ExtrudeGeometry(shapes(coordinates),{depth:height,bevelEnabled:false,steps:1,curveSegments:1});g.translate(0,0,base);return g;}
function uv(geometry,fn){const p=geometry.attributes.position,u=geometry.attributes.uv;for(let i=0;i<p.count;i++)u.setXY(i,...fn([p.getX(i),p.getY(i)]));u.needsUpdate=true;return geometry;}

function cartography(features,box){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const c=canvas.getContext('2d'),size=2048;
  const pixel=p=>{const [x,y]=project(p);return [(x-box[0])/(box[2]-box[0])*size,(box[3]-y)/(box[3]-box[1])*size];};
  c.fillStyle='#dfddc9';c.fillRect(0,0,size,size);
  const path=rings=>{c.beginPath();for(const ring of rings){ring.forEach((p,i)=>{const q=pixel(p);i?c.lineTo(...q):c.moveTo(...q);});c.closePath();}};
  for(const f of features){
    if(!['park','landcover'].includes(f.properties.layer)||!['Polygon','MultiPolygon'].includes(f.geometry.type))continue;
    for(const rings of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates){path(rings);c.fillStyle='#b5bf9e';c.fill('evenodd');}
  }
  c.lineCap='round';c.lineJoin='round';
  for(const casing of [true,false])for(const f of features){
    if(f.properties.layer!=='transportation'||!['LineString','MultiLineString'].includes(f.geometry.type))continue;
    const main=['primary','secondary','trunk','motorway'].includes(f.properties.class);
    c.strokeStyle=casing?'#c4c1ad':'#f8f5e9';c.lineWidth=(main?9:4)+(casing?2:0);
    for(const line of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates){c.beginPath();line.forEach((p,i)=>{const q=pixel(p);i?c.lineTo(...q):c.moveTo(...q);});c.stroke();}
  }
  // Labels use names carried by the captured modern map, drawn once per name.
  const seen=new Set();c.font='500 13px Arial';c.fillStyle='#797a6c';c.textAlign='center';
  for(const f of features){
    if(f.properties.layer!=='transportation'||!f.properties.name||seen.has(f.properties.name))continue;
    const line=f.geometry.type==='MultiLineString'?f.geometry.coordinates[0]:f.geometry.type==='LineString'?f.geometry.coordinates:null;
    if(!line?.length)continue;const a=pixel(line[0]),b=pixel(line.at(-1));if(Math.hypot(b[0]-a[0],b[1]-a[1])<100)continue;
    seen.add(f.properties.name);let angle=Math.atan2(b[1]-a[1],b[0]-a[0]);if(angle>Math.PI/2||angle< -Math.PI/2)angle+=Math.PI;
    c.save();c.translate((a[0]+b[0])/2,(a[1]+b[1])/2);c.rotate(angle);c.fillText(f.properties.name,0,-6);c.restore();
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
}

function damageRegions(config,definition,bitmap,matrix){
  const c=config.colours??{...newColours(config.selection,{}),automatic:{version:1}};
  let mask;
  if(config.colours)mask=decodeMask(c.runs,c.grid.width*c.grid.height);
  else{
    const canvas=document.createElement('canvas');canvas.width=c.grid.width;canvas.height=c.grid.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,c.grid.x,c.grid.y,c.grid.width,c.grid.height,0,0,c.grid.width,c.grid.height);
    mask=generateMask(ctx.getImageData(0,0,c.grid.width,c.grid.height).data,c,definition.exclusions);
  }
  const exclusions=definition.exclusions??[];
  for(let i=0;i<mask.length;i++){
    const x=c.grid.x+i%c.grid.width+.5,y=c.grid.y+Math.floor(i/c.grid.width)+.5;
    if(exclusions.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.width&&y<r.y+r.height))mask[i]=EXCLUDED;
  }
  const selection=selectedArea(config,matrix);
  return [...maskRectangles(mask,c.grid)].filter(([id])=>id>0&&id<=COLOUR_CLASSES.length).map(([id,rows])=>{
    const coordinates=clipping.union(...rows.map(r=>[[rectangleRing(r)]]));
    const local=coordinates.map(p=>p.map(r=>r.map(p=>{const [x,y]=applyMatrix(matrix,p);return [x,-y];})));
    return {...COLOUR_CLASSES[id-1],coordinates:clipping.intersection(local,selection)};
  });
}

export async function createSurface(host,config,definition,signal){
  exportOverlay(config,definition);
  const [detail,source]=await Promise.all(['pimlico','pimlico-overture'].map(async name=>{
    const r=await fetch(`/proto/london-island/${name}.json`,{signal});if(!r.ok)throw new Error(`Could not load ${name}.`);return r.json();
  }));
  let bitmap=null,sourceError='';
  try{
    const r=await fetch(definition.source.url,{signal});if(!r.ok)throw new Error('The original sheet is unavailable here. The modern island remains available.');
    bitmap=await createImageBitmap(await r.blob());
  }catch(e){if(signal.aborted)throw e;sourceError=e.message;}
  if(signal.aborted){bitmap?.close();return null;}
  const region=islandRegion(),surface=splitSurface(detail.features,region),matrix=overlayMatrix(config,definition.pivot),selection=selectedArea(config,matrix);
  const corners=surface.outline[0][0],xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
  const box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],centre=[(box[0]+box[2])/2,(box[1]+box[3])/2];
  const buildings=prepareModernBuildings(source,region),pieces=buildings.flatMap(b=>buildingPieces(b,source));
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','3D Pimlico island with the Thames and modern buildings. Drag to orbit, arrow keys to pan, scroll to zoom.');host.appendChild(canvas);
  const scene=new T.Scene(),world=new T.Group();world.rotation.x=-Math.PI/2;scene.add(world);
  const camera=new T.PerspectiveCamera(35,1,1,30000),controls=new OrbitControls(camera,canvas);
  controls.minDistance=100;controls.maxDistance=10000;controls.maxPolarAngle=Math.PI*.49;controls.enableDamping=false;controls.listenToKeyEvents(canvas);controls.maxTargetRadius=2400;
  scene.add(new T.HemisphereLight('#f6f3e7','#594b36',1.5));
  const sun=new T.DirectionalLight('#fff4df',1.6);sun.position.set(-1000,2200,1400);scene.add(sun);
  const fill=new T.DirectionalLight('#d3e2e2',.4);fill.position.set(1200,100,-800);scene.add(fill);
  const textures=new Set(),materials=new Set(),geometries=new Set();
  const material=options=>{const m=new T.MeshStandardMaterial({roughness:.95,...options});materials.add(m);return m;};
  function mesh(geometry,mat,parent=world){geometries.add(geometry);const m=new T.Mesh(geometry,mat);parent.add(m);return m;}
  function batch(items,mat,parent=world){if(!items.length)return null;const g=mergeGeometries(items);items.forEach(g=>g.dispose());return mesh(g,mat,parent);}
  const map=cartography(detail.features,box);textures.add(map);
  const mapUV=([x,y])=>[(x-box[0])/(box[2]-box[0]),(y-box[1])/(box[3]-box[1])];
  mesh(uv(extrude(surface.land,LAND,-LAND),mapUV),[material({map}),material({color:'#c3b59b'})]);
  // The river is a separate recessed volume; the paper can never cover it.
  const water=mesh(extrude(surface.river,LAND+RIVER,-LAND),[material({color:'#76a8a5',roughness:.3,metalness:.12}),material({color:'#517e7b'})]);
  // Preserve every cut corner at the rim, with extra side facets between them.
  const rim=corners.slice(0,-1).flatMap((p,i)=>Array.from({length:7},(_,j)=>{const q=corners[i+1],t=j/7;return [p[0]+(q[0]-p[0])*t,-p[1]-(q[1]-p[1])*t];}));
  const dirt=buildDirtForOutline(rim,{...dirtConfig,facets:rim.length},{yTop:-LAND,resample:false});
  scene.add(dirt);
  dirt.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  const body=new T.Group();world.add(body);
  const neutral=material({color:'#eeebdb'}),buildingGeometries=[],roofGeometries=[];
  const localPieces=pieces.map(p=>({...p,coordinates:localGeometry(p.geometry)}));
  for(const p of localPieces){buildingGeometries.push(extrude(p.coordinates,p.height.height,p.height.base+.3));roofGeometries.push(flat(p.coordinates,p.height.top+.45));}
  batch(buildingGeometries,neutral,body);
  const roofs=batch(roofGeometries,material({color:'#f9f6e9'}),body);
  const roofPaper=new T.Group();body.add(roofPaper);
  const groundPaper=new T.Group();world.add(groundPaper);
  let paperMaterial=null,regions=[];
  if(bitmap){
    const paperCanvas=document.createElement('canvas');paperCanvas.width=definition.source.width;paperCanvas.height=definition.source.height;
    const c=paperCanvas.getContext('2d'),r=definition.mapExtent;c.drawImage(bitmap,r.x,r.y,r.width,r.height,r.x,r.y,r.width,r.height);
    const paper=new T.CanvasTexture(paperCanvas);paper.colorSpace=T.SRGBColorSpace;paper.anisotropy=8;textures.add(paper);
    paperMaterial=new T.MeshBasicMaterial({map:paper,transparent:true,opacity:.7,depthWrite:false,toneMapped:false});materials.add(paperMaterial);
    mesh(uv(flat(surface.land,.15),p=>paperUV(p,matrix,definition.source)),paperMaterial,groundPaper);
    const caps=localPieces.map(p=>uv(flat(p.coordinates,p.height.top+.6),q=>paperUV(q,matrix,definition.source)));
    batch(caps,paperMaterial,roofPaper);
    regions=damageRegions(config,definition,bitmap,matrix);bitmap.close();
  }else if(config.colours)regions=damageRegions(config,definition,null,matrix);
  const groundDamage=new T.Group(),roofDamage=new T.Group();world.add(groundDamage);body.add(roofDamage);
  const selectionBox=new T.Box2().setFromPoints(selection[0][0].map(p=>new T.Vector2(...p))),studyCentre=selectionBox.getCenter(new T.Vector2());
  const studyPieces=localPieces.filter(p=>new T.Box2().setFromPoints(p.coordinates.flat(2).map(p=>new T.Vector2(...p))).intersectsBox(selectionBox));
  for(const r of regions){
    const mat=new T.MeshBasicMaterial({color:r.colour,toneMapped:false,side:T.DoubleSide});materials.add(mat);
    const ground=clipping.intersection(r.coordinates,surface.land);if(ground.length)mesh(flat(ground,.4),mat,groundDamage);
    const caps=[];
    for(const p of studyPieces){
      const intersection=clipping.intersection(p.coordinates,r.coordinates);if(intersection.length)caps.push(flat(intersection,p.height.top+.7));
    }
    batch(caps,mat,roofDamage);
  }
  const ring=selection[0][0].map(([x,y])=>new T.Vector3(x,y,1));
  const guideGeo=new T.BufferGeometry().setFromPoints(ring);geometries.add(guideGeo);
  const guideMat=new T.LineDashedMaterial({color:'#6b5948',dashSize:6,gapSize:4,depthTest:false});materials.add(guideMat);
  const guide=new T.Line(guideGeo,guideMat);guide.computeLineDistances();world.add(guide);
  const cutPlanes=selection[0][0].slice(0,-1).map((p,i)=>{
    const q=selection[0][0][i+1],normal=new T.Vector3(q[1]-p[1],0,q[0]-p[0]).normalize(),point=new T.Vector3(p[0],0,-p[1]);
    const plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,point);if(plane.distanceToPoint(new T.Vector3(studyCentre.x,0,-studyCentre.y))<0)plane.negate();return plane;
  });renderer.localClippingEnabled=true;
  let disposed=false,currentView='island';
  function render(){if(disposed||!host.clientWidth||!host.clientHeight)return;canvas.dataset.camera=JSON.stringify([...camera.position.toArray(),...controls.target.toArray()]);renderer.render(scene,camera);canvas.dataset.drawCalls=String(renderer.info.render.calls);}
  function view(mode){
    currentView=mode;
    const close=mode==='detail',top=mode==='top',target=new T.Vector3(close?studyCentre.x:centre[0],close?0:-130,close?-studyCentre.y:-centre[1]);
    const direction=top?new T.Vector3(0,1,.0001).normalize():new T.Vector3(.28,.85,.95).normalize();
    let distance=Math.max(660,500/camera.aspect);
    if(!close){
      scene.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(world);if(dirt.visible)bounds.union(new T.Box3().setFromObject(dirt));
      bounds.getCenter(target);
      const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
      const tanV=Math.tan(camera.fov*Math.PI/360)*.86,tanH=tanV*camera.aspect;
      distance=0;
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        const p=new T.Vector3(x,y,z).sub(target),depth=p.dot(direction);
        distance=Math.max(distance,Math.abs(p.dot(right))/tanH+depth,Math.abs(p.dot(up))/tanV+depth);
      }
    }
    controls.target.copy(target);controls.cursor.copy(target);
    camera.position.copy(target).add(direction.multiplyScalar(distance));controls.update();canvas.dataset.view=mode;render();
  }
  function update(next){
    body.visible=next.buildings;body.scale.z=next.height;
    dirt.visible=next.dirt;water.visible=next.river;roofs.visible=true;
    groundDamage.visible=roofDamage.visible=next.layer==='damage';
    groundPaper.visible=roofPaper.visible=next.layer==='paper';guide.visible=next.layer!=='modern';
    if(paperMaterial){paperMaterial.opacity=next.opacity;paperMaterial.clippingPlanes=next.scope==='selection'?cutPlanes:[];paperMaterial.needsUpdate=true;}
    controls.mouseButtons.LEFT=next.drag==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE;controls.touches.ONE=next.drag==='pan'?T.TOUCH.PAN:T.TOUCH.ROTATE;
    canvas.dataset.layer=next.layer;canvas.dataset.buildings=String(next.buildings);canvas.dataset.dirt=String(next.dirt);canvas.dataset.river=String(next.river);canvas.dataset.scope=next.scope;
    render();
  }
  const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();view(currentView);});resize.observe(host);
  controls.addEventListener('change',render);document.addEventListener('visibilitychange',render);
  const stats={buildings:buildings.length,pieces:pieces.length,release:source.release,sourceError,hasPaper:Boolean(paperMaterial),hasDamage:Boolean(regions.length),savedAt:config.savedAt};
  canvas.dataset.buildingCount=String(buildings.length);canvas.dataset.riverParts=String(surface.river.length);
  return {stats,update,view,zoom(factor){camera.position.sub(controls.target).multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance).add(controls.target);controls.update();render();},rotate(degrees){camera.position.sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),degrees*Math.PI/180).add(controls.target);controls.update();render();},dispose(){disposed=true;resize.disconnect();controls.dispose();document.removeEventListener('visibilitychange',render);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();}};
}
