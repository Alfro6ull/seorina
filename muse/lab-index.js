const stage = document.querySelector('#lab-stage');
const canvas = document.querySelector('#lab-preview');
const ctx = canvas.getContext('2d');
const action = document.querySelector('#lab-action');
const switcher = document.querySelector('#lab-switch');
const tabs = [...document.querySelectorAll('[data-demo][href]')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const hover = matchMedia('(hover: hover)');
const demos = {
  particles: { tech:'PARTICLE FIELD', title:'记忆粒子试玩', action:'拨动粒子' },
  depth: { tech:'COLOR PARALLAX', title:'色场纵深试玩', action:'切换视角' }
};
let w=0,h=0,mode='particles',frame=0,selected=false,onScreen=true,burst=-10000,snapshot=0;
const point={ x:.5,y:.5,targetX:.5,targetY:.5 };
let seed=18371;
function random() { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/2**32; }
const letters=[...stage.querySelectorAll('h1 span')];
const dust=Array.from({length:1540},()=>{
  const theta=random()*Math.PI*2, phi=random()*Math.PI*2;
  return {theta,phi,phase:random()*Math.PI*2,tone:random(),size:.52+random()**1.7*1.7};
});
function text(id, value) { document.querySelector('#'+id).textContent=value; }
function select(link) {
  const changed = !selected || stage.dataset.demo !== link.dataset.demo;
  selected = true;
  if(changed) {
    burst=performance.now();
    if(!reduce.matches)letters.forEach((letter,i)=>{
      letter.getAnimations().forEach(animation=>animation.cancel());
      letter.animate([{translate:'0 .18em',opacity:.45},{translate:'0 0',opacity:1}],{
        duration:560,delay:46*i,easing:'cubic-bezier(.18,.85,.24,1)'
      });
    });
  }
  mode=link.dataset.demo;
  stage.dataset.demo=mode;
  tabs.forEach(l=>l.toggleAttribute('data-active',l===link));
  stage.setAttribute('aria-label',demos[mode].title);
  action.textContent=demos[mode].action;
  text('lab-number',link.dataset.number+' / 02');text('lab-tech',demos[mode].tech);
  point.targetX=point.targetY=.5;
  queue();
}
function resize() {
  const box=stage.getBoundingClientRect();
  w=box.width;h=box.height;
  const d=Math.min(devicePixelRatio || 1,1.6);
  canvas.width=Math.max(1,Math.round(w*d));canvas.height=Math.max(1,Math.round(h*d));
  ctx.setTransform(d,0,0,d,0,0);
  queue();
}
function position() {
  const mobile=w<640;
  return [w*(mobile?.56:.715),h*(mobile?.39:.505),Math.min(w*(mobile?.49:.24),h*(mobile?.50:.50))];
}
function project(x,y,z,rx,ry) {
  const x1=x*Math.cos(ry)+z*Math.sin(ry);
  const z1=-x*Math.sin(ry)+z*Math.cos(ry);
  const y1=y*Math.cos(rx)-z1*Math.sin(rx);
  const z2=y*Math.sin(rx)+z1*Math.cos(rx);
  const perspective=3.5/(3.5+z2*.38);
  return [x1*perspective,y1*perspective,z2];
}
function particles(t) {
  const [cx,cy,size]=position();
  const energy=reduce.matches ? snapshot*.21 : Math.max(0,1-(t-burst)/980)**2;
  const ry=-.25+(point.x-.5)*1.21+Math.sin(t*.00048)*.30;
  const rx=.62+(point.y-.5)*.75;
  for(const d of dust){
    const u=d.theta+t*.00022, v=d.phi+Math.sin(d.theta*2+t*.0011)*.5;
    const thickness=.24+.13*Math.cos(u*3)+energy*.16;
    const r=.70+thickness*Math.cos(v)+Math.sin(d.phase+t*.001)*.016;
    const x=r*Math.cos(u),y=r*Math.sin(u)*.79,z=thickness*Math.sin(v)+.21*Math.sin(2*u);
    const [a,b,c]=project(x,y,z,rx,ry);
    const blue=d.tone>.78?'#eef4ff':d.tone>.42?'#2848dc':d.tone>.15?'#13369d':'#5d86ff';
    ctx.fillStyle=blue;
    ctx.globalAlpha=(.40+.52*d.tone)*(c>0?.72:1);
    ctx.fillRect(cx+a*size,cy+b*size,d.size*(1+energy*.18),d.size*(1+energy*.18));
  }
  ctx.globalAlpha=1;
}
function depth(t) {
  const [cx,cy,size]=position();
  const tilt=(point.x-.5)*1.7,lift=(point.y-.5)*.68;
  const drift=reduce.matches?0:Math.sin(t*.0008)*.19;
  const palette=['#ee6365','#e67a62','#fbb878','#ffe0ab','#b277c4','#8763ce','#614bc4','#5137af','#f28e88'];
  for(let i=0;i<9;i++){
    const z=i*.17-.54, k=i/8;
    const turn=.45+tilt+drift+k*.18+(reduce.matches?snapshot*.10:0);
    const pts=[[-.68,-.5],[.78,-.5],[.78,.52],[-.68,.52]].map(([x,y])=>{
      const q=project(x,y,z,.56+lift,turn);
      return [cx+(q[0]+k*.2-.13)*size,cy+(q[1]-k*.19+.14)*size];
    });
    ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();
    const g=ctx.createLinearGradient(...pts[0],...pts[2]);
    g.addColorStop(0,palette[i]+'a1');g.addColorStop(1,palette[(i+3)%9]+'36');
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=palette[i];ctx.lineWidth=.9;ctx.stroke();
  }
}
function loop(t) {
  frame=0;
  if (!onScreen || document.hidden || !w || !h) return;
  const k=reduce.matches?1:.12;
  point.x+=(point.targetX-point.x)*k;point.y+=(point.targetY-point.y)*k;
  ctx.clearRect(0,0,w,h);
  (mode==='particles'?particles:depth)(reduce.matches ? 0 : t);
  letters.forEach((letter,i)=>{
    letter.style.transform=reduce.matches?'':`translateY(${Math.sin(i*.8+t*.0018)*2+(point.y-.5)*(i+1)*6}px) rotate(${(point.x-.5)*(i-1.5)*4}deg)`;
  });
  if(!reduce.matches)queue();
}
function queue(){if(ctx&&!frame&&onScreen&&!document.hidden)frame=requestAnimationFrame(loop);}
function interact() {
  if(mode==='particles'){burst=performance.now();snapshot=(snapshot+1)%3;}
  else {point.targetX=point.targetX>.58?.2:.8;snapshot=(snapshot+1)%3;}
  queue();
}
if(ctx){
  tabs.forEach(link=>{
    link.addEventListener('pointerenter',()=>{if(hover.matches)select(link);});
    link.addEventListener('focus',()=>select(link));
    link.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        e.preventDefault();tabs.find(a=>a!==link)?.focus();
      }
    });
  });
  canvas.addEventListener('pointermove',e=>{
    if(reduce.matches||e.pointerType==='touch')return;
    const r=canvas.getBoundingClientRect();
    point.targetX=(e.clientX-r.left)/r.width;point.targetY=(e.clientY-r.top)/r.height;
  });
  canvas.addEventListener('pointerleave',()=>{point.targetX=point.targetY=.5;});
  canvas.addEventListener('click',interact);
  action.addEventListener('click',interact);
  switcher.addEventListener('click',()=>select(tabs.find(link=>link.dataset.demo!==mode)));
  switcher.hidden=false;
  action.hidden=false;
  reduce.addEventListener('change',queue);
  document.addEventListener('visibilitychange',queue);
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry])=>{onScreen=entry.isIntersecting;queue();}).observe(stage);
  select(tabs[0]);resize();
}
