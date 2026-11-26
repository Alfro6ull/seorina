import {
  Scene, OrthographicCamera, WebGLRenderer, PlaneGeometry,
  ShaderMaterial, Mesh, Texture, LinearFilter, Vector2, WebGLRenderTarget
} from 'three';
import {makeMeadow} from './flower-meadow.mjs';

const host=document.querySelector('.world');
const frame=host.querySelector('.frame');
const image=host.querySelector('.plate');
const gate=host.querySelector('.cave-target');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

const vertexShader=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}
`;
const fragmentShader=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uPlate,uPlants;
uniform vec2 uPlantPixel;
uniform vec2 uWindow,uImage,uCursor;
uniform float uTime,uHover,uStep,uQuiet;
vec2 drift(vec2 uv, vec2 center, vec2 ellipse, float rhythm, float power) {
  vec2 p=(uv-center)/ellipse;
  float zone=1.-smoothstep(.20,1.,length(p));
  float pivot=1.-smoothstep(-.46,.98,p.y);
  float breeze=sin(uTime*.98+p.y*1.8+rhythm)+.36*sin(uTime*1.92-p.x*2.+rhythm*2.);
  return zone*pivot*power*vec2(breeze,-.29*breeze+.15*sin(uTime*.7+rhythm));
}
float cloud(vec2 q,vec2 c,vec2 radius) {
  vec2 p=(q-c)/radius;
  return exp(-dot(p,p)*2.15);
}
void main(){
  vec2 coord=vec2(vUv.x,1.-vUv.y);
  float scale=max(uWindow.x/uImage.x,uWindow.y/uImage.y);
  vec2 fit=uWindow/(uImage*scale);
  float crop=uWindow.x<=680.? .68:.50;
  vec2 orig=coord*fit+(1.-fit)*vec2(crop,.54);
  float foreground=smoothstep(.29,.96,orig.y);
  vec2 q=orig+uCursor*vec2(.010,.006)*foreground;
  vec2 wind=vec2(0);
  wind+=drift(q,vec2(.12,.85),vec2(.155,.185),.0,.023);
  wind+=drift(q,vec2(.294,.827),vec2(.134,.176),1.6,.017);
  wind+=drift(q,vec2(.32,.63),vec2(.175,.165),3.4,.013);
  wind+=drift(q,vec2(.38,.33),vec2(.13,.138),.7,.011);
  wind+=drift(q,vec2(.58,.096),vec2(.17,.166),2.6,.012);
  wind+=drift(q,vec2(.786,.298),vec2(.159,.21),1.4,.012);
  wind+=drift(q,vec2(.825,.643),vec2(.161,.23),4.6,.016);
  wind+=drift(q,vec2(.944,.882),vec2(.177,.163),2.1,.020);
  wind+=drift(q,vec2(.54,.696),vec2(.225,.223),3.3,.019);
  wind+=drift(q,vec2(.70,.824),vec2(.136,.19),5.8,.015);
  float crown=smoothstep(.49,.84,length((orig-vec2(.624,.363))*vec2(4.1,2.12)));
  q+=wind*crown*(1.-uQuiet);
  q=clamp(q,vec2(.0028),vec2(.9972));
  vec3 col=texture2D(uPlate,vec2(q.x,1.-q.y)).rgb;

  // Two slow waves from the warm threshold; the core never flashes.
  vec2 near=vec2(.624,.38);
  vec2 delta=(orig-near)*vec2(5.2,2.8);
  float r=length(delta);
  float breath=.50+.29*sin(uTime*.47-r*1.5)+.16*sin(uTime*.78-r*.86+1.9);
  float lobe=cloud(orig,near+vec2(.018*sin(uTime*.24),.035*sin(uTime*.29)),vec2(.205,.41));
  float rim=exp(-pow((r-.87)/.47,2.));
  float trail=cloud(orig,vec2(.604,.77),vec2(.37,.25));
  float airGrain=1.0+.11*sin(orig.y*39.+orig.x*24.+uTime*.36)+.05*sin(orig.x*83.-uTime*.45);
  float glow=(rim*.055+lobe*.014+trail*.078)*(.41+breath*1.21+uHover*.58+uStep*.64)*airGrain;
  // Keep faint gradients in the almost-white threshold instead of clipping it.
  col=1.-(1.-col)*(1.-vec3(1.,.67,.43)*glow);
  col-=lobe*(1.-breath)*.010*vec3(.42,.8,1.);
  col+=trail*breath*.015*vec3(1.,.63,.29);
  // The near meadow is closer than the camera focus. Blur its color and coverage together.
  vec2 b=uPlantPixel*mix(1.35,4.2,smoothstep(.63,1.,coord.y));
  vec4 plants=texture2D(uPlants,vUv)*.23;
  plants+=(texture2D(uPlants,vUv+b*vec2(1.,0.))+texture2D(uPlants,vUv-b*vec2(1.,0.))+texture2D(uPlants,vUv+b*vec2(0.,1.))+texture2D(uPlants,vUv-b*vec2(0.,1.)))*.1125;
  plants+=(texture2D(uPlants,vUv+b)+texture2D(uPlants,vUv-b)+texture2D(uPlants,vUv+b*vec2(1.,-1.))+texture2D(uPlants,vUv+b*vec2(-1.,1.)))*.08;
  vec3 plant=pow(max(plants.rgb/max(plants.a,.001),vec3(0.)),vec3(.4545));
  float coverage=plants.a*mix(.51,.85,smoothstep(.60,.99,coord.y));
  col=mix(col,plant,coverage);
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}
`;

