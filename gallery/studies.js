import {readPhotoLibrary,photosFor,photoLibraryURL} from '../assets/photos/library.js?v=instagram-archive';
const $=id=>document.getElementById(id),mode=document.body.dataset.study;
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=n=>String(n).padStart(2,'0'),src=row=>new URL(row.src,photoLibraryURL).href;
function shuffled(input){
 const a=[...input], rand=crypto.getRandomValues(new Uint32Array(Math.max(1,input.length)));
 for(let i=a.length-1;i>0;i--){const j=Math.floor(rand[i]/2**32*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
let rows=[];
function metric(i){$('count').textContent=`${pad(i+1)} / ${pad(rows.length)}`}
function img(row,lazy=true){const el=new Image();if(lazy)el.loading='lazy';el.decoding='async';el.alt=row.title;el.src=src(row);return el;}
function photoDetail(row){
 const d=$('detail'),photo=$('detail-image');photo.src=src(row);photo.alt=row.title;$('detail-label').textContent=row.title;$('detail-source').href=row.source;
 if(!d.open)d.showModal();
}
if($('detail')){
 $('close').onclick=()=>$('detail').close();
 $('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});
 $('detail').addEventListener('close',()=>$('detail-image').removeAttribute('src'));
}
function arrows(prev,next){
 $('prev').onclick=prev;$('next').onclick=next;
 window.addEventListener('keydown',e=>{
  if($('detail')?.open||e.altKey||e.metaKey||e.ctrlKey||e.target instanceof HTMLButtonElement&&e.key===' ')return;
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
function slices(){
 const rail=$('strip'),stage=rail.parentElement,ticks=$('ticks');
 let cur=0,target=0,down=null,suppress=0,raf=0;
 const steps=28;ticks.replaceChildren(...Array.from({length:steps},()=>document.createElement('i')));
 const cards=rows.map((row,i)=>{
  const b=document.createElement('button');b.type='button';b.className='film-window';b.setAttribute('aria-label','查看 '+row.title);
  const n=document.createElement('small');n.textContent=pad(i+1);b.append(n);
  b.addEventListener('focus',()=>{if(b.matches(':focus-visible'))set(i)});
  b.addEventListener('click',()=>{if(performance.now()>suppress)photoDetail(row)});
  return b;
 });
 rail.replaceChildren(...cards);
 function windowAt(pos){
  const k=Math.round(pos);
  for(let i=Math.max(0,k-10);i<Math.min(k+17,cards.length);i++)if(!cards[i].querySelector('img'))cards[i].prepend(img(rows[i],false));
  for(const i of loaded)if(Math.abs(i-k)>20){cards[i].querySelector('img')?.remove();loaded.delete(i)}
  for(let i=Math.max(0,k-10);i<Math.min(k+17,cards.length);i++)loaded.add(i);
 }
 const loaded=new Set();let shown=-1,cell=0;
 function measure(){cell=cards[1]?.offsetLeft-cards[0].offsetLeft||70;}
 function set(n){target=clamp(n,0,rows.length-1);if(!raf)tick();}
 function tick(){
  cur+=(target-cur)*(reduce.matches?1:.14);
  if(Math.abs(target-cur)<.004)cur=target;
  rail.style.transform=`translate3d(${-cur*cell}px,0,0)`;
  const i=Math.round(cur);if(i!==shown){shown=i;windowAt(cur);metric(i);[...ticks.children].forEach((node,j)=>node.classList.toggle('active',j===Math.round(i/(rows.length-1||1)*(steps-1))));}
  raf=Math.abs(cur-target)>.004?requestAnimationFrame(tick):0;
 }
 arrows(()=>set(target-1),()=>set(target+1));
 stage.addEventListener('wheel',e=>{e.preventDefault();set(target+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)/91)},{passive:false});
 stage.addEventListener('pointerdown',e=>{down={x:e.clientX,start:target,id:e.pointerId,moved:false};});
 stage.addEventListener('pointermove',e=>{if(down?.id!==e.pointerId)return;const d=down.x-e.clientX;if(Math.abs(d)>6){if(!down.moved){stage.setPointerCapture(e.pointerId);down.moved=true;}suppress=performance.now()+260;set(down.start+d/cell);}});
 for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'])stage.addEventListener(event,()=>down=null);
 window.addEventListener('resize',()=>{measure();if(!raf)tick()});
 measure();tick();
}
function wall(){
 const view=$('wall-scroll'),root=$('wall');let goal=0,frame=0,drag=null,suppress=0;
 const columns=[],mounted=new Set();
 for(let i=0;i<rows.length;i+=3){
  const group=document.createElement('div');group.className='wall-column';
  for(const row of rows.slice(i,i+3)){
   const b=document.createElement('button');b.type='button';b.className='wall-tile';b.setAttribute('aria-label','查看 '+row.title);b.onclick=()=>{if(performance.now()>suppress)photoDetail(row)};group.append(b);
  }
  root.append(group);columns.push(group);
 }
 const max=()=>Math.max(0,view.scrollWidth-view.clientWidth);
 function paint(){
  const frac=clamp(view.scrollLeft/(max()||1),0,1),step=columns[1]?.offsetLeft-columns[0].offsetLeft||300,mid=view.scrollLeft+view.clientWidth*.5;
  const first=Math.max(0,Math.floor(view.scrollLeft/step)-1),last=Math.min(columns.length,Math.ceil((view.scrollLeft+view.clientWidth)/step)+2);
  $('progress').style.transform=`scaleX(${frac})`;metric(Math.min(rows.length-1,Math.round(frac*(columns.length-1))*3));
  for(let i=first;i<last;i++){
   const c=columns[i];
   if(!mounted.has(i)){[...c.children].forEach((node,j)=>node.append(img(rows[i*3+j],false)));mounted.add(i);}
   if(!reduce.matches)c.style.transform=`translateY(calc(var(--shift,0%) + ${clamp((mid-c.offsetLeft-step/2)/9,-39,39)}px))`;
  }
  for(const i of mounted)if(i<first-2||i>=last+2){[...columns[i].children].forEach(node=>node.querySelector('img')?.remove());mounted.delete(i);}

 }
 function animate(){
  const dx=goal-view.scrollLeft;
  if(Math.abs(dx)<1.15||reduce.matches){view.scrollLeft=goal;frame=0;paint();return}
  view.scrollLeft+=dx*.18;paint();frame=requestAnimationFrame(animate);
 }
 function shift(delta){goal=clamp((frame?goal:view.scrollLeft)+delta,0,max());if(!frame)animate()}
 view.addEventListener('wheel',e=>{e.preventDefault();shift(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY*.85)},{passive:false});
 window.addEventListener('resize',paint);view.addEventListener('scroll',paint,{passive:true});arrows(()=>shift(-view.clientWidth*.56),()=>shift(view.clientWidth*.56));
 view.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;drag={x:e.clientX,left:view.scrollLeft,id:e.pointerId,moved:false};});
 view.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const d=drag.x-e.clientX;if(Math.abs(d)>5){if(!drag.moved){view.setPointerCapture(e.pointerId);drag.moved=true;}cancelAnimationFrame(frame);frame=0;view.classList.add('is-grabbing');view.scrollLeft=drag.left+d;suppress=performance.now()+250;}});
 for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'])view.addEventListener(event,()=>{drag=null;view.classList.remove('is-grabbing')});
 paint();
}
try{rows=shuffled(photosFor(await readPhotoLibrary(),'muse'));if(!rows.length)throw Error('empty library');if(mode==='depth')depth();else if(mode==='aristide')slices();else wall();}
catch(error){$('count').textContent='照片暂时无法读取';console.error(error);}
