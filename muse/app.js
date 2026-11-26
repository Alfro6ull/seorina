import { Gallery } from './gallery.js';
import { MuseRenderer } from './renderer.js?v=3';
const $=id=>document.getElementById(id);
const gallery=new Gallery({includeLocal:false});
let renderer=null,failed=false;
const two=n=>String(n).padStart(2,'0');
function notify(message){$('status').textContent=message||'';$('status').hidden=!message;}
function update(){
 const photo=gallery.current;if(!photo)return;
 $('counter').textContent=two(gallery.index+1)+' / '+two(gallery.items.length);
 if(failed)$('fallback').src=photo.src;
}
function openViewer(){const photo=gallery.current;if(!photo)return;$('view-image').src=photo.src;$('view-image').alt=photo.title;$('viewer').showModal();renderer?.setPaused(true);}
function showFallback(error){console.warn('Particle renderer:',error);renderer?.dispose();renderer=null;failed=true;$('stage').hidden=true;$('fallback').hidden=false;if(gallery.current)$('fallback').src=gallery.current.src;$('action').disabled=true;notify('');$('loading').hidden=true;}
gallery.addEventListener('change',()=>{try{renderer?.setCollection(gallery.items,gallery.index);}catch(error){showFallback(error);}update();});
gallery.addEventListener('select',()=>{renderer?.setIndex(gallery.index);update();});
try{renderer=new MuseRenderer($('stage'),{onError:showFallback});}catch(error){showFallback(error);}
$('prev').addEventListener('click',()=>gallery.select(gallery.index-1));
$('next').addEventListener('click',()=>gallery.select(gallery.index+1));
$('action').addEventListener('click',()=>{const label=renderer?.action();if(label)$('action').textContent=label;});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
if(!document.documentElement.requestFullscreen)$('fullscreen').hidden=true;
$('viewer').addEventListener('close',()=>renderer?.setPaused(false));
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=> $('viewer').close());
window.addEventListener('keydown',event=>{if($('viewer').open||event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft')gallery.select(gallery.index-1);if(event.key==='ArrowRight')gallery.select(gallery.index+1);if(event.key==='Escape'&&$('viewer').open)$('viewer').close();});
window.addEventListener('pagehide',()=>renderer?.setPaused(true));
try{await gallery.init();const portrait=gallery.items.findIndex(photo=>photo.depthImage&&photo.width/photo.height>.9&&photo.width/photo.height<1.1);if(portrait>=0)gallery.select(portrait);update();$('loading').hidden=true;}catch(error){notify('');$('loading').hidden=true;}
