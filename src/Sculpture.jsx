import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
// Tactile material direction: the free GetLayers Gravity reference.
// Product-specific interlocking form, built with original Three.js geometry.
export default function Sculpture(){
 const mount=useRef(null),controller=useRef(null);const [paused,setPaused]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  let disposed=false,cleanup=()=>{};
  import('three').then(THREE=>{
   if(disposed||!mount.current)return;
   const host=mount.current;let renderer,renderable=true;
   try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
   renderer.debug.onShaderError=()=>{renderable=false;setReady(false);};
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;host.appendChild(renderer.domElement);
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,0,9);
   scene.add(new THREE.AmbientLight(0xffeee0,2.3));
   const key=new THREE.DirectionalLight(0xffe1c4,6);key.position.set(-3,5,5);scene.add(key);
   const rim=new THREE.DirectionalLight(0xffffff,4);rim.position.set(4,2,-2);scene.add(rim);
   const fill=new THREE.PointLight(0x72bca9,25);fill.position.set(-3,-2,3);scene.add(fill);
   const group=new THREE.Group();scene.add(group);
   const clay=new THREE.MeshPhysicalMaterial({color:0x277f72,roughness:.24,metalness:.3,clearcoat:.4,clearcoatRoughness:.3});
   const ring=new THREE.Mesh(new THREE.TorusKnotGeometry(1.03,.28,180,28,2,3),clay);ring.rotation.set(.3,-.2,-.25);group.add(ring);
   const inner=new THREE.Mesh(new THREE.TorusGeometry(.58,.035,16,96),new THREE.MeshStandardMaterial({color:0xf7e6c8,metalness:.65,roughness:.25}));inner.rotation.x=1;inner.position.set(.1,.05,0);group.add(inner);
   let frame,visible=true,pointer={x:0,y:0},rotation={x:0,y:0},last=0,t=0,needsRender=true;
   const reduce=matchMedia('(prefers-reduced-motion: reduce)');
   const render=(time)=>{frame=requestAnimationFrame(render);if(!renderable||!visible||document.hidden||time-last<33)return;
    const animated=!controller.current?.paused&&!reduce.matches;
    if(!animated&&!needsRender)return;
    const delta=Math.min((time-last)/1000,.05);last=time;
    if(animated){t+=delta;rotation.x+=(pointer.y-rotation.x)*.08;rotation.y+=(pointer.x-rotation.y)*.08;group.rotation.set(rotation.x*.22+Math.sin(t*.35)*.1,t*.12+rotation.y*.3,Math.sin(t*.25)*.06);group.position.y=Math.sin(t*.6)*.07;}
    renderer.render(scene,camera);needsRender=false;
   };
   const size=()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();needsRender=true;};
   const observer=new ResizeObserver(size);observer.observe(host);size();
   const intersection=new IntersectionObserver(([e])=>visible=e.isIntersecting);intersection.observe(host);
   const move=e=>{if(!matchMedia('(pointer:fine)').matches)return;const r=host.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5};};
   const lost=e=>{e.preventDefault();renderable=false;setReady(false);};
   const restored=()=>{renderable=true;needsRender=true;setReady(true);};
   renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);
   host.addEventListener('pointermove',move);controller.current={paused:false};frame=requestAnimationFrame(render);setReady(true);
   cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();host.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',restored);scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();renderer.domElement.remove();};
  });return()=>{disposed=true;cleanup();};
 },[]);
 return <div className="sculpture-stage"><div className={`sculpture-fallback ${ready?'is-rendered':''}`} aria-hidden="true"><span/><span/><span/></div><div ref={mount} className="sculpture-canvas" role="img" aria-label="A deep teal interlocking sculpture turning gently in three dimensions"/><div className="sculpture-shadow"/><button type="button" className="motion-control" aria-label={paused?'Play 3D animation':'Pause 3D animation'} aria-pressed={paused} onClick={()=>{setPaused(!paused);if(controller.current)controller.current.paused=!paused;}}>{paused?<Play size={14}/>:<Pause size={14}/>}<span>{paused?'Play motion':'Pause motion'}</span></button></div>;
}
