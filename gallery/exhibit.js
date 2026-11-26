import * as THREE from '../muse/vendor/three.module.js';
import { photosFor, readPhotoLibrary, photoLibraryURL } from '../assets/photos/library.js?v=public-daily';

const mode=document.body.dataset.gallery,$=id=>document.getElementById(id),canvas=$('webgl');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const loader=new THREE.TextureLoader(),cache=new Map(),inflight=new Map(),planes=new Map();
const palette={depth:0x172019,aristide:0x141414,camille:0x172526};
let rows=[],renderer,scene,camera,index=0,position=0,viewIndex=0,raf=0,pointer={x:0,y:0},wheel=0,gesture=null,gestureOffset=0;
let fallbackGeneration=0;
const geom=new THREE.PlaneGeometry(1,1,mode==='depth'?64:18,mode==='depth'?64:18);
const vertex=`uniform sampler2D depthMap;uniform float depthAmount;varying vec2 vUv;
void main(){vUv=uv;vec3 p=position;if(depthAmount>0.)p.z+=(texture2D(depthMap,uv).r-.5)*depthAmount;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const fragment=`uniform sampler2D map;uniform vec2 pointer;uniform float displacement;uniform float monochrome;varying vec2 vUv;
void main(){vec2 uv=vUv;uv.x+=sin(uv.y*18.+pointer.y*2.)*displacement*.006;vec2 ca=(uv-.5)*.004*displacement;vec3 col=vec3(texture2D(map,uv+ca).r,texture2D(map,uv).g,texture2D(map,uv-ca).b);float l=dot(col,vec3(.2126,.7152,.0722));gl_FragColor=vec4(mix(col,vec3(l),monochrome),1.);
#include <colorspace_fragment>
}`;
function fetchTexture(relative){return loader.loadAsync(new URL(relative,photoLibraryURL).href);}
function ensure(i){
 if(cache.has(i))return Promise.resolve(cache.get(i));
 if(inflight.has(i))return inflight.get(i);
 const row=rows[i];
 const promise=Promise.all([fetchTexture(row.src),mode==='depth'&&row.depthSrc?fetchTexture(row.depthSrc).catch(()=>null):null]).then(([image,depth])=>{
  image.colorSpace=THREE.SRGBColorSpace;
  const data={image,depth};cache.set(i,data);return data;
 }).finally(()=>inflight.delete(i));
 inflight.set(i,promise);return promise;
}
function info(){
 const p=rows[index];
 $('count').textContent=`${String(index+1).padStart(2,'0')} / ${String(rows.length).padStart(2,'0')}`;
 $('index').textContent=String(index+1).padStart(2,'0');$('photo-title').textContent=p.title;$('photo-date').textContent=p.date||'';
 $('source-attribution').textContent=p.sourceAttribution||'';$('source').href=p.source;
 const art=$('source-article');art.hidden=!p.sourceArticle;if(p.sourceArticle)art.href=p.sourceArticle;else art.removeAttribute('href');
 $('prev').disabled=index===0;$('next').disabled=index===rows.length-1;
}
function detach(i){const p=planes.get(i);if(!p)return;scene.remove(p);p.material.dispose();planes.delete(i);}
function attach(i,data){
 if(planes.has(i))return;
 const p=new THREE.Mesh(geom,new THREE.ShaderMaterial({uniforms:{map:{value:data.image},depthMap:{value:data.depth||data.image},
 depthAmount:{value:data.depth?.isTexture ? .72 : 0},pointer:{value:new THREE.Vector2()},displacement:{value:0},monochrome:{value:mode==='aristide'?1:0}},vertexShader:vertex,fragmentShader:fragment}));
 scene.add(p);planes.set(i,p);
}
function keep(i,radius){return i>=0&&i<rows.length&&(Math.abs(i-index)<=radius||i===viewIndex);}
async function refresh(){
 if(!renderer){
  const serial=++fallbackGeneration,src=new URL(rows[index].src,photoLibraryURL).href,image=new Image();image.src=src;
  try{await image.decode();if(serial!==fallbackGeneration)return;$('fallback').replaceChildren(image);$('fallback').hidden=false;info()}catch{if(serial===fallbackGeneration)$('fallback').textContent='这张照片暂时无法读取。'}
  return;
 }
 const radius=mode==='aristide'?1:2,requested=index,near=[requested];
 for(let k=1;k<=radius;k++)for(const i of [requested+k,requested-k])if(i>=0&&i<rows.length)near.push(i);
 // Current photo first, then at most four neighbours. Never initialize all 122 textures.
 try{
  const chosen=await ensure(requested);
  if(index!==requested)return;
  attach(requested,chosen);viewIndex=requested;info();
  if(reduced.matches||Math.abs(position-requested)>2)position=requested;
  for(const i of [...planes.keys()])if(!keep(i,radius))detach(i);
  for(const i of near.slice(1)){
   if(index!==requested)break;
   try{const data=await ensure(i);if(keep(i,radius))attach(i,data);}catch{}
  }
 }catch{if(index===requested){index=viewIndex;info();}}
 finally{
  for(const [i,data] of cache)if(!keep(i,radius+1)&&!planes.has(i)){data.image.dispose();data.depth?.dispose();cache.delete(i);}
 }
}
function change(next){
 if(!rows.length)return;
 const chosen=clamp(next,0,rows.length-1);if(chosen===index)return;
 index=chosen;document.body.classList.remove('revealed');void refresh();
}
function resize(){if(!renderer)return;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function animate(){
 raf=requestAnimationFrame(animate);
 const target=viewIndex+gestureOffset,diff=target-position;position=reduced.matches?viewIndex:position+diff*.13;
 const mobile=innerWidth<650,slide=mobile?2.54:3.45;
 for(const [i,p] of planes){
  const row=rows[i],r=row.width/row.height,d=i-position;
  const maxW=mode==='aristide'?(mobile?2.55:7):(mobile?2.53:3.95);
  const cap=mode==='aristide'?5.72:mode==='camille'?4.72:3.5;
  const h=Math.min(cap,maxW/r),w=h*r;
  p.visible=mode!=='aristide'||i===viewIndex;
  p.scale.set(w,h,1);p.material.uniforms.pointer.value.set(pointer.x,pointer.y);
  p.material.uniforms.displacement.value=reduced.matches?0:Math.min(1,Math.abs(diff)*.85);
  if(mode==='depth'){
   p.position.set((i%2? .29:-.18)+d*.19,Math.sin(i*1.6)*.18,-d*2.65);
   p.visible=d>=-.55;p.rotation.z=(i%2?.032:-.035);
  }else{p.position.set(mode==='camille'?d*slide:0,mode==='camille'?Math.sin(i*.7)*.10:0,-Math.abs(d)*.075);}
 }
 const px=reduced.matches?0:pointer.x*.19,py=reduced.matches?0:pointer.y*.15;
 camera.position.x+=(px-camera.position.x)*.13;camera.position.y+=(py-camera.position.y)*.13;
 renderer.render(scene,camera);
}
function press(active){document.body.classList.toggle('revealed',active);}
$('prev').onclick=()=>change(index-1);$('next').onclick=()=>change(index+1);
const hold=$('hold');
hold.addEventListener('pointerdown',e=>{hold.setPointerCapture(e.pointerId);press(true)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])hold.addEventListener(event,()=>press(false));
hold.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press(true)}});
hold.addEventListener('keyup',()=>press(false));hold.addEventListener('blur',()=>press(false));
window.addEventListener('keydown',e=>{if(e.altKey||e.metaKey||e.ctrlKey)return;if(e.key==='ArrowRight')change(index+1);if(e.key==='ArrowLeft')change(index-1)});
canvas.addEventListener('wheel',e=>{if(mode==='aristide')return;e.preventDefault();
 wheel+=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
 if(Math.abs(wheel)>48){change(index+Math.sign(wheel));wheel=0}
},{passive:false});
canvas.addEventListener('pointerdown',e=>{gesture={x:e.clientX,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{pointer={x:2*e.clientX/innerWidth-1,y:1-2*e.clientY/innerHeight};
 if(mode==='camille'&&gesture?.id===e.pointerId)gestureOffset=clamp((gesture.x-e.clientX)/240,index===0?0:-.82,index===rows.length-1?0:.82);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{
 if(gesture?.id!==e.pointerId)return;const dx=gesture.x-e.clientX;gesture=null;gestureOffset=0;if(mode==='camille'&&event==='pointerup'&&Math.abs(dx)>42)change(index+Math.sign(dx));
});
window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});
window.addEventListener('pageshow',()=>{if(renderer&&!raf)animate();});

try{
 rows=photosFor(await readPhotoLibrary(),'muse');
 if(!rows.length)throw Error('没有可展示的照片');
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});scene=new THREE.Scene();scene.background=new THREE.Color(palette[mode]);camera=new THREE.PerspectiveCamera(mode==='aristide'?41:43,1,.1,100);camera.position.z=8;resize();}
 catch{renderer=null;canvas.hidden=true;hold.hidden=true;}
 await refresh();if(renderer&&!raf)animate();
}catch(error){$('fallback').hidden=false;$('fallback').textContent='展项暂时无法载入。';}
