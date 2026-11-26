import {demoUrl, saveFrame} from './shared.js';
import {stretchStroke, renderGlass, renderGlitch} from './art-effects.js';
import {renderPrint} from './art-print.js';
import {renderParticles} from './art-particles.js';

const tools = {
  stretch:{title:'手指拉片',gesture:'从想取样的位置按住，往外拖。',modes:['丝带','硬边'],variants:['silk','block'],amount:86,detail:45,detailLabel:'带宽',extra:'撤销',change:'Pixel stretch'},
  glass:{title:'长虹玻璃',gesture:'把玻璃拖到想折射的地方。',modes:['棱镜','磨砂'],variants:['prism','frost'],amount:70,detail:48,detailLabel:'玻璃宽度',x:37,y:37,change:'Fluted glass'},
  glitch:{title:'彩色故障',gesture:'拖动画面，故障只跟着一块区域走。',modes:['色偏','碎块'],variants:['split','blocks'],amount:76,detail:54,detailLabel:'区域与密度',x:71,y:49,extra:'再抽一次',change:'Colour glitch'},
  particles:{title:'散落粒子',gesture:'划过画面推开光点，移开后它们会聚回来。',modes:['浮尘','碎光'],variants:['drift','spark'],amount:72,detail:63,detailLabel:'细密度',x:73,y:55,extra:'暂停',change:'Photo particles'},
  print:{title:'像素印刷',gesture:'用照片原来的明暗来决定墨点。',modes:['双色网点','四色抖色'],variants:['ink','pixel'],amount:85,change:'Pixel print'}
};
const key=new URL(location.href).searchParams.get('effect')||'stretch';
const kind=Object.hasOwn(tools,key)?key:'stretch';
const config=tools[kind];
const el=id=>document.getElementById(id);
const canvas=el('preview'), ctx=canvas.getContext('2d'), stage=el('stage'), original=el('original'), notice=el('notice');
const range=Object.fromEntries(['amp','detail','tool-x','tool-y'].map(i=>[i,el(i)]));
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const isPrint=kind==='print', isStretch=kind==='stretch', isParticles=kind==='particles';
let image,src,photoName='',demo=false,compare=false,serial=0,stroke=null,point=null,frame=0,strokes=[],seed=1927,mode=0;
let phase=0,playing=isParticles&&!motion.matches,lastTime=0,activeX=.73,activeY=.55,interaction=0,settleTimer=0;
document.title=config.title+' · 薛仁雅档案';
el('tool-name').textContent=config.title;
el('tool-gesture').textContent=config.gesture;
el('mode-a').textContent=config.modes[0];el('mode-b').textContent=config.modes[1];
el('tool-pad').hidden=isStretch||isPrint;
el('detail-row').hidden=range.detail.hidden=isPrint;
if (config.detailLabel) el('detail-label').textContent=config.detailLabel;
el('extra').hidden=!config.extra;
el('extra').textContent=config.extra||'';
stage.classList.toggle('gesture-stage',!isPrint);
stage.classList.toggle('particle-stage',isParticles);
const read=id=>Number(range[id].value)/100;
const maxStroke=18;
function loadDefaults() {
  range.amp.value=config.amount;range.detail.value=config.detail||50;range['tool-x'].value=config.x||50;range['tool-y'].value=config.y||50;
  activeX=read('tool-x');activeY=read('tool-y');interaction=isParticles?.58:0;
  for (const input of document.querySelectorAll('input[name=tone]')) input.checked=input.value==='a';
  mode=0;seed=1927;phase=0;stroke=null;point=null;strokes=[];
}
function sampleStrokes() {
  return [[{x:.73,y:.53,dx:.26,dy:.055}],
          [{x:.68,y:.575,dx:.32,dy:.085}],
          [{x:.29,y:.57,dx:-.29,dy:.055}]];
}
function label(id,value){el(id).value=value+'%'}
function labels(){ label('amp-value',range.amp.value); label('detail-value',range.detail.value);label('x-value',range['tool-x'].value);label('y-value',range['tool-y'].value); }
function render(){
  if(!image)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0);
  const args={x:read('tool-x'),y:read('tool-y'),amount:read('amp'),detail:read('detail'),variant:config.variants[mode],seed,phase};
  if(isStretch){
    for(const batch of strokes)for(const dab of batch)stretchStroke(ctx,image,dab,args.amount,args.detail,args.variant);
    if(stroke?.length)for(const dab of stroke)stretchStroke(ctx,image,dab,args.amount,args.detail,args.variant);
    if(point)stretchStroke(ctx,image,point,args.amount,args.detail,args.variant);
  }else if(kind==='glass')renderGlass(ctx,image,args);
  else if(kind==='glitch')renderGlitch(ctx,image,args);
  else if(isParticles)renderParticles(ctx,image,{...args,x:activeX,y:activeY,amount:args.amount,phase,interaction});
  else if(isPrint)renderPrint(ctx,image,args);
}
function update(now){
  frame=0;
  let again=false;
  if(isParticles&&playing&&!compare&&!document.hidden){
    const elapsed=lastTime?Math.min(now-lastTime,40):0;
    phase=(phase+elapsed/6200)%1;interaction=Math.max(0,interaction-elapsed/900);
    lastTime=now;again=true;
  }else lastTime=0;
  render();
  if(again)queue();
}
function queue(){if(!frame)frame=requestAnimationFrame(update)}
function sync(){
  labels();
  stage.classList.toggle('is-demo',demo);
  canvas.hidden=!image||compare;original.hidden=!image||!compare;
  el('empty').hidden=Boolean(image);
  el('compare').disabled=el('save').disabled=el('clean').disabled=!image;
  el('extra').disabled=!image||isStretch&&!strokes.length;
  el('reset-demo').hidden=!image||demo;
  el('compare').textContent=compare?'返回滤镜':'看原图';
  el('compare').setAttribute('aria-pressed',String(compare));
  el('screen-status').textContent=!image?'未选图':compare?'原图':isParticles?(playing?'动态预览':'已暂停'):'滤镜预览';
  if(isParticles)el('extra').textContent=playing?'暂停':'播放';
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
    const cap=isParticles?820:1100;
    const scale=Math.min(1,cap/Math.max(img.naturalWidth,img.naturalHeight));
    image=document.createElement('canvas');
    canvas.width=image.width=Math.max(2,Math.round(img.naturalWidth*scale));canvas.height=image.height=Math.max(2,Math.round(img.naturalHeight*scale));
    const input=image.getContext('2d',{willReadFrequently:isParticles||isPrint});
    input.fillStyle='#151413';input.fillRect(0,0,image.width,image.height);input.drawImage(img,0,0,image.width,image.height);
    loadDefaults();
    if(isStretch&&demo)strokes=sampleStrokes();
    el('image-info').textContent=(demo?'仁雅 · CNTV 2023　/　':'')+img.naturalWidth+' × '+img.naturalHeight+' px';
    sync();
  }catch{if(!useDemo)URL.revokeObjectURL(next);if(id===serial){notice.textContent='无法读取图片，请试试较小的 JPG 或 PNG。';sync();}}
}
const clamp=(v)=>Math.max(0,Math.min(1,v));
function map(e){
  const box=stage.getBoundingClientRect(),w=canvas.width,h=canvas.height;
  const scale=(demo?Math.max:Math.min)(box.width/w,box.height/h);
  const dx=(box.width-w*scale)*.5;
  const dy=(box.height-h*scale)*(demo?(matchMedia('(max-width:760px)').matches?.12:.05):.5);
  return {x:clamp((e.clientX-box.left-dx)/(w*scale)),y:clamp((e.clientY-box.top-dy)/(h*scale))};
}
let origin=null;
function resetInteraction(){
  window.clearTimeout(settleTimer);
  settleTimer=window.setTimeout(()=>{activeX=read('tool-x');activeY=read('tool-y');interaction=0;queue();},950);
}
function setPosition(p){
  if(isParticles){activeX=p.x;activeY=p.y;interaction=1;resetInteraction();}
  else{range['tool-x'].value=Math.round(p.x*100);range['tool-y'].value=Math.round(p.y*100);labels();}
  queue();
}
stage.addEventListener('pointerdown',e=>{
  if(!image||compare||isPrint||e.button!==0||e.target!==canvas)return;
  canvas.focus({preventScroll:true});
  stage.setPointerCapture(e.pointerId);
  const p=map(e);
  if(isStretch){origin=p;stroke=[];}else setPosition(p);
});
stage.addEventListener('pointermove',e=>{
  if(!image||compare||isPrint)return;
  const captured=stage.hasPointerCapture(e.pointerId);
  if(!captured&&!(isParticles&&e.target===canvas&&e.pointerType==='mouse'))return;
  const p=map(e);
  if(isStretch&&origin){
    point={...origin,dx:p.x-origin.x,dy:p.y-origin.y};queue();
  }else if(!isStretch)setPosition(p);
});
function end(e){
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  if(isStretch&&origin){
    if(e.type==='pointerup'&&point&&Math.hypot(point.dx,point.dy)>.004){
      strokes.push([point]);if(strokes.length>maxStroke)strokes.shift();
    }
    point=null;stroke=null;origin=null;sync();
  }
}
stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
canvas.addEventListener('keydown',e=>{
  if(!isStretch||!image||compare)return;
  const keys={ArrowLeft:[-.22,0],ArrowRight:[.22,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]};
  if(!(e.key in keys))return;
  e.preventDefault();const [dx,dy]=keys[e.key];
  strokes.push([{x:dx<0?.28:.72,y:.54,dx,dy}]);if(strokes.length>maxStroke)strokes.shift();sync();
});
for(const b of document.querySelectorAll('[data-pick]'))b.addEventListener('click',()=>el('file').click());
el('file').addEventListener('change',e=>{void choose(e.target.files[0]);e.target.value='';});
const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
document.addEventListener('dragover',e=>{if(hasFiles(e))e.preventDefault();});
document.addEventListener('drop',e=>{if(hasFiles(e))e.preventDefault();});
stage.addEventListener('dragover',e=>{if(hasFiles(e))stage.classList.add('is-over');});
stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget))stage.classList.remove('is-over');});
stage.addEventListener('drop',e=>{stage.classList.remove('is-over');if(hasFiles(e))void choose(e.dataTransfer.files[0]);});
for(const [id,node] of Object.entries(range))node.addEventListener('input',()=>{if(isParticles&&id.startsWith('tool-')){activeX=read('tool-x');activeY=read('tool-y');interaction=1;resetInteraction();}labels();queue();});
for(const radio of document.querySelectorAll('input[name=tone]'))radio.addEventListener('change',()=>{mode=radio.value==='a'?0:1;queue();});
el('extra').addEventListener('click',()=>{if(isStretch)strokes.pop();else if(isParticles)playing=!playing;else seed=(Math.imul(seed,1664525)+1013904223)>>>0;sync();});
el('clean').addEventListener('click',()=>{loadDefaults();sync();});
el('compare').addEventListener('click',()=>{compare=!compare;sync();});
el('save').addEventListener('click',()=>{render();saveFrame(canvas,photoName+'-'+kind,demo,config.change+' filter',notice);});
el('reset-demo').addEventListener('click',()=>void choose(null,true));
document.addEventListener('visibilitychange',()=>{lastTime=0;queue()});
motion.addEventListener('change',({matches})=>{if(matches&&isParticles){playing=false;sync();}});
loadDefaults();sync();void choose(null,true);
