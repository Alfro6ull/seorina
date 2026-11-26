import * as THREE from '../vendor/three.module.js';

const vertex = `
attribute vec3 aColor;
attribute vec3 aScatter;
attribute float aDepth;
attribute float aSeed;
uniform float uTime, uScatter, uPointScale, uMotion;
uniform vec2 uPointer;
uniform float uPointerActive;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 home = position;
  float breath = sin(uTime*.5+aSeed*6.283)*.012*uMotion;
  home.z += breath;
  vec3 spread = aScatter;
  float angle = uTime*.06*uMotion;
  spread.xz = mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*spread.xz;
  vec3 p = mix(home,spread,uScatter);
  p += vec3(sin(aSeed*41.+uTime),cos(aSeed*29.+uTime*.6),sin(aSeed*53.-uTime*.4))*.13*uScatter*uMotion;
  vec2 delta = p.xy-uPointer;
  float influence = exp(-dot(delta,delta)*3.2)*uPointerActive;
  p.xy += normalize(delta+vec2(.0001))*.23*influence;
  p.z += influence*.36;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = clamp(uPointScale*(.82+aSeed*.38)*(7.0/-mv.z),.8,7.);
  float luminance = dot(aColor,vec3(.2126,.7152,.0722));
  vec3 ice = mix(vec3(.018,.12,.22),vec3(.4,.95,1.),sqrt(luminance));
  vColor = mix(aColor,ice,.88);
  vColor *= .8 + smoothstep(.1,.55,aDepth)*.92;
  vAlpha = mix(.005,.98,smoothstep(.3,.65,aDepth));
  vAlpha *= 1.-uScatter*.20;
}`;
const fragment = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float radius=length(gl_PointCoord-.5);
  if(radius>.5)discard;
  float edge=1.-smoothstep(.28,.5,radius);
  gl_FragColor=vec4(vColor,vAlpha*edge);
  #include <colorspace_fragment>
}`;

/** Photographic samples displaced by relative depth; no invented back-of-head geometry. */
export class ParticlesScene {
  constructor({reducedMotion=false}) {
    this.reducedMotion=reducedMotion;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color('#03080c');
    this.camera=new THREE.PerspectiveCamera(42,1,.1,80);
    this.camera.position.set(0,.15,10.4);
    this.camera.lookAt(0,.1,0);
    this.group=new THREE.Group();
    this.group.position.set(.45,.35,0);
    this.scene.add(this.group);
    this.yaw=this.yawTarget=-.15;
    this.pitch=this.pitchTarget=.015;
    this.scatter=this.scatterTarget=0;
    this.depthStrength=3.15;
    this.zoom=this.zoomTarget=10.4;
    this.uniforms={uTime:{value:0},uScatter:{value:0},uPointScale:{value:2.2},uMotion:{value:reducedMotion?0:1},uPointer:{value:new THREE.Vector2()},uPointerActive:{value:0}};
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    this.makeDust();
  }
  makeDust(){
    const positions=[],colors=[];
    let seed=173;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1000;i++){
      positions.push((rand()-.5)*22,(rand()-.5)*13,(rand()-.5)*18);
      const light=.15+rand()*.45;colors.push(.08*light,.62*light,.8*light);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const material=new THREE.PointsMaterial({size:.014,vertexColors:true,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending});
    this.dust=new THREE.Points(geometry,material);this.scene.add(this.dust);
  }
  setCollection(items,index=0){this.items=items;this.setIndex(index);}
  setIndex(index){
    if(!this.items?.length)return;
    this.index=((index%this.items.length)+this.items.length)%this.items.length;
    const photo=this.items[this.index];
    this.hasDepth=!!photo.depthImage;
    const aspect=photo.width/photo.height;
    const cols=this.mobile?180:260,rows=Math.max(90,Math.min(340,Math.round(cols/aspect)));
    const colorCanvas=document.createElement('canvas');colorCanvas.width=cols;colorCanvas.height=rows;
    const ctx=colorCanvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(photo.image,0,0,cols,rows);
    const rgba=ctx.getImageData(0,0,cols,rows).data;
    let depths;
    if(photo.depthImage){ctx.drawImage(photo.depthImage,0,0,cols,rows);depths=ctx.getImageData(0,0,cols,rows).data;}
    const positions=[],colors=[],scattered=[],depthValues=[],seeds=[];
    const height=5.25,width=height*aspect;
    this.photoWidth=width;this.photoHeight=height;
    const linear=new THREE.Color();
    let random=909;const rand=()=>{random=(random*1664525+1013904223)>>>0;return random/4294967296;};
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const offset=(y*cols+x)*4;
      if(rgba[offset+3]<64)continue;
      const u=x/(cols-1),v=y/(rows-1);
      // With no depth map, use a clearly artistic curved sheet, never luma-as-facial-depth.
      const depth=depths?depths[offset]/255:.48+.2*Math.cos((u-.5)*Math.PI)*Math.cos((v-.5)*Math.PI);
      const z=(depth-.5)*this.depthStrength;
      const correction=1-z/10.4;
      positions.push((u-.5)*width*correction,(.5-v)*height*correction,z);
      linear.setRGB(rgba[offset]/255,rgba[offset+1]/255,rgba[offset+2]/255,THREE.SRGBColorSpace);
      colors.push(linear.r,linear.g,linear.b);
      const a=rand()*Math.PI*2,r=1.8+Math.pow(rand(),.6)*5.8;
      scattered.push(Math.cos(a)*r,(rand()-.5)*7,Math.sin(a)*r-1.2);
      depthValues.push(depth);seeds.push(rand());
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('aColor',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('aScatter',new THREE.Float32BufferAttribute(scattered,3));
    geometry.setAttribute('aDepth',new THREE.Float32BufferAttribute(depthValues,1));
    geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
    geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),12);
    if(this.points){this.group.remove(this.points);this.points.geometry.dispose();}
    this.points=new THREE.Points(geometry,this.material);this.group.add(this.points);
    this.scatter=this.reducedMotion?0:1;this.scatterTarget=0;
    this.yawTarget=-.15;this.pitchTarget=.015;
  }
  resize(w,h){
    const wasMobile=this.mobile;this.mobile=w<700;this.width=w;this.height=h;
    this.camera.aspect=w/h;this.camera.fov=this.mobile?49:42;this.camera.updateProjectionMatrix();
    this.zoomTarget=this.mobile?13.8:10.4;
    this.uniforms.uPointScale.value=(this.mobile?2.8:3.0)*Math.min(devicePixelRatio||1,this.mobile?1.35:1.75);
    this.group.position.x=this.mobile?0:.45;
    this.group.position.y=this.mobile?.65:.8;
    if(wasMobile!==undefined&&wasMobile!==this.mobile&&this.items?.length)this.setIndex(this.index);
  }
  update(dt,time,input){
    const lerp=1-Math.exp(-dt*5);
    this.yaw+=(this.yawTarget-this.yaw)*lerp;this.pitch+=(this.pitchTarget-this.pitch)*lerp;this.scatter+=(this.scatterTarget-this.scatter)*lerp;
    this.zoom+=(this.zoomTarget-this.zoom)*lerp;
    this.group.rotation.y=this.yaw+(this.reducedMotion?0:Math.sin(time*.24)*.08);
    this.group.rotation.x=this.pitch;
    this.uniforms.uTime.value=time;
    this.uniforms.uScatter.value=this.scatter;
    this.uniforms.uMotion.value=this.reducedMotion?0:1;
    this.uniforms.uPointer.value.set(input.x*(this.photoWidth||4)*.6,input.y*3.4);
    this.uniforms.uPointerActive.value+=((input.active&&!input.down?1:0)-this.uniforms.uPointerActive.value)*lerp;
    this.camera.position.z=this.zoom;
    if(!this.reducedMotion){this.dust.rotation.y=time*.012;this.dust.rotation.z=Math.sin(time*.1)*.015;}
  }
  drag(dx,dy){this.yawTarget=THREE.MathUtils.clamp(this.yawTarget+dx*4.2,-1.28,1.28);this.pitchTarget=THREE.MathUtils.clamp(this.pitchTarget+dy*2,-.5,.5);}
  wheel(delta){this.zoomTarget=THREE.MathUtils.clamp(this.zoomTarget+delta*.012,this.mobile?9.2:6.4,this.mobile?18:16);}
  action(){this.scatterTarget=this.scatterTarget>.5?0:1;return this.scatterTarget?'重新聚合':'散开';}
  dispose(){this.points?.geometry.dispose();this.material.dispose();this.dust.geometry.dispose();this.dust.material.dispose();}
}
