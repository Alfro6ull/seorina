import {drawCRT,drawPoster} from './digital-art.js?v=art';
import {saveFrame} from './shared.js?v=local-gallery';
import {addLocal,listLocal,removeLocal} from './local-gallery.js';
import {renderGlass,createStretchBrush,renderRGBGlitch} from './art-effects.js?v=rgb-and-stretch';

const el=id=>document.getElementById(id);
const canvas=el('preview'), ctx=canvas.getContext('2d'), stage=el('stage'), original=el('original'), notice=el('notice');
let image,buffer,focus,src,photoName='',compare=false,serial=0,frame=0;
const requested=new URLSearchParams(location.search).get('effect');
const rgb=requested==='rgb',stretch=requested==='stretch',crt=requested==='crt',poster=requested==='poster';
const effect=rgb?'rgb':stretch?'stretch':crt?'crt':poster?'poster':'glass';
let artworkSource;
let brushPointer=null,keyboardPoint=[.5,.4],seed=97;
const brush=stretch?createStretchBrush(ctx,{
  getRadius:()=>.006+Number(el('detail').value)*.00065,
  getLength:()=>.07+Number(el('amp').value)*.004,
  changed:n=>{el('undo').disabled=!n}
}):null;
if(effect!=='glass'){
  const title=({'rgb':'RGB 故障','stretch':'像素拖影','crt':'CRT 监视器','poster':'构成主义海报'})[effect];
  document.title=title+' · 薛仁雅档案';el('tool-name').textContent=title;
  el('amp-label').textContent=stretch?'拖影长度':poster?'网点墨色':'强度';
  el('detail-label').textContent=rgb?'错帧密度':stretch?'画笔宽度':crt?'扫描线':'网点密度';
  el('mode-wrap').hidden=el('coverage-wrap').hidden=true;
  document.querySelector('.tool-gesture').textContent=rgb?'点照片或按回车，换一帧故障。':stretch?'按住照片划动，拖影会实时出现。也可以用手指画。':crt?'调节青蓝显像和扫描线。':'调节半调网点，也可以换成自己的海报标题。';
  canvas.setAttribute('aria-label',rgb?'RGB 故障画布。按回车换一帧故障。':stretch?'像素拖影画布。按住划动，或用方向键移动画笔，回车落笔。':title+'预览');
  if(poster){el('poster-title-wrap').hidden=false;el('poster-title').addEventListener('input',queue)}
  if(crt||poster)canvas.classList.add('static-art-canvas');
  if(stretch){el('clean').textContent='清空笔迹';canvas.classList.add('stretch-canvas')}
}


