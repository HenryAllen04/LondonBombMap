import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {colour,area} from './geometry';

export function createScene(host,study,onInspect) {
  const scene=new T.Scene(),renderer=new T.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);host.appendChild(renderer.domElement);
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Counterfactual damage model. Drag to orbit, scroll to zoom, arrow keys to pan. Use the layer buttons for an accessible breakdown.');
  const camera=new T.PerspectiveCamera(33,1,.1,3000),controls=new OrbitControls(camera,canvas);
  controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=45;controls.maxDistance=550;controls.listenToKeyEvents(canvas);
  const world=new T.Group();world.rotation.x=-Math.PI/2;scene.add(world);
  scene.add(new T.HemisphereLight('#ffffff','#aaa18f',2.5));const sun=new T.DirectionalLight('#ffffff',2);sun.position.set(-65,180,-65);scene.add(sun);
  const groups={outside:new T.Group(),overlap:new T.Group(),neutral:new T.Group()};Object.values(groups).forEach(g=>world.add(g));
  const meshes=[],materials=[],geometries=[];
  const material=(options)=>{const m=new T.MeshStandardMaterial({roughness:1,...options});materials.push(m);return m;};
  function shapes(coordinates){return coordinates.map(rings=>{const s=new T.Shape(rings[0].map(p=>new T.Vector2(p[0],-p[1])));s.holes=rings.slice(1).map(r=>new T.Path(r.map(p=>new T.Vector2(p[0],-p[1]))));return s;});}
  function hatch(m,dots=false){
    m.customProgramCacheKey=()=>dots?'impact-dots':'impact-stripes';
    m.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 impactPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nimpactPosition = position;');
      shader.fragmentShader='varying vec3 impactPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${dots?'vec2 cell = mod(impactPosition.xy, 2.3) - 1.15; float pattern = 1.0 - smoothstep(.13, .22, length(cell));':'float pattern = step(.65, fract((impactPosition.x + impactPosition.y) / 2.1));'}\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(${dots?'.25':'.82'}), pattern * .58);`);
    };
  }
  function mesh(coordinates,kind,category,height,base=0) {
    if(!coordinates.length)return;
    const geo=new T.ExtrudeGeometry(shapes(coordinates),{depth:height,bevelEnabled:false,steps:1,curveSegments:1});geometries.push(geo);geo.translate(0,0,base);
    const cap=material({color:colour(category)}),side=material({color:kind==='outside'?colour(category):'#d6d3c5'});
    if(kind==='outside')hatch(cap);if(kind==='neutral')hatch(cap,true);
    const m=new T.Mesh(geo,[cap,side]);m.userData={kind,category,area:area(coordinates)};groups[kind].add(m);meshes.push(m);
    const edges=new T.EdgesGeometry(geo,30),edgeMaterial=new T.LineBasicMaterial({color:kind==='outside'?colour(category):'#666b60',transparent:true,opacity:.5});geometries.push(edges);materials.push(edgeMaterial);
    groups[kind].add(new T.LineSegments(edges,edgeMaterial));
  }
  study.fragments.forEach(f=>mesh(f.outside,'outside',f.category,.35,.08));
  study.pieces.forEach(p=>{mesh(p.neutral,'neutral',null,p.height.height,p.height.base+.12);p.overlap.forEach(f=>mesh(f.coordinates,'overlap',f.category,p.height.height,p.height.base+.15));});
  const plateGeo=new T.ExtrudeGeometry(shapes(study.scope),{depth:1.7,bevelEnabled:false,steps:1});plateGeo.translate(0,0,-1.7);geometries.push(plateGeo);
  const plate=new T.Mesh(plateGeo,[material({color:'#eeeadd'}),material({color:'#c6c1af'})]);world.add(plate);
  const guides=new T.Group();world.add(guides);
  const guideMaterial=new T.LineDashedMaterial({color:'#858a7e',dashSize:1.2,gapSize:1,transparent:true,opacity:.6});materials.push(guideMaterial);
  const guideGeo=new T.BufferGeometry(),points=[];
  const corners=study.scope[0][0].slice(0,-1);
  corners.forEach(p=>points.push(p[0],-p[1],0,p[0],-p[1],1));guideGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));geometries.push(guideGeo);
  const lines=new T.LineSegments(guideGeo,guideMaterial);guides.add(lines);
  let mode='fragments',gap=24,filter='all',opacity=1,disposed=false;
  const viewpoints={};
  const render=()=>{if(!disposed&&host.clientWidth&&host.clientHeight){canvas.dataset.camera=JSON.stringify([...camera.position.toArray(),...controls.target.toArray()]);renderer.render(scene,camera);}};
  function update(next={}) {
    const changed=next.mode&&next.mode!==mode,changedGap=next.gap!=null&&next.gap!==gap;
    if(changed&&camera.position.distanceTo(controls.target)>1)viewpoints[mode]={position:camera.position.clone(),target:controls.target.clone()};
    mode=next.mode??mode;gap=next.gap??gap;filter=next.filter??filter;opacity=next.opacity??opacity;
    groups.overlap.position.z=mode==='layers'?gap:0;groups.neutral.position.z=mode==='layers'?gap*2:0;
    for(const [kind,g] of Object.entries(groups))g.traverse(o=>{
      if(o.isMesh)for(const m of o.material){m.transparent=true;m.opacity=(filter==='all'||filter===kind)?(kind==='neutral'?opacity:1):.075;m.depthWrite=m.opacity>.2;}
      if(o.isLineSegments)o.visible=filter==='all'||filter===kind;
    });
    guides.visible=mode==='layers';
    for(let i=0;i<corners.length;i++)guideGeo.attributes.position.setZ(i*2+1,gap*2+8);guideGeo.attributes.position.needsUpdate=true;guideGeo.computeBoundingSphere();lines.computeLineDistances();
    if(changed&&viewpoints[mode]){camera.position.copy(viewpoints[mode].position);controls.target.copy(viewpoints[mode].target);controls.update();}
    else if(changed||changedGap)fit();
    canvas.dataset.mode=mode;canvas.dataset.gap=String(gap);canvas.dataset.filter=filter;render();
  }
  function fit(top=false){
    const direction=top?new T.Vector3(0,1,.00001):new T.Vector3(-.75,.9,.55).normalize();
    world.updateMatrixWorld(true);
    const box=new T.Box3();box.expandByObject(plate);
    Object.values(groups).forEach(g=>box.expandByObject(g));
    const centre=box.getCenter(new T.Vector3()),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
    const tanV=Math.tan(camera.fov*Math.PI/360)*.8,tanH=tanV*camera.aspect;
    let distance=45;
    for(const object of [plate,...meshes]){
      const positions=object.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).sub(centre),depth=p.dot(direction);
        distance=Math.max(distance,Math.abs(p.dot(right))/tanH+depth,Math.abs(p.dot(up))/tanV+depth);
      }
    }
    controls.target.copy(centre);camera.position.copy(centre).add(direction.multiplyScalar(distance));controls.update();render();
  }
  function rotate(amount){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new T.Vector3(0,1,0),amount*Math.PI/180);camera.position.copy(controls.target).add(offset);controls.update();render();}
  function zoom(factor){camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();render();}
  const ray=new T.Raycaster();let down;
  function start(e){down=e.button===0?{x:e.clientX,y:e.clientY,id:e.pointerId,moved:false}:null;}
  function move(e){if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;}
  function cancel(){down=null;}
  function pick(e){const d=down;down=null;if(!d||d.moved||e.pointerId!==d.id)return;const b=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(meshes.filter(m=>filter==='all'||m.userData.kind===filter))[0];if(hit)onInspect(hit.object.userData);}
  canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',pick);canvas.addEventListener('pointercancel',cancel);controls.addEventListener('change',render);
  let fitted=false;
  const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(!fitted){fit();fitted=true;}else render();});resize.observe(host);update();
  return {update,fit,rotate,zoom,dispose(){disposed=true;resize.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',pick);canvas.removeEventListener('pointercancel',cancel);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.remove();}};
}
