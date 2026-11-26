import {drawCRT,drawPoster} from './digital-art.js?v=art';
import {defaultFilterPhotoId, filterDemo, filterPhotos, photoSource, saveFrame} from './shared.js?v=photo-picker';
import {renderGlass,createStretchBrush,renderRGBGlitch} from './art-effects.js?v=rgb-and-stretch';

const el=id=>document.getElementById(id);
const canvas=el('preview'), ctx=canvas.getContext('2d'), stage=el('stage'), original=el('original'), notice=el('notice');
let image,buffer,focus,src,photoName='',demo=false,compare=false,serial=0,frame=0;
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
  if(poster)el('poster-title').value=demo?'SEORINA':'POSTER';
  focus=demo?.id===defaultFilterPhotoId?{x:.47,y:.257}:{x:.50,y:.34};
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
  el('reset-demo').hidden=!image||demo?.id===defaultFilterPhotoId;
  if(stretch)el('undo').hidden=!image||compare;
  el('compare').textContent=compare?'返回滤镜':'看原图';
  el('compare').setAttribute('aria-pressed',String(compare));

  queue();
}
async function choose(file,useDemo=false,selected=null){
  if(!file&&!useDemo&&!selected)return;
  const id=++serial;
  if(file&&(!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)||file.size>24*1024*1024)){
    notice.textContent='请选择不超过 24 MB 的 JPG、PNG、WebP、GIF、AVIF 或 BMP。';return;
  }
  let next, entry;notice.textContent='';
  try{
    entry=selected||(useDemo?await filterDemo():null);
    if(id!==serial)return;
    next=entry?.src||URL.createObjectURL(file);
    const img=new Image();img.src=next;
    await img.decode();
    if(id!==serial){if(!entry)URL.revokeObjectURL(next);return;}
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>55000000)throw Error();
    if(src?.startsWith('blob:'))URL.revokeObjectURL(src);
    src=next;original.src=src;demo=entry;compare=false;photoName=entry?(entry.id===defaultFilterPhotoId?'seorina-kpopit':entry.id):file.name.replace(/\.[^.]+$/,'');
    const scale=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width=Math.max(2,Math.round(img.naturalWidth*scale));canvas.height=Math.max(2,Math.round(img.naturalHeight*scale));
    const source=document.createElement('canvas');source.width=canvas.width;source.height=canvas.height;
    const input=source.getContext('2d',{willReadFrequently:true});
    input.fillStyle='#151413';input.fillRect(0,0,source.width,source.height);input.drawImage(img,0,0,source.width,source.height);
    image=input.getImageData(0,0,source.width,source.height);
    buffer=ctx.createImageData(source.width,source.height);
    if(poster){artworkSource=source;canvas.width=canvas.height=1080}
    loadDefaults();brush?.set(image);
    const link=el('image-source'), href=photoSource(demo);
    link.hidden=!href;
    if(href){link.href=href;link.textContent=demo.title}
    else{link.removeAttribute('href');link.textContent=''}
    el('image-info').textContent=demo&&!href?demo.title+' · '+img.naturalWidth+' × '+img.naturalHeight:img.naturalWidth+' × '+img.naturalHeight;
    const credit=el('photo-credit');
    credit.replaceChildren();credit.hidden=!demo;
    if(demo){
      credit.append(demo.sourceAttribution||'');
      if(demo.license?.url){
        const license=document.createElement('a');license.href=demo.license.url;
        license.textContent=demo.license.name;license.target='_blank';license.rel='noopener noreferrer';
        credit.append(' · ',license,' · 已应用滤镜');
      }
    }
    sync();
  }catch{if(next&&!entry)URL.revokeObjectURL(next);if(id===serial){notice.textContent='无法读取图片，请试试较小的 JPG 或 PNG。';sync();}}
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
for(const b of document.querySelectorAll('[data-pick]'))b.addEventListener('click',()=>el('file').click());
el('file').addEventListener('change',e=>{void choose(e.target.files[0]);e.target.value='';});
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
el('save').addEventListener('click',()=>{if(stretch)brush.flush();else render();saveFrame(canvas,photoName+'-'+effect,demo,({'rgb':'RGB glitch filter','stretch':'Pixel stretch filter','crt':'CRT surveillance filter','poster':'Constructivist poster','glass':'Fluted glass filter'})[effect],notice);});
const gallery=el('photo-gallery'), galleryGrid=el('gallery-photos'), galleryStatus=el('gallery-status');
let photoOptions;
function showGalleryPhotos(rows){
  galleryStatus.hidden=rows.length>0;
  galleryStatus.textContent=rows.length?'':'暂时没有可选照片。';
  galleryGrid.replaceChildren(...rows.map(photo=>{
    const item=document.createElement('article');
    item.className='gallery-photo';
    const pick=document.createElement('button');
    pick.type='button';pick.className='gallery-pick';pick.setAttribute('aria-label','使用：'+photo.title);
    if(demo?.id===photo.id)pick.classList.add('is-selected');
    const img=document.createElement('img');img.src=photo.src;img.alt='';img.loading='lazy';img.decoding='async';
    pick.append(img);pick.addEventListener('click',()=>{gallery.close();void choose(null,false,photo)});
    const href=photoSource(photo);
    const title=document.createElement(href?'a':'span');title.textContent=photo.title;
    if(href){title.href=href;title.target='_blank';title.rel='noopener noreferrer'}
    const credit=document.createElement('small');
    credit.textContent=photo.sourceAttribution+(photo.license?' · '+photo.license.name:'');
    item.append(pick,title,credit);return item;
  }));
}
el('open-gallery').addEventListener('click',async()=>{
  gallery.showModal();
  galleryStatus.hidden=false;galleryStatus.textContent='正在读取图库';
  try{photoOptions ||= await filterPhotos();showGalleryPhotos(photoOptions)}
  catch{galleryStatus.textContent='图库暂时打不开，仍可上传照片。'}
});
el('close-gallery').addEventListener('click',()=>gallery.close());
gallery.addEventListener('close',()=>el('open-gallery').focus());
el('reset-demo').addEventListener('click',()=>void choose(null,true));
loadDefaults();sync();void choose(null,true);
