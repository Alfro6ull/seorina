import {drawCRT,drawPoster} from './digital-art.js?v=art';
import {saveFrame} from './shared.js?v=local-gallery';
import {photoLibraryURL,photosFor,readPhotoLibrary} from '../assets/photos/library.js?v=instagram-archive';
import {renderRGBGlitch} from './art-effects.js?v=rgb-only';

const el=id=>document.getElementById(id);
const canvas=el('preview'), ctx=canvas.getContext('2d'), stage=el('stage'), original=el('original'), notice=el('notice');
let image,buffer,focus,src,photoName='',compare=false,serial=0,frame=0;
const configs={
 rgb:{title:'RGB 故障', amp:68, detail:50, ampLabel:'强度', detailLabel:'错帧密度', hint:'点照片或按回车，换一帧故障。', label:'RGB 故障画布。按回车换一帧故障。'},
 crt:{title:'CRT 监视器', amp:68, detail:55, ampLabel:'强度', detailLabel:'扫描线', hint:'调节青蓝显像和扫描线。'},
 poster:{title:'构成主义海报', amp:65, detail:52, ampLabel:'网点墨色', detailLabel:'网点密度', hint:'调节半调网点，或换成自己的海报标题。'}
};
const buttons=[...document.querySelectorAll('[data-effect]')];
const requested=new URLSearchParams(location.search).get('effect');
let effect=Object.hasOwn(configs,requested)?requested:'rgb';
let artworkSource,seed=97;
const savedSettings=new Map();
function readSettings(){
 return {amp:el('amp').value, detail:el('detail').value,
  title:el('poster-title').value, focus:{...focus},seed};
}
function loadSettings(state){
  const defaults=configs[effect];
  el('amp').value=state?.amp??defaults.amp;el('detail').value=state?.detail??defaults.detail;
  el('poster-title').value=state?.title??'POSTER';
  focus=state?.focus??{x:.50,y:.34};seed=state?.seed??97;
}
function mountCanvas(){
 if(!image)return;
 canvas.width=effect==='poster'?1080:image.width;
 canvas.height=effect==='poster'?1080:image.height;
 stage.parentElement.style.setProperty('--photo-width',canvas.width+'px');
 stage.parentElement.style.setProperty('--photo-ratio',canvas.width/canvas.height);
}
function configure(){
 const c=configs[effect];
 el('tool-name').textContent=c.title;
 el('amp-label').textContent=c.ampLabel;el('detail-label').textContent=c.detailLabel;
 el('poster-title-wrap').hidden=effect!=='poster';
 document.querySelector('.tool-gesture').textContent=c.hint;
 canvas.setAttribute('aria-label',c.label||c.title+'预览');
 canvas.classList.toggle('static-art-canvas',effect==='crt'||effect==='poster');
 for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.effect===effect));
 if(!buttons.length)document.title=c.title+' · 薛仁雅档案';
}
function switchEffect(next){
 if(next===effect||!Object.hasOwn(configs,next))return;
 savedSettings.set(effect,readSettings());
 effect=next;
 loadSettings(savedSettings.get(next));configure();mountCanvas();sync();
 if(buttons.length){
  const url=new URL(location.href);
  url.searchParams.set('effect',effect);history.replaceState(null,'',url);
 }
}
function render(){
  if(!image)return;
  if(effect==='crt'){drawCRT(ctx,image,{amount:Number(el('amp').value)/100,scan:Number(el('detail').value)/100});return}
  if(effect==='poster'){drawPoster(ctx,artworkSource,{ink:Number(el('amp').value)/100,density:Number(el('detail').value)/100,title:el('poster-title').value});return}
  renderRGBGlitch(ctx,image,buffer,{focus,seed,amount:Number(el('amp').value)/100,detail:Number(el('detail').value)/100});
}
function queue(){
  el('amp-value').value=el('amp').value+'%';
  el('detail-value').value=el('detail').value+'%';
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});
}
const divider=el('compare-position'), overlay=el('compare-overlay');
function splitAt(n) {
  const value=String(Math.max(0,Math.min(100,Math.round(n))));
  divider.value=value;
  divider.setAttribute('aria-valuetext','原图 '+value+'%');
  stage.style.setProperty('--reveal',value+'%');
}
function sync(){
  canvas.hidden=!image;
  original.hidden=!image||!compare;
  overlay.hidden=!image||!compare;
  el('empty').hidden=Boolean(image);
  el('compare').disabled=el('save').disabled=el('clean').disabled=!image;
  el('compare').textContent=compare?'退出对比':'原图对比';
  el('compare').setAttribute('aria-pressed',String(compare));
  queue();
}
let comparePointer=null;
function splitFromPointer(e){
 const box=stage.getBoundingClientRect();
 splitAt((e.clientX-box.left)/box.width*100);
}
overlay.addEventListener('pointerdown',e=>{
 if(e.target===divider||!e.isPrimary||e.button!==0)return;
 comparePointer=e.pointerId;overlay.setPointerCapture(e.pointerId);splitFromPointer(e);
});
overlay.addEventListener('pointermove',e=>{if(e.pointerId===comparePointer)splitFromPointer(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
 overlay.addEventListener(type,e=>{if(e.pointerId===comparePointer)comparePointer=null;});
}
divider.addEventListener('input',()=>splitAt(Number(divider.value)));
let activePhoto=null;
function setSource(row){
 const link=el('image-source'), candidates=[row?.source,row?.instagramPost];
 let address=null;
 for(const source of candidates){
  if(!source)continue;
  try{
   const url=new URL(source);
   if(url.origin!=='https://www.instagram.com'||url.username||url.password||
      !/^\/(?:_seorina\/)?p\/[A-Za-z0-9_-]+\/$/.test(url.pathname))continue;
   const position=String(row.instagramPosition??url.searchParams.get('img_index')??'');
   url.search='';url.hash='';
   if(/^[1-9]\d*$/.test(position))url.searchParams.set('img_index',position);
   address=url.href;break;
  }catch{}
 }
 if(address)link.href=address;else link.removeAttribute('href');
 el('photo-credit').hidden=!address;
}
async function choose(file,selection=null,signal){
 if(!file)return;
 if(!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)||file.size>24*1024*1024){
   notice.textContent='请选择不超过 24 MB 的图片。';return;
 }
 const id=++serial,next=URL.createObjectURL(file),img=new Image();
 img.src=next;notice.textContent='';
 try{
  await img.decode();
  if(id!==serial||signal?.aborted){URL.revokeObjectURL(next);return false;}
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>55000000)throw Error();
  const scale=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight));
  const source=document.createElement('canvas');source.width=Math.max(2,Math.round(img.naturalWidth*scale));source.height=Math.max(2,Math.round(img.naturalHeight*scale));
  const input=source.getContext('2d',{willReadFrequently:true});
  input.fillStyle='#151413';input.fillRect(0,0,source.width,source.height);input.drawImage(img,0,0,source.width,source.height);
  const decoded=input.getImageData(0,0,source.width,source.height);
  if(src)URL.revokeObjectURL(src);
  src=next;original.src=src;compare=false;photoName=file.name.replace(/\.[^.]+$/,'');
  image=decoded;artworkSource=source;
  buffer=ctx.createImageData(source.width,source.height);
   savedSettings.clear();splitAt(50);
  loadSettings();mountCanvas();sync();
  activePhoto=selection?.id||null;setSource(selection);
  return true;
 }catch{if(src!==next)URL.revokeObjectURL(next);if(id===serial){notice.textContent='无法读取这张图片。';sync();}}
 return false;
}
const clamp01=v=>Math.max(0,Math.min(1,v));
function pointAt(e,limit=false){
 const box=canvas.getBoundingClientRect(),scale=Math.min(box.width/canvas.width,box.height/canvas.height);
 const w=canvas.width*scale,h=canvas.height*scale;
 const x=(e.clientX-box.left-(box.width-w)/2)/w,y=(e.clientY-box.top-(box.height-h)/2)/h;
 return limit?[clamp01(x),clamp01(y)]:x>=0&&x<=1&&y>=0&&y<=1?[x,y]:null;
}
canvas.addEventListener('click',e=>{
 if(!image||compare||effect!=='rgb')return;
 const p=pointAt(e);if(!p)return;
 focus={x:p[0],y:p[1]};seed+=293;queue();
});
canvas.addEventListener('keydown',e=>{
 if(!image||compare||effect!=='rgb')return;
 if(e.key==='Enter'||e.key===' '){
   e.preventDefault();seed+=293;queue();return;
 }
 const d={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]}[e.key];
 if(!d)return;e.preventDefault();
 focus={x:clamp01(focus.x+d[0]),y:clamp01(focus.y+d[1])};queue();
});
const picker=document.querySelector('.effect-picker');
if(picker){
 for(const [i,b] of buttons.entries()){
   b.addEventListener('click',()=>switchEffect(b.dataset.effect));
   b.addEventListener('keydown',e=>{
     const step={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key];
     if(!step)return;e.preventDefault();
     const next=buttons[(i+step+buttons.length)%buttons.length];
     next.focus();switchEffect(next.dataset.effect);
   });
 }
 picker.addEventListener('wheel',e=>{
   if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>=Math.abs(e.deltaY)||picker.scrollWidth<=picker.clientWidth+1)return;
   const old=picker.scrollLeft;picker.scrollLeft+=e.deltaY*(e.deltaMode===1?16:1);
   if(picker.scrollLeft!==old)e.preventDefault();
 },{passive:false});
}
for(const b of document.querySelectorAll('[data-pick]'))b.addEventListener('click',()=>el('file').click());
el('file').addEventListener('change',e=>{cancelPending();void choose(e.target.files[0]);e.target.value='';});
const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
document.addEventListener('dragover',e=>{if(hasFiles(e))e.preventDefault();});
document.addEventListener('drop',e=>{if(hasFiles(e))e.preventDefault();});
stage.addEventListener('dragover',e=>{if(hasFiles(e))stage.classList.add('is-over');});
stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget))stage.classList.remove('is-over');});
stage.addEventListener('drop',e=>{stage.classList.remove('is-over');if(hasFiles(e)){cancelPending();void choose(e.dataTransfer.files[0]);}});
for(const id of ['amp','detail'])el(id).addEventListener('input',queue);
el('clean').addEventListener('click',()=>{loadSettings();sync();});
el('compare').addEventListener('click',()=>{compare=!compare;sync();});
el('save').addEventListener('click',()=>{render();saveFrame(canvas,photoName+'-'+effect,notice);});
el('poster-title').addEventListener('input',queue);
const gallery=el('photo-gallery'),galleryGrid=el('gallery-photos'),galleryStatus=el('gallery-status');
const pagination=el('gallery-pagination'), pageSize=36;
let galleryRows, galleryPromise, pageIndex=0, pending=null, openToken=0;
function cancelPending(){pending?.abort();pending=null;}
async function getGallery(){
 if(galleryRows)return galleryRows;
 if(!galleryPromise){
  galleryPromise=readPhotoLibrary().then(rows=>{
   const legacy=photosFor(rows,'muse').filter(row=>row.rightsStatus==='existing-muse-only');
   galleryRows=[...new Map([...legacy,...photosFor(rows,'gallery')].map(row=>[row.id,row])).values()];
   galleryRows.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||
    (a.instagramPost||'').localeCompare(b.instagramPost||'')||
    (a.instagramPosition||1)-(b.instagramPosition||1));
   return galleryRows;
  }).finally(()=>{galleryPromise=null;});
 }
 return galleryPromise;
}
async function selectGallery(row){
 cancelPending();
 const request=new AbortController();pending=request;
 galleryStatus.textContent='正在读取照片…';galleryStatus.hidden=false;
 try{
  const response=await fetch(new URL(row.src,photoLibraryURL),{signal:request.signal});
  if(!response.ok)throw Error('Photo request failed');
  const blob=await response.blob();
  if(request.signal.aborted)return;
  const name=row.src.split('/').at(-1);
  const ok=await choose(new File([blob],name,{type:blob.type}),row,request.signal);
  if(request.signal.aborted)return;
  if(!ok)throw Error('Photo decoding failed');
  pending=null;gallery.close();
 }catch{
  if(!request.signal.aborted){galleryStatus.textContent='这张照片暂时无法读取，可以选另一张。';galleryStatus.hidden=false;}
 }finally{if(pending===request)pending=null;}
}
function paintGallery(){
 const total=galleryRows?.length||0, pages=Math.ceil(total/pageSize);
 galleryStatus.hidden=total>0;
 if(!total)galleryStatus.textContent='图库暂时没有可选照片。';
 pagination.hidden=pages<=1;
 el('gallery-prev').disabled=pageIndex===0;
 el('gallery-next').disabled=pageIndex>=pages-1;
 el('gallery-page').value=(pageIndex+1)+' / '+pages;
 galleryGrid.replaceChildren(...(galleryRows||[]).slice(pageIndex*pageSize,(pageIndex+1)*pageSize).map((row,i)=>{
  const pick=document.createElement('button');pick.type='button';pick.className='gallery-pick';
  const label=row.title||'照片 '+(pageIndex*pageSize+i+1);
  pick.setAttribute('aria-label','使用 '+label);
  pick.dataset.photoId=row.id;
  if(row.id===activePhoto){pick.classList.add('is-selected');pick.setAttribute('aria-current','true');}
  const img=document.createElement('img');img.src=new URL(row.src,photoLibraryURL);
  img.alt='';img.loading='lazy';img.decoding='async';pick.append(img);
  pick.addEventListener('click',()=>{void selectGallery(row);});
  return pick;
 }));
}
async function openGallery(){
 const token=++openToken;
 gallery.showModal();galleryStatus.textContent='正在读取图库…';galleryStatus.hidden=false;
 try{
  await getGallery();
  if(token!==openToken||!gallery.open)return;
  const i=galleryRows.findIndex(row=>row.id===activePhoto);
  if(i>=0)pageIndex=Math.floor(i/pageSize);
  paintGallery();gallery.scrollTop=0;
 }catch{if(token===openToken)galleryStatus.textContent='图库暂时无法读取，请稍后再试。';}
}
function changePage(delta){
 const next=Math.max(0,Math.min(Math.ceil(galleryRows.length/pageSize)-1,pageIndex+delta));
 if(next===pageIndex)return;
 cancelPending();pageIndex=next;paintGallery();gallery.scrollTop=0;
 galleryGrid.firstElementChild?.focus({preventScroll:true});
}
el('open-gallery').addEventListener('click',()=>{void openGallery();});
el('close-gallery').addEventListener('click',()=>gallery.close());
el('gallery-prev').addEventListener('click',()=>changePage(-1));
el('gallery-next').addEventListener('click',()=>changePage(1));
gallery.addEventListener('close',()=>{
 openToken++;cancelPending();galleryGrid.replaceChildren();pagination.hidden=true;el('open-gallery').focus();
});
window.addEventListener('pagehide',e=>{if(!e.persisted){cancelPending();if(src)URL.revokeObjectURL(src);}});
loadSettings();configure();sync();
