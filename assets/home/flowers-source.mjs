import {Scene,OrthographicCamera,WebGLRenderer,PlaneGeometry,ShaderMaterial,Mesh,LinearFilter,Vector2,Texture} from 'three';
import {makeCutouts} from './flora-cutouts.mjs';

const host=document.querySelector('.world');
const frame=host.querySelector('.frame');
const image=host.querySelector('.plate');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const comp=new Scene(), cam=new OrthographicCamera(-1,1,1,-1,0,2);
const vert='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const frag=`
varying vec2 vUv;
uniform vec2 uSize,uImage;
uniform sampler2D uPlate;
uniform float uTime;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 p=vec2(vUv.x,1.-vUv.y);
 float crop=uSize.x<=680.? .68:.5;
 float scale=max(uSize.x/uImage.x,uSize.y/uImage.y);
 vec2 fit=uSize/(uImage*scale);
 vec2 original=p*fit+(1.-fit)*vec2(crop,.54);
 vec2 at=(original-vec2(.624,.37))*vec2(5.0,2.9);
 float r=length(at);
 float glow=.54+.23*sin(uTime*.43-r*1.28)+.11*sin(uTime*.72-r*.67);
 float air=noise(original*vec2(20.,12.)-vec2(0.,uTime*.07));
 float rim=exp(-pow((r-.83)/.44,2.)) * (.65+glow*.55) * (.8+.4*air);
 vec3 bg=texture2D(uPlate,vec2(original.x,1.-original.y)).rgb;
 bg=1.-(1.-bg)*(1.-vec3(1.,.77,.46)*rim*.059);
 vec3 color=bg;
 gl_FragColor=vec4(color,1.);
}
`;
function start(){
if(reduced.matches)return;
let renderer;
try{
 renderer=new WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
 renderer.debug.onShaderError=()=>{throw Error('shader unavailable');};
 renderer.autoClear=false;renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));
 const cut=makeCutouts(image,frame);
 const tex=new Texture(cut.backing);tex.generateMipmaps=false;tex.minFilter=LinearFilter;tex.magFilter=LinearFilter;tex.needsUpdate=true;
 const uni={uPlate:{value:tex},uImage:{value:new Vector2(image.naturalWidth,image.naturalHeight)},uSize:{value:new Vector2()},uTime:{value:0}};
 const mat=new ShaderMaterial({vertexShader:vert,fragmentShader:frag,uniforms:uni,depthTest:false,depthWrite:false});
 comp.add(new Mesh(new PlaneGeometry(2,2),mat));
 const canvas=renderer.domElement;canvas.className='living-plate';canvas.setAttribute('aria-hidden','true');frame.append(canvas);
 function size(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);uni.uSize.value.set(w,h);cut.resize(w,h);}
 new ResizeObserver(size).observe(host);size();
 const cursor=new Vector2(), targetCursor=new Vector2();
 let force=0,targetForce=0,last=-1,started=performance.now();
 host.addEventListener('pointermove',e=>{targetCursor.set(e.clientX/host.clientWidth-.5,e.clientY/host.clientHeight-.5);targetForce=1;},{passive:true});
 host.addEventListener('pointerdown',e=>{targetCursor.set(e.clientX/host.clientWidth-.5,e.clientY/host.clientHeight-.5);targetForce=1;},{passive:true});
 host.addEventListener('pointerleave',()=>{targetForce=0;targetCursor.set(0,0);});
 host.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')targetForce=0;});
 function paint(ms){
  const t=reduced.matches?0:(ms-started)*.001;
  if(reduced.matches){cursor.set(0,0);force=0;}else{cursor.lerp(targetCursor,.09);force+=(targetForce-force)*.12;}
  uni.uTime.value=t;
  renderer.setRenderTarget(null);renderer.clear();renderer.render(comp,cam);
  cut.paint(t,cursor.x,cursor.y,force);
 }
 paint(started);
 host.dataset.motion='living';host.dataset.cutouts='13';
 renderer.setAnimationLoop(ms=>{if(!document.hidden&&(ms-last>31)){last=ms;paint(ms);}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();delete host.dataset.motion;});
 canvas.addEventListener('webglcontextrestored',()=>{if(!reduced.matches)host.dataset.motion='living';});
 reduced.addEventListener('change',()=>{
    if(reduced.matches)delete host.dataset.motion;
    else host.dataset.motion='living';
 });
}catch{
 if(renderer){renderer.domElement.remove();renderer.dispose();}
 delete host.dataset.motion;
}}
if(image.complete&&image.naturalWidth)start();else image.addEventListener('load',start,{once:true});
