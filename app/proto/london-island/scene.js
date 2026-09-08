import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import polygonClipping from 'polygon-clipping';
import boroughs from '../borough-plates/boroughs.json';
import { bounds } from '../borough-plates/matching';
import { damageCategories } from '@/lib/damage';
import { roofFragments } from './damage-fragments';
import { PILOT_CENTER, pilotRegion } from '@/lib/pimlico-pilot';

const RAD=Math.PI/180;
export const project=([lon,lat])=>[(lon+.09)*111.32*Math.cos(51.5*RAD),(lat-51.49)*111.32];
const polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const palettes={
 paper:{land:'#eee8db',side:'#baa784',road:'#c3b18f',water:'#799f99',park:'#c8cbb2',building:'#e2d2b1',ink:'#554d3e',light:'#fff3dd'},
 pieces:{land:'#ebe9df',side:'#c0bbaa',road:'#c8c4b6',water:'#91aaa9',park:'#d0d5bf',building:'#e6e0cf',ink:'#505b55',light:'#ffffff'},
 night:{land:'#3c4847',side:'#202b2b',road:'#65716b',water:'#202e32',park:'#455b4c',building:'#baad8e',ink:'#e2d2b1',light:'#eee4c9'},
};
function shape(rings){
 const s=new THREE.Shape(rings[0].map(p=>new THREE.Vector2(...project(p))));
 s.holes=rings.slice(1).map(r=>new THREE.Path(r.map(p=>new THREE.Vector2(...project(p)))));return s;
}
function shapeGeometry(geometry,depth){
 return new THREE.ExtrudeGeometry(polys(geometry).map(shape),{depth,bevelEnabled:false,steps:1,curveSegments:1});
}
function texture(features,box,palette,size=4096){
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext('2d');const [x0,y0,x1,y1]=box;
 const pixel=p=>{const [x,y]=project(p);return [(x-x0)/(x1-x0)*size,(y1-y)/(y1-y0)*size]};
 ctx.fillStyle=palette.land;ctx.fillRect(0,0,size,size);
 const path=(coords)=>{ctx.beginPath();for(const ring of coords){ring.forEach((p,i)=>{const [x,y]=pixel(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();}};
 for(const f of features){
  const {layer}=f.properties,g=f.geometry;
  if(['Polygon','MultiPolygon'].includes(g.type)&&['landcover','park','water'].includes(layer)){
   ctx.fillStyle=layer==='water'?palette.water:palette.park;
   for(const p of polys(g)){path(p);ctx.fill('evenodd');}
  }
 }
 ctx.lineCap='round';ctx.lineJoin='round';
 for(const f of features){if(f.properties.layer!=='transportation')continue;
  const g=f.geometry;if(!['LineString','MultiLineString'].includes(g.type))continue;
  ctx.strokeStyle=palette.road;ctx.lineWidth=['motorway','trunk','primary'].includes(f.properties.class)?1.7:.65;
  for(const line of g.type==='LineString'?[g.coordinates]:g.coordinates){ctx.beginPath();line.forEach((p,i)=>{const [x,y]=pixel(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();}
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
function assignUV(geometry,box){
 const positions=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)-box[0])/(box[2]-box[0]),(positions.getY(i)-box[1])/(box[3]-box[1]));
 uv.needsUpdate=true;
}
function label(text,color){
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
 ctx.font='500 30px Arial';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text.toUpperCase(),256,55);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));sprite.scale.set(6,1.125,1);sprite.renderOrder=5;return sprite;
}

export async function createIsland(container,style,callbacks,signal){
 const responses=await Promise.all(['pimlico','building-index'].map(name=>fetch(`/proto/london-island/${name}.json`,{signal})));
 if(responses.some(r=>!r.ok))throw new Error('The saved Pimlico geometry or building index could not load. Run pnpm benchmark:pimlico.');
 const [detail,index]=await Promise.all(responses.map(r=>r.json()));
 const region=pilotRegion(boroughs),features=index.features;
 const damageAreas={features:index.historicalAreas.map(f=>({...f,properties:{...f.properties,color:damageCategories[f.properties.category].color}}))};
 if(signal.aborted)return null;
 const palette=palettes[style],scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.setClearColor(0,0);
 renderer.domElement.setAttribute('aria-label','Pimlico study. Drag to orbit; scroll or pinch to zoom.');
 renderer.domElement.setAttribute('role','img');container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(36,container.clientWidth/container.clientHeight,.003,500),controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=false;controls.minDistance=.35;controls.maxDistance=8;controls.minPolarAngle=.12;controls.maxPolarAngle=82*RAD;
 controls.maxTargetRadius=1.4;controls.screenSpacePanning=true;
 renderer.domElement.tabIndex=0;
 controls.listenToKeyEvents(renderer.domElement);
 function setDragMode(mode){controls.mouseButtons.LEFT=mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;controls.touches.ONE=mode==='pan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;renderer.domElement.setAttribute('aria-label',`Pimlico study. Drag to ${mode}; arrow keys pan; scroll or pinch to zoom.`);}
 const hemisphere=new THREE.HemisphereLight('#ffffff','#716450',1.7);scene.add(hemisphere);
 const sun=new THREE.DirectionalLight(palette.light,3);sun.position.set(-30,60,25);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-50;sun.shadow.camera.right=50;sun.shadow.camera.top=50;sun.shadow.camera.bottom=-50;sun.shadow.camera.far=180;sun.shadow.normalBias=.025;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:style==='night'?.32:.16}));ground.rotation.x=-Math.PI/2;ground.position.y=-2.2;ground.receiveShadow=true;scene.add(ground);
 const allPoints=[region].flatMap(f=>polys(f.geometry).flat(2).map(project));
 const worldBox=[Math.min(...allPoints.map(p=>p[0])),Math.min(...allPoints.map(p=>p[1])),Math.max(...allPoints.map(p=>p[0])),Math.max(...allPoints.map(p=>p[1]))];
 const mapTexture=texture(detail.features,worldBox,palettes.paper,2048);
 const parts=[],surfaces=[],buildingMeshes=[],buildingRecords=[],fragmentMeshes=[],areaMeshes=[],overlapOutlines=[],extraMaterials=[];
 let values=null,selected='',disposed=false,selection=null;
 function render(){if(!disposed&&!document.hidden)renderer.render(scene,camera);}
 const regionIndex=[region].map(f=>({...bounds(f.geometry),feature:f}));
 for(const entry of regionIndex){
  const f=entry.feature,b=entry,centre=project([(b.minX+b.maxX)/2,(b.minY+b.maxY)/2]);
  const group=new THREE.Group();group.rotation.x=-Math.PI/2;scene.add(group);
  const geometry=shapeGeometry(f.geometry,1);geometry.translate(0,0,-1);assignUV(geometry,worldBox);
  const top=new THREE.MeshStandardMaterial({map:mapTexture,roughness:1});
  const sides=new THREE.MeshStandardMaterial({color:palette.side,roughness:1});
  const body=new THREE.Mesh(geometry,[top,sides]);body.castShadow=true;body.receiveShadow=true;body.userData.name=f.properties.name;group.add(body);surfaces.push(body);
  const outlineGeometry=new THREE.BufferGeometry();const points=[];
  for(const polygon of polys(f.geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){const a=project(ring[i-1]),b=project(ring[i]);points.push(...a,.006,...b,.006);}
  outlineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  group.add(new THREE.LineSegments(outlineGeometry,new THREE.LineBasicMaterial({color:palette.side,transparent:true,opacity:.8})));
  const title=label(f.properties.name,palette.ink);title.position.set(centre[0],.25,-centre[1]);scene.add(title);
  parts.push({name:f.properties.name,group,body,top,sides,centre,title,bounds:b,span:Math.max((b.maxX-b.minX)*69,(b.maxY-b.minY)*111)});
 }
 for(const f of features){
  const result=f.properties.assessment,wholeCategory=result.wholeBuilding?.category;
  const historicalSite=index.historicalSites?.find(s=>s.modernBuildingId===f.properties.buildingId);
  const record={id:f.id,sourceId:f.properties.buildingId,name:f.properties.sourceName??historicalSite?.name,release:index.release,historicalSite,
   clipped:f.properties.clipped,height:f.properties.height.top,heightSource:f.properties.height.source,
   status:result.status,coverage:result.candidates[0]?.coverage??0,sourceArea:result.candidates[0]?.id??null,
   candidates:result.candidates,sensitive:result.sensitivity.changedShifts.length>0,
   sourceDatasets:f.properties.sources.map(s=>s.dataset),sources:f.properties.sources,
   sourceParts:f.renderPieces.filter(p=>p.id!==f.id).map(p=>p.id),verified:false};
  buildingRecords.push(record);
  for(const piece of f.renderPieces){
   const {base,height,top}=piece.height;
   const geometry=shapeGeometry(piece.geometry,height/1000);geometry.translate(0,0,base/1000+.0001);
   const neutral=new THREE.MeshStandardMaterial({color:palette.building,roughness:1});
   const damage=wholeCategory&&!historicalSite?new THREE.MeshBasicMaterial({color:damageCategories[wholeCategory].color,toneMapped:false}):neutral;
   extraMaterials.push(neutral,damage);
   const mesh=new THREE.Mesh(geometry,neutral);
   mesh.userData={neutral,damage,record};mesh.castShadow=true;mesh.receiveShadow=true;
   parts[0].group.add(mesh);buildingMeshes.push(mesh);
   if(result.candidates.length){
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:style==='night'?'#dfbd82':'#8c512c',toneMapped:false}));
    outline.position.z=.00008;parts[0].group.add(outline);overlapOutlines.push(outline);
   }
   const candidates=result.candidates.map(c=>({...c,color:damageCategories[c.category].color}));
   for(const fragment of roofFragments(piece.geometry,candidates,damageAreas.features)){
    const cap=new THREE.ShapeGeometry(polys(fragment.geometry).map(shape));cap.translate(0,0,top/1000+.0002);
    const patch=new THREE.Mesh(cap,new THREE.MeshBasicMaterial({color:fragment.color,toneMapped:false,side:THREE.DoubleSide}));
    parts[0].group.add(patch);fragmentMeshes.push(patch);
   }
  }
 }
 // Historical evidence remains independent of modern roofs and replacement buildings.
 for(const fragment of roofFragments(region.geometry,damageAreas.features.map(f=>({...f.properties})),damageAreas.features)){
  const geometry=new THREE.ShapeGeometry(polys(fragment.geometry).map(shape));geometry.translate(0,0,.00015);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:fragment.color,toneMapped:false,transparent:true,opacity:.7,side:THREE.DoubleSide}));
  parts[0].group.add(mesh);areaMeshes.push(mesh);
 }
 function inspect(id){
  if(selection){selection.removeFromParent();selection.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});selection=null;}
  const meshes=buildingMeshes.filter(m=>m.userData.record.id===id);
  if(meshes.length){
   selection=new THREE.Group();
   for(const mesh of meshes)selection.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:palette.ink})));
   selection.scale.z=values?.surface.buildingHeight??1;selection.position.z=.00005;selection.visible=values?.surface.buildings??true;parts[0].group.add(selection);
  }
  callbacks.onBuilding(meshes[0]?.userData.record??null);render();
 }
 function apply(next){
  const previous=values;values=next;
  for(const p of parts){
   const offset=0;
   p.group.position.set(p.centre[0]*offset,p.name===selected?next.form.lift:0,-p.centre[1]*offset);
   p.body.scale.z=next.form.thickness;
   p.top.color.set(next.surface.mapDetails?'#ffffff':next.palette.modelColour);p.sides.color.set(next.palette.modelColour);
   p.top.map=next.surface.mapDetails?mapTexture:null;p.top.needsUpdate=true;
   p.title.position.set(p.centre[0]*(1+offset),p.group.position.y+.15,-p.centre[1]*(1+offset));
   p.title.visible=next.surface.labels&&p.span>4&&camera.position.distanceTo(controls.target)>18;
  }
  for(const m of buildingMeshes){m.scale.z=next.surface.buildingHeight;m.visible=next.surface.buildings;m.userData.neutral.color.set(next.palette.modelColour);
   m.material=next.surface.damageColours&&next.surface.damageView==='whole'?m.userData.damage:m.userData.neutral;
  }
  if(selection){selection.scale.z=next.surface.buildingHeight;selection.visible=next.surface.buildings;}
  for(const m of fragmentMeshes){m.scale.z=next.surface.buildingHeight;m.visible=next.surface.buildings&&next.surface.damageColours&&next.surface.damageView==='fragments';}
  for(const m of overlapOutlines){m.scale.z=next.surface.buildingHeight;m.visible=next.surface.buildings&&next.surface.damageColours&&next.surface.damageView==='whole';}
  for(const m of areaMeshes)m.visible=next.surface.damageColours&&next.surface.damageView!=='fragments';
  ground.position.y=-next.form.thickness-.8;
  sun.intensity=next.surface.light;
  if(!previous||previous.camera.tilt!==next.camera.tilt||previous.camera.bearing!==next.camera.bearing)orient(next.camera.tilt,next.camera.bearing);
  render();
 }
 function orient(tilt,bearing,distance=camera.position.distanceTo(controls.target)||95){
  const offset=new THREE.Vector3().setFromSphericalCoords(distance,tilt*RAD,bearing*RAD);camera.position.copy(controls.target).add(offset);controls.update();
 }
 function focus(name){
  selected='Pimlico';
  if(values)apply(values);
  const p=parts.find(p=>p.name===selected);
  const xy=project(PILOT_CENTER);
  const target=new THREE.Vector3(xy[0]+p.group.position.x,p.group.position.y,-xy[1]+p.group.position.z);
  const distance=Math.max(3.4,2.8/camera.aspect);
  controls.maxDistance=Math.max(8,distance*1.5);
  controls.cursor.copy(target);

  controls.target.copy(target);orient(values?.camera.tilt??55,values?.camera.bearing??-18,distance);if(values)apply(values);
 }
 function cameraChanged(){
  if(values){for(const p of parts)p.title.visible=values.surface.labels&&p.span>4&&camera.position.distanceTo(controls.target)>18;}
  render();
 }
 controls.addEventListener('change',cameraChanged);
 controls.addEventListener('end',()=>callbacks.onCamera({tilt:Math.round(controls.getPolarAngle()/RAD),bearing:Math.round(controls.getAzimuthalAngle()/RAD)}));
 let down=null;const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function pointerDown(e){down=e.button===0&&e.isPrimary?{x:e.clientX,y:e.clientY,id:e.pointerId,moved:false}:null;}
 function pointerMove(e){if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;}
 function pointerCancel(){down=null;}
 function pointerUp(e){const start=down;down=null;if(!start||start.moved||e.button!==0||start.id!==e.pointerId)return;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const building=values?.surface.buildings?raycaster.intersectObjects(buildingMeshes)[0]:null;
  if(building){inspect(building.object.userData.record.id);return;}
  const hit=raycaster.intersectObjects(surfaces)[0];if(hit)callbacks.onSelect('Pimlico');
 }
 renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
 const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(values)focus('Pimlico');render();});resize.observe(container);
 document.addEventListener('visibilitychange',render);
 camera.position.set(0,65,80);controls.update();
 callbacks.onReady({buildings:index.summary.components,buildingRecords:index.summary.buildingRecords,candidates:index.summary.statusCounts.candidate,overlapParts:index.summary.withDraftOverlap,summary:index.summary,release:index.release,records:buildingRecords});
 return {apply,focus,inspect,setDragMode,zoom:factor=>{camera.position.sub(controls.target).multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance).add(controls.target);controls.update();},rotate:angle=>{orient(controls.getPolarAngle()/RAD,controls.getAzimuthalAngle()/RAD+angle);callbacks.onCamera({tilt:Math.round(controls.getPolarAngle()/RAD),bearing:Math.round(controls.getAzimuthalAngle()/RAD)});},
 dispose(){disposed=true;resize.disconnect();controls.dispose();document.removeEventListener('visibilitychange',render);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
 const textures=new Set([mapTexture]),materials=new Set(),geometries=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());extraMaterials.forEach(m=>materials.add(m));materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}