let renderer;
function start(){
  if(reduced.matches||!image.naturalWidth)return;
  try{
    const scene=new Scene(),camera=new OrthographicCamera(-1,1,1,-1,0,2);
    const tex=new Texture(image);
    tex.minFilter=LinearFilter;tex.magFilter=LinearFilter;tex.generateMipmaps=false;tex.needsUpdate=true;
    renderer=new WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));
    renderer.debug.onShaderError=()=>{throw new Error('Cave shader unavailable');};
    renderer.autoClear=false;
    const meadow=makeMeadow();
    const target=new WebGLRenderTarget(1,1,{minFilter:LinearFilter,magFilter:LinearFilter,depthBuffer:true});
    renderer.setClearColor(0,0);
    const canvas=renderer.domElement;canvas.className='living-plate';canvas.setAttribute('aria-hidden','true');
    frame.append(canvas);
    const uniforms={
      uPlate:{value:tex},uPlants:{value:target.texture},uPlantPixel:{value:new Vector2()},uWindow:{value:new Vector2()},uImage:{value:new Vector2(image.naturalWidth,image.naturalHeight)},
      uCursor:{value:new Vector2()},uTime:{value:0},uHover:{value:0},uStep:{value:0},uQuiet:{value:0}
    };
    scene.add(new Mesh(new PlaneGeometry(2,2),new ShaderMaterial({uniforms,vertexShader,fragmentShader,depthTest:false,depthWrite:false})));
    const resize=()=>{
      const w=host.clientWidth,h=host.clientHeight;
      uniforms.uWindow.value.set(w,h);renderer.setSize(w,h,false);meadow.resize(w,h);
      target.setSize(Math.max(1,Math.round(w*.72)),Math.max(1,Math.round(h*.72)));
      uniforms.uPlantPixel.value.set(1/target.width,1/target.height);
    };
    new ResizeObserver(resize).observe(host);resize();
    const goal=new Vector2(),origin=performance.now();
    let hover=0,step=-1,last=-1;
    host.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')goal.set(e.clientX/host.clientWidth-.5,e.clientY/host.clientHeight-.5);},{passive:true});
    host.addEventListener('pointerleave',()=>goal.set(0,0));
    gate.addEventListener('pointerenter',()=>hover=.8);
    gate.addEventListener('pointerleave',()=>hover=0);
    gate.addEventListener('focus',()=>hover=.65);
    gate.addEventListener('blur',()=>hover=0);
    host.addEventListener('portal:enter',()=>step=performance.now());
    addEventListener('pageshow',()=>{step=-1;});
    function render(){
      meadow.frame(uniforms.uTime.value,uniforms.uCursor.value.x,uniforms.uCursor.value.y,uniforms.uStep.value);
      renderer.setRenderTarget(target);renderer.clear();renderer.render(meadow.scene,meadow.camera);
      renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera);
    }
    render();
    host.dataset.motion='living';host.dataset.flowers='webgl';
    renderer.setAnimationLoop(ms=>{
      if(document.hidden||ms-last<29)return;last=ms;
      uniforms.uTime.value=(ms-origin)*.001;
      uniforms.uCursor.value.lerp(goal,.07);
      uniforms.uHover.value+=(hover-uniforms.uHover.value)*.04;
      uniforms.uStep.value=step<0?0:Math.min(1,(ms-step)/950);
      uniforms.uQuiet.value=reduced.matches?1:0;
      if(!reduced.matches)render();
    });
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();delete host.dataset.motion;});
    canvas.addEventListener('webglcontextrestored',()=>{host.dataset.motion='living';});
    reduced.addEventListener('change',()=>{
      if(reduced.matches)delete host.dataset.motion;
      else host.dataset.motion='living';
    });
  }catch{
    if(renderer)renderer.domElement.remove();
    delete host.dataset.motion;
  }
}
if(image.complete)start();else image.addEventListener('load',start,{once:true});
