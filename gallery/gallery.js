import * as THREE from '../muse/vendor/three.module.js';
import { readPhotoLibrary } from '../assets/photos/library.js';
const mode=document.body.dataset.gallery, $=id=>document.getElementById(id), canvas=$('webgl');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let photos=[],index=0,renderer,scene,camera,planes=[],raf=0,last=0,scroll=0,scrollTarget=0,velocity=0,pointer={x:0,y:0},drag=null,hold=false;
const palette={depth:[0x171b17,0x27342c,0x252b28],aristide:[0x121212,0x242424,0x171717],camille:[0x182323,0x2d3b39,0x222d2c]};
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`uniform sampler2D map;uniform float time;uniform float velocity;uniform vec2 pointer;uniform float distortion;varying vec2 vUv;void main(){vec2 uv=vUv;float wave=sin(uv.y*9.+time*.7)*.003*velocity;uv.x+=wave+sin(uv.y*18.+pointer.y*2.)*distortion*.008;uv.y+=cos(uv.x*12.+time*.3)*distortion*.004;vec2 ca=(uv-.5)*.004*distortion;vec3 col=vec3(texture2D(map,uv+ca).r,texture2D(map,uv).g,texture2D(map,uv-ca).b);gl_FragColor=vec4(col,1.);}`;
function material(texture){return new THREE.ShaderMaterial({uniforms:{map:{value:texture},time:{value:0},velocity:{value:0},pointer:{value:new THREE.Vector2()},distortion:{value:0}},vertexShader:vertex,fragmentShader:fragment});}
function dispose(){cancelAnimationFrame(raf);renderer?.dispose();planes.forEach(p=>{p.material.map?.dispose();p.geometry.dispose();p.material.dispose()});}
function layout(){
 const aspect=innerWidth/innerHeight;
 planes.forEach((p,i)=>{const ratio=p.userData.ratio;if(mode==='depth'){p.position.set((i%2?1:-1)*.38,Math.sin(i*1.8)*.28,-i*3.2);p.scale.set(3.65*ratio,3.65,1);p.rotation.z=(i%2?-.035:.035);}else if(mode==='aristide'){p.position.set(0,0,-Math.abs(i-index)*.04);const h=Math.min(6.2,innerHeight/130);p.scale.set(h*ratio,h,1);p.visible=i===index;}else{p.position.set(i*3.35,Math.sin(i*.7)*.1,-Math.abs(i-index)*.025);const h=4.65;p.scale.set(h*ratio,h,1);}});
 if(mode==='depth'){camera.position.set(0,0,8);camera.fov=43;}else if(mode==='aristide'){camera.position.set(0,0,8.4);camera.fov=40;}else{camera.position.set(0,0,8);camera.fov=43;}camera.updateProjectionMatrix();
}
function updateUI(){const p=photos[index];if(!p)return;$('count').textContent=String(index+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0');$('index').textContent=String(index+1).padStart(2,'0');$('photo-title').textContent=p.title||'';$('photo-date').textContent=p.date||'';$('source').href=p.instagramPost||p.source||'#';}
function select(n){if(!photos.length)return;index=(n+photos.length)%photos.length;layout();updateUI();if(mode==='aristide'){document.body.classList.remove('revealed');}}
function tick(t){raf=requestAnimationFrame(tick);const dt=Math.min(.04,(t-last)/1000||.016);last=t;velocity+=(scrollTarget-scroll)*Math.min(1,dt*5);scroll+=velocity;velocity*=.9;
 if(mode==='depth'){camera.position.z=8+scroll*.045;camera.position.x+=(pointer.x*.32-camera.position.x)*.035;camera.position.y+=(pointer.y*.22-camera.position.y)*.035;scene.background.lerp(new THREE.Color(palette.depth[Math.abs(Math.floor(scroll/3))%3]),.018);}
 if(mode==='camille'){camera.position.x+=(scrollTarget*.022-camera.position.x)*.08;camera.position.y+=(pointer.y*.15-camera.position.y)*.04;}
 planes.forEach((p,i)=>{p.material.uniforms.time.value=t*.001;p.material.uniforms.velocity.value=Math.min(3,Math.abs(velocity)*.08);p.material.uniforms.pointer.value.set(pointer.x,pointer.y);p.material.uniforms.distortion.value=mode==='camille'?Math.min(1,Math.abs(velocity)*.025):mode==='depth'?.18:.04;if(mode==='depth'){p.position.z=-i*3.2+scroll*.08;p.position.x+=(Math.sin(t*.0003+i)*.08-p.position.x*.02)*.02;}if(mode==='camille')p.position.x=i*3.35-scroll*.055;});
 renderer.render(scene,camera);
}
function navigate(delta){select(index+delta);if(mode==='camille')scrollTarget+=delta*110;}
async function init(){const rows=await readPhotoLibrary();photos=rows.filter(p=>p.publish&&p.galleryFeatured&&p.uses?.includes('muse')&&p.rightsStatus==='existing-muse-only').map(p=>({...p,src:new URL('../assets/photos/'+p.src,new URL('../gallery/',location.href)).href}));if(!photos.length)throw Error('No reviewed photos in shared gallery collection.');
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);scene=new THREE.Scene();scene.background=new THREE.Color(palette[mode][0]);camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,100);const loader=new THREE.TextureLoader();
 const loaded=await Promise.all(photos.map(p=>new Promise((resolve,reject)=>loader.load(p.src,resolve,undefined,reject))));
 planes=loaded.map((tex,i)=>{tex.colorSpace=THREE.SRGBColorSpace;const p=photos[i],m=material(tex),mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,24,24),m);mesh.userData.ratio=p.width/p.height;scene.add(mesh);return mesh;});
 layout();updateUI();$('loading')?.remove();raf=requestAnimationFrame(tick);
}
$('prev').addEventListener('click',()=>navigate(-1));$('next').addEventListener('click',()=>navigate(1));
$('hold').addEventListener('pointerdown',()=>{hold=true;document.body.classList.add('revealed');});['pointerup','pointerleave','pointercancel'].forEach(e=>$('hold').addEventListener(e,()=>{hold=false;document.body.classList.remove('revealed');}));
canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=1-e.clientY/innerHeight*2;if(drag!==null&&mode==='camille'){scrollTarget+= (drag-e.clientX)*.012;drag=e.clientX;}});
canvas.addEventListener('pointerdown',e=>{drag=e.clientX;});window.addEventListener('pointerup',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();scrollTarget+=e.deltaY*.012;},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='ArrowRight')navigate(1);if(e.key==='ArrowLeft')navigate(-1);});
window.addEventListener('resize',()=>{if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;layout();});
init().catch(e=>{console.error(e);$('fallback').hidden=false;$('fallback').textContent='Gallery unavailable';$('fallback').className='error';});
