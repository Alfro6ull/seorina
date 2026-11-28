import { OnDemandGallery } from './gallery.js?v=instagram-archive';
import { MuseRenderer } from './renderer.js?v=3';
const $=id=>document.getElementById(id);
const gallery=new OnDemandGallery();
let renderer=null,failed=false,localFiles=[],localPhoto=null,localIndex=-1,pendingIndex=-1,generation=0;
const supported=/\.(?:jpe?g|png|webp|avif|gif|bmp|hei[cf])$/i;
const current=()=>localPhoto||gallery.current;
const wrap=(n,total)=>((n%total)+total)%total;
const two=n=>String(n).padStart(2,'0');
function notify(message){$('status').textContent=message||'';$('status').hidden=!message;}
function update(){
 const photo=current();if(!photo)return;
 $('counter').textContent=localPhoto?two(localIndex+1)+' / '+two(localFiles.length):two(gallery.index+1)+' / '+two(gallery.items.length);
 $('photo-title').textContent=photo.title||'';
 $('source-attribution').textContent=photo.sourceAttribution||'';
 const source=$('source');source.hidden=!photo.source;if(photo.source)source.href=photo.source;else source.removeAttribute('href');
 const article=$('source-article');article.hidden=!photo.sourceArticle;if(photo.sourceArticle)article.href=photo.sourceArticle;else article.removeAttribute('href');
 if(failed)$('fallback').src=photo.src;
}
function openViewer(){const photo=current();if(!photo)return;$('view-image').src=photo.src;$('view-image').alt=photo.title;$('viewer').showModal();renderer?.setPaused(true);}
function showFallback(error){console.warn('Particle renderer:',error);renderer?.dispose();renderer=null;failed=true;$('stage').hidden=true;$('fallback').hidden=false;if(current())$('fallback').src=current().src;$('action').disabled=true;notify('');$('loading').hidden=true;}
gallery.addEventListener('change',()=>{if(localPhoto)return;try{gallery.current&&renderer?.setCollection([gallery.current],0);}catch(error){showFallback(error);}update();});
gallery.addEventListener('select',()=>{if(localPhoto)return;try{renderer?.setCollection([gallery.current],0);}catch(error){showFallback(error);}update();notify('');});
gallery.addEventListener('loaderror',()=>{if(!localPhoto)notify('这张照片暂时未能读取，可继续切换。');});
try{renderer=new MuseRenderer($('stage'),{onError:showFallback});}catch(error){showFallback(error);}
async function setLocal(rawIndex,dir=1){
 if(!localFiles.length)return;
 const count=localFiles.length,files=localFiles,op=++generation;
 pendingIndex=wrap(rawIndex,count);
 for(let offset=0;offset<count;offset++){
  if(op!==generation)return;
  const index=wrap(rawIndex+offset*dir,count),file=files[index];
  const src=URL.createObjectURL(file),image=new Image();image.src=src;
  try {
   await image.decode();
   if(op!==generation){URL.revokeObjectURL(src);return}
   if(!image.naturalWidth||!image.naturalHeight)throw Error('Invalid image');
   const long=Math.max(image.naturalWidth,image.naturalHeight),scale=Math.min(1,1400/long);
   let sample=image;
   if(scale<1){
    sample=document.createElement('canvas');sample.width=Math.max(1,Math.round(image.naturalWidth*scale));sample.height=Math.max(1,Math.round(image.naturalHeight*scale));
    sample.getContext('2d').drawImage(image,0,0,sample.width,sample.height);
   }
   const previous=localPhoto;
   localPhoto={image:sample,src,title:'本机照片',sourceAttribution:'仅当前浏览器读取 · 不上传',width:sample.naturalWidth||sample.width,height:sample.naturalHeight||sample.height};
   localIndex=pendingIndex=index;
   try{renderer?.setCollection([localPhoto],0)}catch(error){showFallback(error)}
   update();if(previous)URL.revokeObjectURL(previous.src);notify(offset?'已跳过无法打开的照片。':'');return;
  }catch{URL.revokeObjectURL(src);}
 }
 if(op===generation){pendingIndex=localIndex;notify('这批照片无法打开，试试 JPG、PNG 或 WebP。')}
}
function usePublic(){
 generation++;localFiles=[];pendingIndex=localIndex=-1;
 if(localPhoto)URL.revokeObjectURL(localPhoto.src);localPhoto=null;
 $('local-exit').hidden=true;
 try{gallery.current&&renderer?.setCollection([gallery.current],0)}catch(error){showFallback(error)}
 update();notify('');
}
function step(dir){
 if(localFiles.length)return setLocal(pendingIndex+dir,dir);
 gallery.select(gallery.pending+dir);
}
$('local-choose').addEventListener('click',()=>$('local-files').click());
$('local-exit').addEventListener('click',usePublic);
$('local-files').addEventListener('change',event=>{
 const files=[...event.target.files].filter(f=>f.size>0&&f.size<=40*1024*1024&&(supported.test(f.name)||/^image\//i.test(f.type)));
 event.target.value='';
 if(!files.length){notify('没选到可用照片。');return}
 localFiles=files;$('local-exit').hidden=false;notify('正在读取本机照片…');void setLocal(0);
});
$('prev').addEventListener('click',()=>step(-1));
$('next').addEventListener('click',()=>step(1));
$('action').addEventListener('click',()=>{const label=renderer?.action();if(label)$('action').textContent=label;});
$('viewer').addEventListener('close',()=>renderer?.setPaused(false));
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=> $('viewer').close());
window.addEventListener('keydown',event=>{if($('viewer').open||event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft')step(-1);if(event.key==='ArrowRight')step(1);if(event.key==='Escape'&&$('viewer').open)$('viewer').close();});
window.addEventListener('pagehide',()=>renderer?.setPaused(true));
window.addEventListener('pageshow',event=>{if(event.persisted)renderer?.setPaused($('viewer').open);});
try{const requested=new URLSearchParams(location.search).get('photo');await gallery.init(requested);update();$('loading').hidden=true;}catch(error){notify('照片暂时未能读取。');$('loading').hidden=true;}
$('local-choose').disabled=false;
