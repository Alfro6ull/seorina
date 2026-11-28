import {readPhotoLibrary,photosFor,photoLibraryURL} from '../assets/photos/library.js?v=instagram-archive';
const $=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=n=>String(n).padStart(2,'0'),src=row=>new URL(row.src,photoLibraryURL).href;
function shuffled(input){
 const a=[...input], rand=crypto.getRandomValues(new Uint32Array(Math.max(1,input.length)));
 for(let i=a.length-1;i>0;i--){const j=Math.floor(rand[i]/2**32*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
let rows=[];
function metric(i){$('count').textContent=`${pad(i+1)} / ${pad(rows.length)}`}
function img(row,lazy=true){const el=new Image();if(lazy)el.loading='lazy';el.decoding='async';el.alt=row.title;el.src=src(row);return el;}
function arrows(prev,next){
 $('prev').onclick=prev;$('next').onclick=next;
 window.addEventListener('keydown',e=>{
  if(e.altKey||e.metaKey||e.ctrlKey||e.target instanceof HTMLButtonElement&&e.key===' ')return;
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();prev()}
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();next()}
 });
}
function depth(){
 const root=$('world'),room=$('room'),holder=$('planes'),plates=new Map(),palettes=new Map();
 let pos=0,target=0,selected=-1,x=0,y=0,px=0,py=0,touch=null,raf=0;
 const paletteCanvas=document.createElement('canvas');paletteCanvas.width=12;paletteCanvas.height=12;
 const ctx=paletteCanvas.getContext('2d',{willReadFrequently:true});
 const rgb=(a,f=1)=>'rgb('+a.map(x=>Math.round(clamp(x*f,0,255))).join(',')+')';
 const hex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
 function palette(i,image){
  const d=[];
  ctx.drawImage(image,0,0,12,12);
  const p=ctx.getImageData(0,0,12,12).data;
  for(let k=0;k<p.length;k+=4)d.push([p[k],p[k+1],p[k+2]]);
  d.sort((a,b)=>a.reduce((x,y)=>x+y)-b.reduce((x,y)=>x+y));
  const mean=(a,b)=>[0,1,2].map(c=>d.slice(a,b).reduce((s,p)=>s+p[c],0)/(b-a));
  const lift=(a,f,offset)=>{const m=(a[0]+a[1]+a[2])/3;return a.map((v,j)=>clamp(m+(v-m)*f+offset[j],0,255))};
  const dark=mean(9,45),mid=mean(60,105),light=mean(109,143);
  const saturation=mid=>Math.max(...mid)-Math.min(...mid);
  const neutral=saturation(mid)<22;
  palettes.set(i,[
   lift(dark,1.4,neutral?[35,32,58]:[28,25,27]),
   lift(mid,1.82,neutral?[37,18,35]:[24,19,18]),
   lift(light,1.46,neutral?[17,15,37]:[5,4,4])
  ]);
 }
 function apply(i){
  const q=palettes.get(i);if(!q)return;
  root.style.setProperty('--base',rgb(q[0],1.15));root.style.setProperty('--accent',rgb(q[1],1.23));root.style.setProperty('--light',rgb(q[2],.98));
  const box=$('chips');box.replaceChildren(...q.map(v=>{const el=document.createElement('i');el.style.background=rgb(v);return el}));$('hex').textContent=hex(q[1]);
 }
 function show(i){
  if(i===selected)return;
  selected=i;metric(i);const a=rows[i];$('title').textContent=a.title.replace(/ · \d{4}-\d{2}-\d{2}$/, '');$('date').textContent=a.date||'';$('source').href=a.source;apply(i);
  for(const [k,p] of plates)if(Math.abs(i-k)>3){p.remove();plates.delete(k);}
  for(const k of [i,i+1,i-1,i+2,i-2])if(k>=0&&k<rows.length&&!plates.has(k)){
   const div=document.createElement('div');div.className='depth-plate';div.style.opacity='0';const el=img(rows[k],false);div.append(el);holder.append(div);plates.set(k,div);
   if(!palettes.has(k))el.decode().then(()=>{palette(k,el);if(k===selected)apply(k)}).catch(()=>{});
  }
  $('prev').disabled=i===0;$('next').disabled=i===rows.length-1;
 }
 function tick(){
  raf=requestAnimationFrame(tick);
  const residue=target-pos;pos+=residue*(reduce.matches?1:.132);px+=(x-px)*.11;py+=(y-py)*.11;
  if(!reduce.matches){room.style.setProperty('--dx',px*18+'px');room.style.setProperty('--dy',py*11+'px');}
  show(clamp(Math.round(pos),0,rows.length-1));
  for(const [i,p] of plates){
   const d=i-pos,side=i%2?1:-1;
   const opacity=d<0?clamp(1+d*1.08,0,1):Math.exp(-d*.91), z=-d*325;
   p.style.opacity=String(opacity);p.style.zIndex=String(6-Math.round(d*2));p.style.transform=`translate3d(${side*(innerWidth<600?21:68)+px*19}px,${py*14}px,${clamp(z,-1100,300)}px) rotateY(${reduce.matches?0:(side*2.7+px*1.6+residue*3)}deg)`;
  }
 }
 function shift(n){target=clamp(target+n,0,rows.length-1)}
 arrows(()=>shift(-1),()=>shift(1));room.addEventListener('wheel',e=>{e.preventDefault();shift(clamp(e.deltaY*(e.deltaMode===1?.053:.0028),-1.2,1.2));},{passive:false});
 room.addEventListener('pointermove',e=>{x=2*e.clientX/innerWidth-1;y=2*e.clientY/innerHeight-1;if(touch!==null){shift((touch-e.clientY)*.006);touch=e.clientY;}});
 room.style.touchAction='none';room.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&!e.target.closest('a')){room.setPointerCapture(e.pointerId);touch=e.clientY;}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])room.addEventListener(event,()=>touch=null);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0});
 window.addEventListener('pageshow',()=>{if(!raf)tick()});
 show(0);tick();
}
try{rows=shuffled(photosFor(await readPhotoLibrary(),'muse'));if(!rows.length)throw Error('empty library');depth();}
catch(error){$('count').textContent='照片暂时无法读取';console.error(error);}
