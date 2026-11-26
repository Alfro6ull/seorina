// Original implementations; no external shader code is used here.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hashes = seed => () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
export function stretchStroke(ctx,image,dab,amount,detail,variant) {
  if (!amount) return;
  const w=image.width,h=image.height,s=Math.min(w,h);
  const x=dab.x*w,y=dab.y*h,dx=dab.dx*w,dy=dab.dy*h;
  const length=Math.hypot(dx,dy);
  if (length<1) return;
  const edge=s*(.008+.075*detail), theta=Math.atan2(dy,dx), steps=Math.min(36,Math.max(2,Math.ceil(length/2)));
  const chip=edge*(variant==='silk'?.30:.56), sx=clamp(x-chip,0,w-2),sy=clamp(y-chip,0,h-2);
  const sw=Math.min(w-sx,chip*2),sh=Math.min(h-sy,chip*2);
  ctx.save();
  for(let i=0;i<=steps;i++){
    const t=i/steps, pos=Math.pow(t,1.10), taper=variant==='silk'?1-.42*t:.86;
    const px=x+dx*pos,py=y+dy*pos;
    ctx.save();ctx.translate(px,py);ctx.rotate(theta);
    if(variant==='silk'){
      ctx.beginPath();ctx.ellipse(0,0,edge*.62,edge*taper,0,0,2*Math.PI);ctx.clip();
      ctx.globalAlpha=amount*(.74-.28*t);
      ctx.drawImage(image,sx,sy,sw,sh,-edge*.68,-edge*taper,edge*1.36,edge*taper*2);
    }else{
      ctx.globalAlpha=amount*(.85-.26*t);
      ctx.drawImage(image,sx,sy,sw,sh,-edge*.61,-edge*taper,edge*1.22,edge*taper*2);
    }
    ctx.restore();
  }
  ctx.restore();
}
export function renderGlass(ctx,image,{x,y,amount,detail,variant}){
  if(!amount)return;
  const w=image.width,h=image.height;
  const lensW=w*(.27+.31*detail), lensH=h*.61;
  const cx=x*w,cy=y*h,step=Math.max(6,w*(.010+.022*detail));
  const left=cx-lensW/2, top=cy-lensH/2;
  ctx.save();
  ctx.beginPath();ctx.roundRect(left,top,lensW,lensH,Math.max(4,w*.012));ctx.clip();
  if(variant==='frost'){
    ctx.save();ctx.filter='blur('+Math.round(1+amount*w*.011)+'px)';
    ctx.drawImage(image,0,0);ctx.restore();
  }
  for(let start=left;start<left+lensW;start+=step){
    const end=Math.min(start+step,left+lensW);
    for(let u=Math.max(0,Math.floor(start));u<Math.min(w,end);u+=2){
      const p=clamp((u-start)/step,0,1), offset=Math.sin((p-.5)*Math.PI)*step*amount*(variant==='prism'?2.4:1.25);
      const src=clamp(u+offset,0,w-2);
      ctx.globalAlpha=variant==='prism'?.94:.32;
      ctx.drawImage(image,src,0,2,h,u,0,2,h);
    }
    ctx.globalAlpha=amount*.52;
    const g=ctx.createLinearGradient(start,0,start+step,0);
    g.addColorStop(0,'rgba(255,248,220,.55)');g.addColorStop(.14,'rgba(255,248,220,.13)');g.addColorStop(.67,'rgba(255,248,220,0)');g.addColorStop(1,'rgba(0,0,18,.46)');
    ctx.fillStyle=g;ctx.fillRect(start,top,step,lensH);
  }
  ctx.globalAlpha=1;ctx.fillStyle='rgba(173,215,227,'+(amount*.075)+')';ctx.fillRect(left,top,lensW,lensH);
  ctx.restore();ctx.save();ctx.strokeStyle='rgba(255,248,221,'+(amount*.72)+')';ctx.lineWidth=Math.max(1,w*.0016);
  ctx.beginPath();ctx.roundRect(left,top,lensW,lensH,Math.max(4,w*.012));ctx.stroke();ctx.restore();
}
export function renderGlitch(ctx,image,{x,y,amount,detail,variant,seed}){
  if(!amount)return;
  const rand=hashes(seed), w=image.width,h=image.height,cx=x*w,cy=y*h;
  const rw=w*(.41+detail*.32),rh=h*(.24+detail*.42),x0=cx-rw/2,y0=cy-rh/2;
  const heavy=variant==='blocks';
  ctx.save();ctx.beginPath();ctx.rect(x0,y0,rw,rh);ctx.clip();
  const n=Math.round(8+36*detail);
  for(let i=0;i<n;i++){
    const row=clamp(Math.floor(y0+rand()*rh),0,h-2);
    const band=Math.min(h-row,Math.max(2,Math.round(rand()*h*(heavy?.039:.014))));
    const start=clamp(Math.floor(x0+rand()*rw*(heavy?.9:.42)),0,w-2);
    const span=Math.max(1,Math.floor(Math.min(w-start, rw*(.15+rand()*.85))));
    const shift=(rand()-.5)*w*amount*(heavy?.29:.17);
    ctx.globalAlpha=.5+amount*.5;ctx.drawImage(image,start,row,span,band,start+shift,row,span,band);
    ctx.globalCompositeOperation='screen';
    ctx.fillStyle= i%2?'rgba(249,30,154,.69)':'rgba(0,219,252,.65)';
    ctx.globalAlpha=amount*(heavy?.95:.66);
    ctx.fillRect(start+shift+(i%2?4:-5),row,span*(heavy?.5:.88),heavy?band:Math.min(6,band));
    ctx.globalCompositeOperation='source-over';
  }
  ctx.globalAlpha=amount*.35;ctx.fillStyle='#080425';
  for(let row=Math.max(0,Math.floor(y0));row<Math.min(h,y0+rh);row+=Math.max(3,Math.floor(h/130)))ctx.fillRect(x0,row,rw,1);
  ctx.restore();
}