function loadDefaults() {
  el('amp').value=rgb||crt?68:stretch?75:poster?65:66;el('detail').value=rgb?50:stretch?29:crt?55:poster?52:41;seed=97;
  if(poster)el('poster-title').value='POSTER';
  focus={x:.50,y:.34};
  document.querySelector('input[name=tone][value=a]').checked=true;
  el('coverage-full').checked=true;
}
function render(){
  if(!image||stretch)return;
  if(crt){drawCRT(ctx,image,{amount:Number(el('amp').value)/100,scan:Number(el('detail').value)/100});return}
  if(poster){drawPoster(ctx,artworkSource,{ink:Number(el('amp').value)/100,density:Number(el('detail').value)/100,title:el('poster-title').value});return}
  if(rgb){renderRGBGlitch(ctx,image,buffer,{focus,seed,amount:Number(el('amp').value)/100,detail:Number(el('detail').value)/100});return}
  renderGlass(ctx,image,buffer,{
    focus,
    amount:Number(el('amp').value)/100,
    detail:Number(el('detail').value)/100,
    variant:document.querySelector('input[name=tone]:checked').value==='b'?'frost':'prism',
    coverage:document.querySelector('input[name=coverage]:checked').value
  });
}
function queue(){
  el('amp-value').value=el('amp').value+'%';
  el('detail-value').value=el('detail').value+'%';
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});
}
function sync(){
  canvas.hidden=!image||compare;original.hidden=!image||!compare;
  el('empty').hidden=Boolean(image);
  el('compare').disabled=el('save').disabled=el('clean').disabled=!image;
  if(stretch)el('undo').hidden=!image||compare;
  el('compare').textContent=compare?'返回滤镜':'看原图';
  el('compare').setAttribute('aria-pressed',String(compare));

  queue();
}
let activePhoto=null;
async function choose(file,selection=null,saveToGallery=false){
 if(!file)return;
 if(!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)||file.size>24*1024*1024){
   notice.textContent='请选择不超过 24 MB 的图片。';return;
 }
 const id=++serial,next=URL.createObjectURL(file),img=new Image();
 img.src=next;notice.textContent='';
 try{
  await img.decode();
  if(id!==serial){URL.revokeObjectURL(next);return;}
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>55000000)throw Error();
  const scale=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight));
  const source=document.createElement('canvas');source.width=Math.max(2,Math.round(img.naturalWidth*scale));source.height=Math.max(2,Math.round(img.naturalHeight*scale));
  const input=source.getContext('2d',{willReadFrequently:true});
  input.fillStyle='#151413';input.fillRect(0,0,source.width,source.height);input.drawImage(img,0,0,source.width,source.height);
  const decoded=input.getImageData(0,0,source.width,source.height);
  if(src)URL.revokeObjectURL(src);
  src=next;original.src=src;compare=false;photoName=file.name.replace(/\.[^.]+$/,'');
  image=decoded;canvas.width=poster?1080:source.width;canvas.height=poster?1080:source.height;
  buffer=ctx.createImageData(source.width,source.height);
  if(poster)artworkSource=source;
  loadDefaults();brush?.set(image);sync();
  const row=selection||(saveToGallery?await addLocal(file):null);
  if(id===serial){
   activePhoto=row?.id||null;
   if(gallery.open)void refreshGallery();
  }
 }catch{if(src!==next)URL.revokeObjectURL(next);if(id===serial){notice.textContent='无法读取这张图片。';sync();}}
}
const clamp01=v=>Math.max(0,Math.min(1,v));
function pointAt(e,limit=false){
 const box=canvas.getBoundingClientRect(),scale=Math.min(box.width/canvas.width,box.height/canvas.height);
 const w=canvas.width*scale,h=canvas.height*scale;
 const x=(e.clientX-box.left-(box.width-w)/2)/w,y=(e.clientY-box.top-(box.height-h)/2)/h;
 return limit?[clamp01(x),clamp01(y)]:x>=0&&x<=1&&y>=0&&y<=1?[x,y]:null;
}
if(stretch){
 canvas.addEventListener('pointerdown',e=>{
   if(!image||compare||!e.isPrimary||e.button!==0)return;
   const p=pointAt(e);if(!p)return;
   brushPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);brush.begin(p,e.pressure||.5);
 });
 canvas.addEventListener('pointermove',e=>{if(brushPointer===e.pointerId)brush.move(pointAt(e,true),e.pressure||.5)});
 const end=e=>{if(brushPointer===e.pointerId){brushPointer=null;brush.end()}};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
 el('undo').addEventListener('click',()=>brush.undo());
}else{
 canvas.addEventListener('click',e=>{
   if(!image||compare||crt||poster)return;const p=pointAt(e);if(!p)return;
   focus={x:p[0],y:p[1]};if(rgb)seed+=293;queue();
 });
}
canvas.addEventListener('keydown',e=>{
 if(!image||compare||crt||poster)return;
 if((rgb||stretch)&&(e.key==='Enter'||e.key===' ')){
   e.preventDefault();if(stretch){brush.begin(keyboardPoint);brush.end()}else{seed+=293;queue()}return;
 }
 const d={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]}[e.key];
 if(!d)return;e.preventDefault();
 if(stretch)keyboardPoint=keyboardPoint.map((v,i)=>clamp01(v+d[i]));
 else{focus={x:clamp01(focus.x+d[0]),y:clamp01(focus.y+d[1])};queue()}
});
let addFromPicker=false;
for(const b of document.querySelectorAll('[data-pick]'))b.addEventListener('click',()=>{addFromPicker=b.dataset.pick==='gallery';el('file').click()});
el('file').addEventListener('change',e=>{const add=addFromPicker;addFromPicker=false;void choose(e.target.files[0],null,add);e.target.value='';});
const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
document.addEventListener('dragover',e=>{if(hasFiles(e))e.preventDefault();});
document.addEventListener('drop',e=>{if(hasFiles(e))e.preventDefault();});
stage.addEventListener('dragover',e=>{if(hasFiles(e))stage.classList.add('is-over');});
stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget))stage.classList.remove('is-over');});
stage.addEventListener('drop',e=>{stage.classList.remove('is-over');if(hasFiles(e))void choose(e.dataTransfer.files[0]);});
for(const id of ['amp','detail'])el(id).addEventListener('input',queue);
for(const radio of document.querySelectorAll('input[type=radio]'))radio.addEventListener('change',queue);
el('clean').addEventListener('click',()=>{if(stretch)brush.clear();else loadDefaults();sync();});
el('compare').addEventListener('click',()=>{compare=!compare;sync();});
el('save').addEventListener('click',()=>{if(stretch)brush.flush();else render();saveFrame(canvas,photoName+'-'+effect,notice);});
const gallery=el('photo-gallery'),galleryGrid=el('gallery-photos'),galleryStatus=el('gallery-status');
let thumbURLs=[],galleryUpdate=0;
function clearThumbs(){for(const url of thumbURLs)URL.revokeObjectURL(url);thumbURLs=[]}
async function refreshGallery(){
 const epoch=++galleryUpdate, rows=await listLocal();
 if(epoch!==galleryUpdate||!gallery.open)return;
 clearThumbs();
 galleryStatus.hidden=Boolean(rows.length);galleryStatus.textContent='还没有照片';
 galleryGrid.replaceChildren(...rows.map(row=>{
  const item=document.createElement('article');item.className='gallery-photo';
  const pick=document.createElement('button');pick.type='button';pick.className='gallery-pick';pick.setAttribute('aria-label','使用 '+row.name);
  if(row.id===activePhoto)pick.classList.add('is-selected');
  const img=document.createElement('img');const url=URL.createObjectURL(row.file);thumbURLs.push(url);
  img.src=url;img.alt='';img.loading='lazy';pick.append(img);
  pick.addEventListener('click',()=>{gallery.close();void choose(row.file,row)});
  const remove=document.createElement('button');remove.type='button';remove.className='gallery-remove';remove.textContent='移除';remove.setAttribute('aria-label','移除 '+row.name+'（仅从图库）');
  remove.addEventListener('click',async()=>{await removeLocal(row.id);void refreshGallery()});
  item.append(pick,remove);return item;
 }));
}
el('open-gallery').addEventListener('click',()=>{gallery.showModal();void refreshGallery()});
el('close-gallery').addEventListener('click',()=>gallery.close());
gallery.addEventListener('close',()=>{galleryUpdate++;clearThumbs();galleryGrid.replaceChildren();el('open-gallery').focus()});
window.addEventListener('pagehide',e=>{if(!e.persisted){clearThumbs();if(src)URL.revokeObjectURL(src)}});
loadDefaults();sync();
