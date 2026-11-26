import { Gallery } from './gallery.js';
import { MuseRenderer } from './renderer.js?v=3';

const $=id=>document.getElementById(id);
const base=new URL('./',import.meta.url);
const two=n=>String(n).padStart(2,'0');
const gallery=new Gallery();
let renderer=null,ready=false,failed=false,importing=false;
function sourceLink(element,url){element.hidden=!url;if(url)element.href=url;else element.removeAttribute('href');}
function notify(message){$('status').textContent=message||'';$('status').hidden=!message;}

function showFallback(error){
  console.warn('MUSE renderer:',error);
  if(renderer){renderer.dispose();renderer=null;}
  failed=true;$('stage').hidden=true;$('fallback').hidden=false;
  $('action').disabled=true;$('motion').disabled=true;
  if(gallery.current)$('fallback').src=gallery.current.src;
  notify('此设备暂时使用静态照片浏览。图库与原图仍可打开。');
  $('loading').hidden=true;
}
function updatePhoto(){
  const photo=gallery.current;if(!photo)return;
  $('photo-title').textContent=photo.title;
  $('counter').textContent=`${two(gallery.index+1)} / ${two(gallery.items.length)}`;
  $('count').textContent=two(gallery.items.filter(p=>!p.demo).length);
  $('demo-label').textContent=photo.demo?'原创建筑光影':photo.local?'本地照片':'';
  $('demo-label').hidden=!photo.demo&&!photo.local;
  $('prev').disabled=$('next').disabled=gallery.items.length<2;
  sourceLink($('source'),photo.source);
  $('stage').setAttribute('aria-label',`Particles：${photo.title}。拖动看立体，移动指针拨动光点。`);
  if(failed)$('fallback').src=photo.src;
  const depth=!photo.depthImage;
  $('depth-note').hidden=!depth;
  $('depth-note').textContent=depth?'这张照片以曲面光点呈现':' ';
  $('action').textContent='散开';
}

function renderLibrary(){
  const grid=$('library-grid');grid.replaceChildren();
  $('library-count').textContent=`${gallery.items.filter(p=>!p.demo).length} 张照片 · ${gallery.localCount} 张本地导入`;
  $('clear-local').disabled=!gallery.localCount||importing;
  gallery.items.forEach((photo,index)=>{
    const button=document.createElement('button');button.className='thumb';button.type='button';
    button.setAttribute('aria-label',`选择 ${photo.title}`);button.setAttribute('aria-pressed',String(index===gallery.index));
    const image=document.createElement('img');image.src=photo.src;image.alt='';image.loading='lazy';
    const caption=document.createElement('span');caption.textContent=photo.title;
    button.append(image,caption);
    button.addEventListener('click',()=>{gallery.select(index);$('library').close();});
    grid.append(button);
  });
}
function pauseForDialog(){renderer?.setPaused($('library').open||$('viewer').open);}
function openLibrary(){renderLibrary();$('library').showModal();pauseForDialog();}
function openViewer(){
  const photo=gallery.current;if(!photo)return;
  $('view-image').src=photo.src;$('view-image').alt=photo.title;$('view-title').textContent=photo.title;
  sourceLink($('view-source'),photo.source);
  $('viewer').showModal();pauseForDialog();
}
async function importFiles(files){
  if(importing)return;importing=true;$('files').disabled=true;$('clear-local').disabled=true;
  $('import-status').textContent='正在载入照片…';
  try{const result=await gallery.importFiles(files);$('import-status').textContent=gallery.status.message||(result.added?`已加入 ${result.added} 张照片。`:'请选择可读取的照片。');}
  catch(error){$('import-status').textContent=error.message||'导入未完成，请重试。';}
  finally{importing=false;$('files').disabled=false;renderLibrary();}
}

gallery.addEventListener('change',()=>{
  try{renderer?.setCollection(gallery.items,gallery.index);}catch(error){showFallback(error);}
  updatePhoto();renderLibrary();
  if(!failed)notify(gallery.status.message);
});
gallery.addEventListener('select',()=>{
  try{renderer?.setIndex(gallery.index);}catch(error){showFallback(error);}
  updatePhoto();
});

$('brand').href=base.href;$('archive-link').href=new URL('../index/',base).href;
$('rights-link').href=new URL('credits.html',base).href;
try{renderer=new MuseRenderer($('stage'),{onError:showFallback});}catch(error){showFallback(error);}
$('motion').setAttribute('aria-pressed',String(!!renderer?.motion));
$('motion').setAttribute('aria-label',renderer?.motion?'暂停自动运动':'启用自动运动');

$('library-open').addEventListener('click',openLibrary);
$('files').addEventListener('change',event=>{importFiles(event.target.files);event.target.value='';});
$('clear-local').addEventListener('click',async()=>{if(importing)return;const result=await gallery.clearLocal();$('import-status').textContent=gallery.status.message||(result?.error?'清除未完成，请重试。':'已清除本地导入。');});
$('drop').addEventListener('dragover',event=>{event.preventDefault();$('drop').classList.add('dragover');});
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('dragover'));
$('drop').addEventListener('drop',event=>{event.preventDefault();$('drop').classList.remove('dragover');importFiles(event.dataTransfer.files);});
$('prev').addEventListener('click',()=>gallery.select(gallery.index-1));
$('next').addEventListener('click',()=>gallery.select(gallery.index+1));
$('inspect').addEventListener('click',openViewer);
$('action').addEventListener('click',()=>{const label=renderer?.action();if(label)$('action').textContent=label;});
$('motion').addEventListener('click',()=>{if(!renderer)return;renderer.setMotion(!renderer.motion);$('motion').setAttribute('aria-pressed',String(renderer.motion));$('motion').setAttribute('aria-label',renderer.motion?'暂停自动运动':'启用自动运动');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('当前浏览器不支持全屏。');}});
if(!document.documentElement.requestFullscreen)$('fullscreen').hidden=true;
for(const dialog of document.querySelectorAll('dialog')){
  dialog.addEventListener('close',pauseForDialog);
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
}
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
window.addEventListener('keydown',event=>{
  if($('library').open||$('viewer').open||event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|BUTTON|A/.test(document.activeElement?.tagName||''))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();gallery.select(gallery.index+(event.key==='ArrowRight'?1:-1));}
  if(event.key==='Enter'){event.preventDefault();openViewer();}
});
window.addEventListener('pagehide',()=>{renderer?.setPaused(true);});
window.addEventListener('pageshow',()=>{if(ready)pauseForDialog();});

try{
  await gallery.init();
  // A square, depth-backed photograph is a useful first view of the point sculpture.
  const portrait=gallery.items.findIndex(photo=>photo.depthImage&&photo.width/photo.height>.9&&photo.width/photo.height<1.1);
  if(portrait>=0)gallery.select(portrait);
  ready=true;document.body.classList.add('is-ready');$('loading').hidden=true;
}catch(error){notify(error.message||'图库暂时无法载入。');$('loading').hidden=true;}
