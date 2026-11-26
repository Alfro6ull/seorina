import {demoUrl, saveFrame} from './shared.js';
import {renderGlass} from './art-effects.js';

const el=id=>document.getElementById(id);
const canvas=el('preview'), ctx=canvas.getContext('2d'), stage=el('stage'), original=el('original'), notice=el('notice');
let image,src,photoName='',demo=false,compare=false,serial=0,frame=0;

function loadDefaults() {
  el('amp').value=70;el('detail').value=48;
  document.querySelector('input[name=tone][value=a]').checked=true;
  el('coverage-full').checked=true;
}
function render(){
  if(!image)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0);
  renderGlass(ctx,image,{
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
  el('reset-demo').hidden=!image||demo;
  el('compare').textContent=compare?'返回滤镜':'看原图';
  el('compare').setAttribute('aria-pressed',String(compare));
  el('screen-status').textContent=!image?'未选图':compare?'原图':'滤镜预览';
  queue();
}
async function choose(file,useDemo=false){
  if(!file&&!useDemo)return;
  const id=++serial;
  if(file&&(!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)||file.size>24*1024*1024)){
    notice.textContent='请选择不超过 24 MB 的 JPG、PNG、WebP、GIF、AVIF 或 BMP。';return;
  }
  const next=useDemo?demoUrl:URL.createObjectURL(file);
  const img=new Image();img.src=next;notice.textContent='';
  try{
    await img.decode();
    if(id!==serial){if(!useDemo)URL.revokeObjectURL(next);return;}
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>55000000)throw Error();
    if(src?.startsWith('blob:'))URL.revokeObjectURL(src);
    src=next;original.src=src;demo=useDemo;compare=false;photoName=useDemo?'seorina-cntv':file.name.replace(/\.[^.]+$/,'');
    const scale=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight));
    image=document.createElement('canvas');
    canvas.width=image.width=Math.max(2,Math.round(img.naturalWidth*scale));canvas.height=image.height=Math.max(2,Math.round(img.naturalHeight*scale));
    const input=image.getContext('2d');
    input.fillStyle='#151413';input.fillRect(0,0,image.width,image.height);input.drawImage(img,0,0,image.width,image.height);
    loadDefaults();
    el('image-info').textContent=(demo?'仁雅 · CNTV 2023　/　':'')+img.naturalWidth+' × '+img.naturalHeight+' px';
    sync();
  }catch{if(!useDemo)URL.revokeObjectURL(next);if(id===serial){notice.textContent='无法读取图片，请试试较小的 JPG 或 PNG。';sync();}}
}
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
el('clean').addEventListener('click',()=>{loadDefaults();sync();});
el('compare').addEventListener('click',()=>{compare=!compare;sync();});
el('save').addEventListener('click',()=>{render();saveFrame(canvas,photoName+'-glass',demo,'Fluted glass filter',notice);});
el('reset-demo').addEventListener('click',()=>void choose(null,true));
loadDefaults();sync();void choose(null,true);
