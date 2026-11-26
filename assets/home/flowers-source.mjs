import {Scene,PerspectiveCamera,WebGLRenderer,CanvasTexture,Sprite,SpriteMaterial,Color,SRGBColorSpace,Clock} from 'three';
const root=document.querySelector('.world');
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)try{
 const scene=new Scene();
 const renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.domElement.className='float-flowers';renderer.domElement.setAttribute('aria-hidden','true');root.prepend(renderer.domElement);
 const camera=new PerspectiveCamera(50,1,.1,65);camera.position.z=8;
 const clock=new Clock();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d');
 for(let i=0;i<5;i++){
  c.save();c.translate(64,64);c.rotate(i*Math.PI*2/5-.3);
  const g=c.createRadialGradient(1,-34,2,0,-20,36);
  g.addColorStop(0,'rgba(255,250,254,.99)');g.addColorStop(.7,'rgba(241,213,240,.90)');g.addColorStop(1,'rgba(143,122,190,.10)');
  c.fillStyle=g;c.beginPath();c.ellipse(0,-25,13,24,.11,0,Math.PI*2);c.fill();c.restore();
 }
 c.fillStyle='#fff1d3';c.beginPath();c.arc(64,64,8,0,Math.PI*2);c.fill();
 const bud=new CanvasTexture(canvas);bud.colorSpace=SRGBColorSpace;
 let seed=29527;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const buds=[];
 for(let i=0;i<33;i++){
  const side=i%2?1:-1,lift=rand(),p=rand(),phase=rand()*Math.PI*2,z=-6+rand()*11;
  const mat=new SpriteMaterial({map:bud,color:new Color(['#e2cbed','#e8c7bd','#acbef7','#fff1e8'][i%4]),opacity:0.19+rand()*.52,transparent:true,depthWrite:false,rotation:phase});
  const s=new Sprite(mat);
  const sz=.035+rand()*.095;s.scale.set(sz,sz,1);scene.add(s);
  buds.push({s,side,lift,p,phase,z,opacity:mat.opacity});
 }
 let dx=0,dy=0,x=0,y=0,enter=-1,gust=-1;
 root.addEventListener('pointermove',e=>{dx=(e.clientX/root.clientWidth-.5)*.32;dy=(e.clientY/root.clientHeight-.5)*.17});
 root.addEventListener('pointerleave',()=>{dx=dy=0});
 root.addEventListener('portal:enter',()=>{enter=performance.now();});
 root.addEventListener('portal:wind',()=>{gust=clock.getElapsedTime();});
 addEventListener('pageshow',()=>{enter=-1;});
 const resize=()=>{camera.aspect=root.clientWidth/root.clientHeight;camera.updateProjectionMatrix();renderer.setSize(root.clientWidth,root.clientHeight,false)};
 new ResizeObserver(resize).observe(root);resize();
 renderer.setAnimationLoop(()=>{
  if(document.hidden)return;
  const t=clock.getElapsedTime(),windTime=t-gust,trip=enter<0?0:Math.min(1,(performance.now()-enter)/1100);
  x+=(dx-x)*.04;y+=(dy-y)*.04;
  camera.position.set(x*(1-trip),y*(1-trip),8-11*trip*trip);
  const v=Math.tan(camera.fov*Math.PI/360);
  for(let i=0;i<buds.length;i++){
   const o=buds[i],w0=(8-o.z)*v,w1=w0*camera.aspect,small=camera.aspect<.85;
   const px=(small?.48:.28)+o.p*(small?.80:.70);
   const wind=gust<0||windTime<o.lift*.23?0:Math.sin((windTime-o.lift*.23)*6)*Math.exp(-windTime*2.4);
   o.s.position.set(o.side*(w1*px)+Math.cos(t*.43+o.phase)*.10+wind*.40,-w0*(.10+o.lift*.85)+Math.sin(t*.61+o.phase)*.15+wind*.14,o.z);
   o.s.material.rotation=o.phase+t*.08+wind*.55;
   o.s.material.opacity=o.opacity*(1-Math.max(0,trip-.60)*2);
  }
  renderer.render(scene,camera);
 });
 root.dataset.flowers='webgl';
}catch{root.dataset.flowers='static';}
