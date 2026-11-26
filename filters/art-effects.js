const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function renderGlass(ctx,image,{amount,detail,variant,coverage='full'}){
  if(!amount)return;
  const w=image.width,h=image.height,top=coverage==='half'?Math.floor(h/2):0;
  const pitch=Math.max(3, Math.round(Math.min(w,h)*(.006+.022*detail)));
  const frost=variant==='frost';
  ctx.save();
  ctx.beginPath();ctx.rect(0,top,w,h-top);ctx.clip();
  if(frost){
    ctx.filter='blur('+((.001+.004*amount)*Math.min(w,h)).toFixed(2)+'px)';
    ctx.globalAlpha=.72*amount;ctx.drawImage(image,0,0);ctx.filter='none';
  }
  for(let start=0;start<w;start+=pitch){
    for(let u=start;u<Math.min(start+pitch,w);u++){
      const f=(u-start+.5)/pitch;
      const shift=(Math.sin((f-.5)*Math.PI)*1.10 + Math.sin(f*2*Math.PI)*.26)*pitch*amount*(frost?.66:1.45);
      const src=clamp(u+shift,0,w-1);
      ctx.globalAlpha=amount*(frost?.48:1);
      ctx.drawImage(image,src,0,1,h,u,0,1,h);
    }
    ctx.globalAlpha=amount*(frost?.47:.66);
    const g=ctx.createLinearGradient(start,0,start+pitch,0);
    g.addColorStop(0,'rgba(219,245,255,.34)');
    g.addColorStop(.12,'rgba(249,246,222,.30)');
    g.addColorStop(.31,'rgba(255,255,255,0)');
    g.addColorStop(.68,'rgba(255,255,255,0)');
    g.addColorStop(.93,'rgba(18,24,37,.31)');
    g.addColorStop(1,'rgba(18,24,37,.36)');
    ctx.fillStyle=g;ctx.fillRect(start,top,pitch,h-top);
  }
  ctx.restore();
}
