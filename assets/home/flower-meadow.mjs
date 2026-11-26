import {
  Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, BufferGeometry,
  Float32BufferAttribute, MeshStandardMaterial, InstancedMesh, Object3D, Color, DoubleSide
} from 'three';

const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=2*Math.PI;
function seeded(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
const species=[
  {n:7, length:.245, width:.076, curve:.11, height:.93, tint:'#b984a6', center:'#d7ae80'},
  {n:11,length:.219, width:.049, curve:.06, height:1.00,tint:'#d9c0c3', center:'#d6a172'},
  {n:6, length:.216, width:.098, curve:.12, height:.87, tint:'#c79bc9', center:'#f6c3a2'},
  {n:12,length:.171, width:.045, curve:.07, height:1.05,tint:'#717dc4', center:'#a6acde'},
  {n:5, length:.188, width:.107, curve:.16, height:.82, tint:'#e4a386', center:'#d8ab79'},
  {n:8, length:.114, width:.039, curve:.07, height:1.12,tint:'#b6aaba', center:'#ebcd9c'},
];
function plantGeometry(spec,variant=0){
  const verts=[], colors=[];
  const rand=seeded(167+variant*217);
  const stem=new Color('#304733'), leaf=new Color('#44624e');
  const blade=new Color(variant%2?'#667b60':'#7e7551'), tip=new Color('#afa182');
  const petal=spec?new Color(spec.tint):tip, gold=spec?new Color(spec.center):tip;
  const pinkLight=new Color('#eedccd'), shade=new Color('#796b9b');
  const add=(p,c)=>{verts.push(...p);colors.push(c.r,c.g,c.b);};
  function strip(row,n,m){
   for(let i=0;i<n;i++)for(let j=0;j<m;j++){
    const u=i/n,v=j/m,u1=(i+1)/n,v1=(j+1)/m;
    const q=[row(u,v),row(u1,v),row(u1,v1),row(u,v1)];
    for(const k of [0,1,2,0,2,3])add(...q[k]);
   }
  }
  const h=spec?.height??1.22, curl=.17;
  strip((u,v)=>{
    const a=v*TAU,r=(1-u*.65)*.017;
    return [[curl*u*u+r*Math.cos(a),h*u,r*Math.sin(a)],stem];
  },7,5);
  for(let k=0;k<(spec?3:8);k++){
    const dir=k*2.39;
    const base=.14+k*(spec?.17:.105);
    const extent=spec? .19+rand()*.18: .09+rand()*.19;
    strip((u,v)=>{
      const x=extent*u,lateral=(v-.5)*Math.pow(Math.sin(Math.PI*u),.85)*(spec?.105:.055);
      const yy=base+u*(spec?.18:.46)-u*u*(spec?.15:.14);
      const color=stem.clone().lerp(leaf,u*.92).lerp(blade,spec?0:u*.45);
      return [[curl*(base/h)**2+Math.cos(dir)*x-Math.sin(dir)*lateral,yy,Math.sin(dir)*x+Math.cos(dir)*lateral],color];
    },5,2);
  }
  if(spec){
    for(let j=0;j<spec.n;j++){
     const dir=j*TAU/spec.n+rand()*.18, length=spec.length*(.85+rand()*.25), tone=.12+rand()*.38;
     strip((u,v)=>{
       const r=.041+length*u;
       const w=Math.pow(Math.sin(Math.PI*u),.72)*spec.width*(v-.5)*2;
       let x=Math.cos(dir)*r-Math.sin(dir)*w, z=Math.sin(dir)*r+Math.cos(dir)*w;
       const y=spec.curve*u*u + Math.abs(v-.5)*.078*Math.sin(u*3.14) + z*.72;
       const col=petal.clone().lerp(shade,(1-u)*tone).lerp(pinkLight,u*.29+Math.pow(Math.abs(v-.5)*2,2)*.12);
       return [[curl+x,h+y,z*.84],col];
     },5,4);
    }
    for(let j=0;j<12;j++){
     const a=j*2.4,r=.018+rand()*.053,x=curl+Math.cos(a)*r,z=Math.sin(a)*r;
     const y=h+.035+z*.72+rand()*.019;
     add([x-.016,y,z+.011],gold);add([x+.017,y+.010,z+.012],gold);add([x,y+.024,z-.017],gold);
    }
  }else{
   for(let j=0;j<54;j++){
    const a=j*2.399,r=.012+rand()*.096,u=.76+rand()*.29, y=h*u;
    const x=curl*u*u+Math.cos(a)*r,z=Math.sin(a)*r;
    const dx=Math.cos(a)*.045,dz=Math.sin(a)*.042;
    const c=blade.clone().lerp(tip,rand()*.57);
    add([x-.013,y-.026,z],c);add([x+.012,y,z+.005],c);add([x+dx,y+.039,z+dz],tip);
   }
  }
  const g=new BufferGeometry();
  g.setAttribute('position',new Float32BufferAttribute(verts,3));
  g.setAttribute('color',new Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  return g;
}

export function makeMeadow(){
  const scene=new Scene(),camera=new PerspectiveCamera(42,1,.05,50);
  camera.position.set(0,0,10.4);
  scene.add(new HemisphereLight(0xe2d3fa,0x566747,1.25));
  const amber=new DirectionalLight(0xffdda8,1.40);amber.position.set(2,4,-3);scene.add(amber);
  const dusk=new DirectionalLight(0xcebee0,1.15);dusk.position.set(-2,1,4);scene.add(dusk);
  const wind={value:0}, step={value:0};
  const material=new MeshStandardMaterial({vertexColors:true,side:DoubleSide,roughness:.92,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.uniforms.meadowTime=wind;shader.uniforms.meadowStep=step;
    shader.vertexShader='uniform float meadowTime; uniform float meadowStep;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 anchor=instanceMatrix[3].xyz;
      float t=meadowTime;
      float wave=sin(t*.98-anchor.x*.63-anchor.z*.49) + .33*sin(t*2.11+anchor.z*.74+anchor.x*1.54);
      float root=pow(clamp(position.y/1.5,0.,1.),1.45);
      float walk=meadowStep*(.06+.052*sin(anchor.x*2.+anchor.z))*(1.+abs(anchor.x)*.32);
      transformed.x+=(wave*.19 + walk*sign(anchor.x))*root;
      transformed.z+=sin(t*.94+anchor.x*.72-anchor.z*.66)*.12*root;
      transformed.y-=abs(wave)*.027*root;
    `);
  };
  const rand=seeded(603827);
  const total=460, params=[];
  const layers=[...species,null,null];
  const counts=Array.from({length:layers.length},()=>0);
  for(let i=0;i<total;i++){
    const soft=i<247, z=soft? -8.0+rand()*8.0: .10+rand()*5.7;
    const field=rand(),x=field<.32?-.20+rand()*.50:field<.61?.70+rand()*.49:.12+rand()*.78;
    // Plant through the middle too. There is no corridor between the clumps.
    const sy=soft?.78+rand()*.25:.93+rand()*.17;
    const grass=(i%3===0||(!soft&&rand()<.36));
    const kind=grass?6+(i%2):Math.floor(rand()*species.length);
    const bright=.31+rand()*.39 + (1-Math.min(1,Math.abs(x-.58)*2.1))*.13;
    params.push({kind,n:counts[kind]++,z,x,sy,soft,bright,size:grass?.39+rand()*.48:.32+rand()*.43, yaw:(rand()-.5)*1.45, lean:(rand()-.5)*.47});
  }
  const meshes=layers.map((sp,k)=>{
    const m=new InstancedMesh(plantGeometry(sp,k),material,counts[k]);
    m.frustumCulled=false;scene.add(m);return m;
  });
  const temp=new Object3D(), color=new Color();
  function resize(w,h){
    camera.aspect=w/h;camera.updateProjectionMatrix();
    for(const p of params){
     const d=10.4-p.z, hh=d*Math.tan(Math.PI*camera.fov/360);
     const edg=Math.abs(p.x-.53);
     const layer=(p.soft?.78:1.04)*(w<680?.8:1);
     const size=p.size*layer*(p.soft?.98:1.14);
     temp.position.set((p.x*2-1)*hh*camera.aspect,(1-2*p.sy)*hh,p.z);
     temp.rotation.set(.02,p.yaw,p.lean);
     temp.scale.set(size*(.93+edg*.18),size,size);
     temp.updateMatrix();const m=meshes[p.kind];
     m.setMatrixAt(p.n,temp.matrix);m.setColorAt(p.n,color.setScalar(p.bright));
    }
    for(const m of meshes){m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;}
  }
  return {scene,camera,resize,frame(t,x,y,p){
    wind.value=t;step.value=p;
    camera.position.x=x*.14;camera.position.y=-y*.085;camera.position.z=10.4-p*.62;
  }};
}
