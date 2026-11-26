const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function drawCRT(ctx,input,{amount=.68,scan=.55}={}) {
  const {width:w,height:h,data}=input,d=ctx.createImageData(w,h),pixels=d.data;
  const strength=clamp(amount,0,1), unit=Math.min(w,h);
  const step=Math.max(2,Math.round(unit/265)),shift=Math.max(1,Math.round(unit*.004*strength));
  const trace=new Float32Array(104),hits=new Uint16Array(104);
  for(let y=0;y<h;y++){
    const ny=(y/h-.5)*1.66, horizontal=y%(step*2)<step?1:1-scan*.25, row=y*w*4;
    for(let x=0;x<w;x++){
      const i=row+x*4,nx=(x/w-.5)*1.66;
      const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
      if(y%5===0){const n=Math.min(103,Math.floor(x*104/w));trace[n]+=l/255;hits[n]++;}
      const dark=Math.max(.58,1-strength*(nx*nx+ny*ny)*.34)*horizontal;
      const ri=row+4*Math.min(w-1,x+shift),bi=row+4*Math.max(0,x-shift)+2;
      const grading=[data[ri]*(1-.93*strength)+l*.035*strength,data[i+1]*(1-.38*strength)+l*.19*strength,data[bi]*(1-.11*strength)+l*.27*strength];
      for(let c=0;c<3;c++) pixels[i+c]=(grading[c]-18*strength)*(1+.15*strength)*dark;
      pixels[i+3]=255;
    }
  }
  const screen=document.createElement('canvas');
  screen.width=w;screen.height=h;screen.getContext('2d').putImageData(d,0,0);
  const p=Math.round(unit*.026),r=unit*.03;
  ctx.save();ctx.fillStyle='#040c14';ctx.fillRect(0,0,w,h);
  ctx.beginPath();ctx.roundRect(p,p,w-2*p,h-2*p,r);ctx.clip();ctx.drawImage(screen,p,p,w-2*p,h-2*p);
  ctx.restore();ctx.save();
  ctx.strokeStyle='#388ca4';ctx.lineWidth=unit*.0022;ctx.beginPath();ctx.roundRect(p*.55,p*.55,w-1.1*p,h-1.1*p,r);ctx.stroke();
  const inset=p*1.85;
  ctx.fillStyle='#8bf3f3';ctx.font=`600 ${Math.max(10,unit*.021)}px ui-monospace, monospace`;ctx.textBaseline='top';
  ctx.fillText('●  MONITOR 03',inset,inset);
  ctx.textAlign='right';ctx.fillText('CAM / 01',w-inset,inset);ctx.textAlign='left';
  ctx.font=`${Math.max(8,unit*.015)}px ui-monospace, monospace`;
  ctx.fillText('CH 01   /   REC',inset,inset+unit*.041);ctx.textAlign='right';ctx.fillText('TC  00:14:27:09',w-inset,inset+unit*.041);ctx.textAlign='left';
  ctx.strokeStyle='#68d9e4';ctx.lineWidth=unit*.002;
  for(const sx of [1,-1])for(const sy of [1,-1]){
    const x=sx>0?inset:w-inset,y=sy>0?inset+unit*.11:h-inset,l=unit*.029;
    ctx.beginPath();ctx.moveTo(x+sx*l,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*l);ctx.stroke();
  }
  const g={x:inset+unit*.024,y:h-inset-unit*.085,w:unit*.24,h:unit*.055};
  ctx.fillStyle='#06131eaa';ctx.fillRect(g.x,g.y,g.w,g.h);ctx.strokeStyle='#4dabb9';ctx.strokeRect(g.x,g.y,g.w,g.h);
  ctx.beginPath();
  for(let i=0;i<trace.length;i++){
    const x=g.x+g.w*(.03+.94*i/(trace.length-1)),y=g.y+g.h*(.80-.60*(trace[i]/Math.max(1,hits[i])));
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  ctx.stroke();ctx.restore();
}

function cover(ctx,img,x,y,w,h,bias=.42){
 const s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)*bias,iw,ih);ctx.restore();
}

export function drawPoster(ctx,image,{ink=.65,density=.52,title='POSTER'}={}) {
 const size=ctx.canvas.width;
 ctx.save();ctx.scale(size/1000,size/1000);
 ctx.fillStyle='#efe3c8';ctx.fillRect(0,0,1000,1000);
 const polygon=(points,color)=>{
   ctx.fillStyle=color;ctx.beginPath();
   points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
 };
 ctx.fillStyle='#da3b2a';ctx.beginPath();ctx.arc(662,346,302,0,2*Math.PI);ctx.fill();
 polygon([[0,657],[1000,253],[1000,413],[0,814]],'#171a1a');
 polygon([[0,830],[1000,435],[1000,540],[0,937]],'#efe3c8');
 cover(ctx,image,150,154,690,690);
 ctx.strokeStyle='#f8eacb90';ctx.lineWidth=1.8;
 for(const x of [65,150,840,936]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1000);ctx.stroke()}
 for(const y of [154,842]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke()}
 ctx.strokeStyle='#f9efd4dc';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(557,338,279,0,2*Math.PI);ctx.stroke();
 // Halftone is sampled from the source, with no model or inference.
 const dots=document.createElement('canvas');dots.width=Math.round(30+density*35);dots.height=Math.round(dots.width*1.4);
 const dx=dots.getContext('2d',{willReadFrequently:true});cover(dx,image,0,0,dots.width,dots.height,.27);
 const px=dx.getImageData(0,0,dots.width,dots.height).data;
 ctx.save();ctx.beginPath();ctx.moveTo(665,168);ctx.lineTo(949,168);ctx.lineTo(949,625);ctx.lineTo(730,669);ctx.closePath();ctx.clip();
 ctx.fillStyle=`rgba(22,22,21,${Math.min(.94,ink*.9)})`;
 const step=285/dots.width;
 ctx.beginPath();
 for(let y=0;y<dots.height;y++)for(let x=0;x<dots.width;x++){
   const i=4*(y*dots.width+x), lum=(px[i]*.213+px[i+1]*.715+px[i+2]*.072)/255;
   const rad=step*.49*Math.pow(1-lum,1.02);if(rad<.85)continue;
   const a=665+(x+.5)*step,b=168+(y+.5)*step;
   ctx.moveTo(a+rad,b);ctx.arc(a,b,rad,0,2*Math.PI);
 }
 ctx.fill();ctx.restore();
 polygon([[55,770],[161,724],[161,850],[55,885]],'#171a1a');
 ctx.fillStyle='#f8ead0';ctx.textBaseline='alphabetic';ctx.font='900 92px system-ui, sans-serif';ctx.fillText(title.slice(0,24),60,816,540);
 ctx.fillStyle='#1c1c19';ctx.font='650 24px system-ui, sans-serif';ctx.fillText('S E R I E S',66,880);
 ctx.textAlign='right';ctx.font='650 22px system-ui, sans-serif';ctx.fillText('Nº 01',947,68);
 ctx.fillRect(870,81,77,2);
 ctx.fillStyle='#d43729';for(let i=0;i<3;i++)ctx.fillRect(840+40*i,925,27,27);
 ctx.restore();
}
