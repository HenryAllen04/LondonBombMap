'use client';
import {useEffect,useRef,useState} from 'react';
import polygonClipping from 'polygon-clipping';
import {toMetres} from '@/lib/local-history';
const polys=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
export default function ObjectPreview({objects,buildings,onSelect,completePartitions=false,showFit=false}){
 const host=useRef(null),select=useRef(onSelect),update=useRef(null),fit=useRef(null),latest=useRef(null),[error,setError]=useState('');select.current=onSelect;
 latest.current={objects,buildings,completePartitions};
 useEffect(()=>{
  let cancelled=false,dispose;
  setError('');
  Promise.all([import('three'),import('three/addons/controls/OrbitControls.js')]).then(([T,{OrbitControls}])=>{
   if(cancelled)return;
   const element=host.current,renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));element.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label','3D preview of named building objects. Drag to orbit and click an object to identify it.');
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,10000),controls=new OrbitControls(camera,renderer.domElement);
   scene.add(new T.HemisphereLight('#ffffff','#807569',2));const sun=new T.DirectionalLight('#ffffff',2);sun.position.set(-100,300,100);scene.add(sun);
   const group=new T.Group();group.rotation.x=-Math.PI/2;scene.add(group);const meshes=[];
   function mesh(geometry,height,color,id,base=0,stripes=[]){
    const shapes=polys(geometry).map(rings=>{const shape=new T.Shape(rings[0].map(p=>new T.Vector2(...toMetres(p))));shape.holes=rings.slice(1).map(r=>new T.Path(r.map(p=>new T.Vector2(...toMetres(p)))));return shape;});
    const geometry3D=new T.ExtrudeGeometry(shapes,{depth:height,bevelEnabled:false,steps:1,curveSegments:1});
    const material=new T.MeshStandardMaterial({color,roughness:1});
    if(stripes.length>1){
     material.customProgramCacheKey=()=>stripes.join(',');
     material.onBeforeCompile=shader=>{
      const branches=stripes.map((hex,i)=>{const c=new T.Color(hex);return `${i?'else ':''}if (band < ${i+1}.0) diffuseColor.rgb = vec3(${c.r.toFixed(6)},${c.g.toFixed(6)},${c.b.toFixed(6)});`;}).join('\n');
      shader.vertexShader='varying vec3 stripePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstripePosition = position;');
      shader.fragmentShader='varying vec3 stripePosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat band = mod(floor((stripePosition.x + stripePosition.y) / 4.0), ${stripes.length}.0);\n${branches}`);
     };
    }
    const m=new T.Mesh(geometry3D,material);geometry3D.translate(0,0,base);m.userData.id=id;group.add(m);meshes.push(m);
    group.add(new T.LineSegments(new T.EdgesGeometry(geometry3D),new T.LineBasicMaterial({color:'#625f52',transparent:true,opacity:.45})));
   }
   const render=()=>renderer.render(scene,camera);
   function fitCamera(){
    const box=new T.Box3().setFromObject(group),centre=new T.Vector3();if(box.isEmpty()){centre.set(0,0,0);camera.position.set(60,80,80);}else{box.getCenter(centre);const size=box.getSize(new T.Vector3()).length();camera.position.copy(centre).add(new T.Vector3(size*.65,size*.9,size*.8));}
    controls.target.copy(centre);controls.update();render();
   }
   let extent;
   function updateObjects({objects,buildings,completePartitions}){
    group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});group.clear();meshes.length=0;
   for(const building of buildings){
    const assigned=objects.filter(o=>o.properties.componentId===building.id);
    if(completePartitions&&assigned.length)continue;
    const rest=assigned.length?polygonClipping.difference(polys(building.geometry),...assigned.map(o=>polys(o.geometry))):polys(building.geometry);
    if(rest.length)mesh({type:'MultiPolygon',coordinates:rest},building.properties.height.height,'#d2cdbf',null);
   }
   for(const object of objects){
    const parent=buildings.find(b=>b.id===object.properties.componentId),part=parent?.renderPieces?.find(p=>p.id===object.properties.partId),height=part?.height??parent?.properties.height;
    mesh(object.geometry,height?.height??8,object.properties.relationship==='rebuilt'||object.properties.conflicts?.length?'#b3b2a5':object.color,object.id,height?.base??0,object.stripes);
   }
    const nextExtent=JSON.stringify(buildings.map(b=>[b.id,b.geometry]));
    if(extent!==nextExtent){extent=nextExtent;fitCamera();}else render();
   }
   update.current=updateObjects;fit.current=fitCamera;updateObjects(latest.current);
   controls.addEventListener('change',render);
   const resize=new ResizeObserver(()=>{const {width,height}=element.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();});resize.observe(element);
   let down;const ray=new T.Raycaster();const start=e=>{down=[e.clientX,e.clientY];};const pick=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(meshes)[0];if(hit?.object.userData.id)select.current(hit.object.userData.id);};
   renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',pick);render();
   dispose=()=>{update.current=null;fit.current=null;resize.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',pick);scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.dispose();renderer.domElement.remove();};
  }).catch(e=>{if(!cancelled)setError(e.message);});
  return()=>{cancelled=true;dispose?.();};
 },[]);
 useEffect(()=>{update.current?.({objects,buildings,completePartitions});},[objects,buildings,completePartitions]);
 return <div className="review-object-preview" ref={host}>{showFit&&<button className="preview-fit" onClick={()=>fit.current?.()}>Fit 3D view</button>}{error&&<p role="alert">{error}</p>}{!objects.length&&!buildings.length&&<p>Select a modern building to preview its objects.</p>}</div>;
}
