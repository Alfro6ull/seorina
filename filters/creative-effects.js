const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const palettes={glitch:["#e8e0d4","#e05c79","#6fd6e8"],ascii:["#e8e0d4","#d9be91","#b5c9c4"],particles:["#e8e0d4","#e8b9a8","#9eb6c5"],halftone:["#f0e7d6","#253d4b","#bd5c46"]};
export const effects={
 glitch:{title:"Digital Glitch",label:"数字故障",description:"让画面像一段受到干扰的数字信号。横向错位、色彩分离与扫描纹理都由原图生成。",detail:"故障颗粒"},
 ascii:{title:"ASCII Portrait",label:"字符肖像",description:"把照片转换为由字符密度构成的肖像。明暗决定字符层次，保留原图的色彩气息。",detail:"字符密度"},
 particles:{title:"Memory Particles",label:"记忆粒子",description:"从照片采样颜色与轮廓，让图像化为漂浮的粒子。移动指针可以扰动粒子，导出当前静帧。",detail:"粒子数量"},
 halftone:{title:"Halftone Print",label:"印刷网点",description:"以网点、双色套印和纸张底色重构照片，获得编辑刊物般的印刷质感。",detail:"网点尺寸"}
};
export function renderCreative(ctx,image,{effect,amount,detail,pointer,phase=0}){
 const w=ctx.canvas.width,h=ctx.canvas.height,d=image.data,level=amount/100,density=detail/100;
 const palette=palettes[effect];
 if(effect==="glitch"){
  const out=ctx.createImageData(w,h),dst=out.data;
  const band=Math.max(5,Math.round(h*(.012+.11*density))),shiftMax=Math.round(w*(.005+.075*level));
  for(let y=0;y<h;y++){
   const bandIndex=Math.floor(y/band),active=((bandIndex*17+3)%11)<(2+Math.round(level*5));
   const shift=active?Math.round(Math.sin(bandIndex*12.989)*shiftMax):0;
   for(let x=0;x<w;x++){
    const i=(y*w+x)*4,sx=clamp(x+shift,0,w-1),si=(y*w+sx)*4;
    const r=d[(y*w+clamp(x+shift+2,0,w-1))*4],g=d[si+1],b=d[(y*w+clamp(x+shift-2,0,w-1))*4+2];
    const scan=(y%Math.max(2,Math.round(2+8*(1-density)))===0)?(.72+.22*level):1;
    dst[i]=r*scan;dst[i+1]=g*scan;dst[i+2]=b*scan;dst[i+3]=255;
   }
  }
  ctx.putImageData(out,0,0);
  if(level>.08){ctx.save();ctx.globalAlpha=.08+.18*level;ctx.fillStyle=palette[1];for(let n=0;n<Math.round(3+level*18);n++){const y=(n*97+Math.floor(phase*31))%h;ctx.fillRect(0,y,w,Math.max(1,h*.0015));}ctx.restore();}
  return;
 }
 if(effect==="ascii"){
  ctx.fillStyle="#111315";ctx.fillRect(0,0,w,h);
  const cols=Math.round(42+density*112),cellW=w/cols,cellH=cellW*.62;
  const chars=" .,:;irsXA253hMHGS#9B&@";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=Math.max(5,cellH*1.55)+"px monospace";
  for(let y=0;y<h;y+=cellH)for(let x=0;x<w;x+=cellW){
   const sx=Math.min(w-1,Math.floor(x+cellW/2)),sy=Math.min(h-1,Math.floor(y+cellH/2)),i=(sy*w+sx)*4;
   const lum=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;
   const idx=Math.min(chars.length-1,Math.floor((1-lum)*(chars.length-1)));
   const alpha=.28+lum*.72;
   ctx.fillStyle="rgba("+d[i]+","+d[i+1]+","+d[i+2]+","+(alpha*(.25+.75*level))+")";
   ctx.fillText(chars[idx],x+cellW/2,y+cellH/2);
  }
  return;
 }
 if(effect==="halftone"){
  ctx.fillStyle=palette[0];ctx.fillRect(0,0,w,h);
  const step=Math.max(3,Math.round(Math.min(w,h)*(.006+.025*density))),radius=step*(.48*level+.08);
  for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){
   const i=(Math.floor(y)*w+Math.floor(x))*4,lum=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;
   const r=radius*(1-lum),tone=lum<.48?palette[1]:palette[2];
   ctx.fillStyle=tone;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  return;
 }
 if(effect==="particles"){
  ctx.fillStyle="#111315";ctx.fillRect(0,0,w,h);
  const step=Math.max(4,Math.round(3+density*10)),radius=Math.max(.7,step*(.13+.12*level));
  for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){
   const i=(Math.floor(y)*w+Math.floor(x))*4,lum=(d[i]+d[i+1]+d[i+2])/765;
   const dx=x-pointer.x*w,dy=y-pointer.y*h,dist=Math.hypot(dx,dy),force=Math.max(0,1-dist/(Math.min(w,h)*.23))*level;
   const angle=Math.atan2(dy,dx),wave=Math.sin(phase+x*.013+y*.009)*level*step*.55;
   const px=x+Math.cos(angle)*force*step*7+wave,py=y+Math.sin(angle)*force*step*7+Math.cos(phase+x*.009)*level*step;
   ctx.fillStyle="rgba("+d[i]+","+d[i+1]+","+d[i+2]+","+(0.35+lum*.65)+")";
   ctx.beginPath();ctx.arc(px,py,radius*(.55+lum),0,Math.PI*2);ctx.fill();
  }
 }
}