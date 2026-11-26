import {demoUrl,saveFrame} from "./shared.js";
import {effects,renderCreative} from "./creative-effects.js";
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const effect=effects[params.get("effect")]?params.get("effect"):"glitch";
const canvas=$("preview"),ctx=canvas.getContext("2d"),original=$("original"),stage=$("stage"),notice=$("notice");
let imageData=null,source=null,blobUrl=null,isDemo=false,compare=false,frame=0,phase=0,pointer={x:.5,y:.5},raf=0,serial=0;
const reduce=matchMedia("(prefers-reduced-motion: reduce)");
$("effect-name").textContent=effects[effect].title;$("studio-title").textContent=effects[effect].label+" · 影像实验";
$("effect-description").textContent=effects[effect].description;$("detail-label").textContent=effects[effect].detail;
document.querySelectorAll("[data-effect]").forEach(a=>{if(a.dataset.effect===effect)a.setAttribute("aria-current","page");});
function draw(){
 if(!imageData||compare)return;
 renderCreative(ctx,imageData,{effect,amount:+$("amount").value,detail:+$("detail").value,pointer,phase});
}
function queue(){ $("amount-value").textContent=$("amount").value+"%";$("detail-value").textContent=$("detail").value+"%";if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw();});}
function animate(t){if(effect!=="particles"||reduce.matches||document.hidden||compare||!imageData)return;phase=t*.001;draw();frame=requestAnimationFrame(animate);}
function sync(){
 canvas.hidden=!imageData||compare;original.hidden=!imageData||!compare;$("empty").hidden=!!imageData;
 $("status").textContent=!imageData?"未选图":compare?"原图":"效果预览";
 $("compare").disabled=$("save").disabled=$("reset").disabled=!imageData;
 $("compare").textContent=compare?"返回效果":"看原图";$("compare").setAttribute("aria-pressed",String(compare));
 if(frame)cancelAnimationFrame(frame);frame=0;if(effect==="particles"&&!reduce.matches&&!compare&&imageData&&!document.hidden)frame=requestAnimationFrame(animate);
 queue();
}
async function load(file,useDemo=false){
 if(!file&&!useDemo)return;const id=++serial;
 if(file&&(!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)||file.size>24*1024*1024)){notice.textContent="请选择不超过 24 MB 的 JPG、PNG、WebP、GIF、AVIF 或 BMP。";return;}
 const url=useDemo?demoUrl:URL.createObjectURL(file),img=new Image();img.src=url;notice.textContent="";
 try{await img.decode();if(id!==serial){if(!useDemo)URL.revokeObjectURL(url);return;}
 if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>55000000)throw Error();
 if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=useDemo?null:url;source=url;original.src=url;isDemo=useDemo;compare=false;
 const scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(2,Math.round(img.naturalWidth*scale));canvas.height=Math.max(2,Math.round(img.naturalHeight*scale));
 const temp=document.createElement("canvas");temp.width=canvas.width;temp.height=canvas.height;const tctx=temp.getContext("2d",{willReadFrequently:true});tctx.drawImage(img,0,0,temp.width,temp.height);imageData=tctx.getImageData(0,0,temp.width,temp.height);
 $("image-info").textContent=(useDemo?"K-POPIT 示例 / ":"")+img.naturalWidth+" × "+img.naturalHeight+" px";$("amount").value=65;$("detail").value=50;sync();
 }catch{if(!useDemo)URL.revokeObjectURL(url);if(id===serial){notice.textContent="无法读取图片，请试试较小的 JPG 或 PNG。";sync();}}
}
document.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>$("file").click()));
$("file").addEventListener("change",e=>{void load(e.target.files[0]);e.target.value="";});
for(const id of ["amount","detail"])$(id).addEventListener("input",queue);
$("reset").addEventListener("click",()=>{$("amount").value=65;$("detail").value=50;pointer={x:.5,y:.5};compare=false;sync();});
$("compare").addEventListener("click",()=>{compare=!compare;sync();});
$("save").addEventListener("click",()=>{compare=false;draw();saveFrame(canvas,"seorina-"+effect,isDemo,effects[effect].title,notice);});
canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();pointer={x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};if(effect==="particles")queue();});
stage.addEventListener("dragover",e=>{if([...e.dataTransfer.types].includes("Files")){e.preventDefault();stage.classList.add("is-over");}});
stage.addEventListener("dragleave",()=>stage.classList.remove("is-over"));
stage.addEventListener("drop",e=>{stage.classList.remove("is-over");if(e.dataTransfer.files.length){e.preventDefault();void load(e.dataTransfer.files[0]);}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else if(!document.hidden)sync();});
reduce.addEventListener?.("change",sync);
load(null,true);