const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

export function renderRGBGlitch(ctx, source, out, {amount, detail, focus, seed}) {
  const {width:w,height:h,data:src}=source, dst=out.data;
  if (!amount) { ctx.putImageData(source,0,0); return; }
  const power=amount/.68;
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const bands=new Array(h);
  for(let i=0,count=Math.round(10+detail*56);i<count;i++){
    const y=Math.floor((.04+.91*random())*h), len=1+Math.floor(Math.pow(random(),3)*h*.021);
    const x=random()*.85, spread=.06+.55*random(), off=(random()-.5)*.28;
    for(let j=y;j<Math.min(y+len,h);j++) bands[j]=[x,x+spread,off,i%3];
  }
  const wx=Array.from({length:w},(_,x)=>Math.exp(-(((x/w-focus.x)/.18)**2)));
  const luma=(i)=>src[i]*.2126+src[i+1]*.7152+src[i+2]*.0722;
  for(let y=0;y<h;y++){
    const band=bands[y], row=4*y*w, wy=Math.exp(-(((y/h-focus.y)/.19)**2));
    const scan=y%3===0 ? 1-.09*power : 1;
    for(let x=0;x<w;x++){
      const i=row+4*x,u=x/w,hit=band&&u>=band[0]&&u<=band[1],clear=wx[x]*wy;
      const shift=(hit?band[2]*w:0)*(1-.65*clear)*power;
      const edge=Math.abs(luma(i)-luma(row+4*Math.min(w-1,x+4)));
      const split=(.004+.009*Math.min(1,edge/55))*w*(1-.6*clear)*power;
      for(let c=0;c<3;c++){
        const sx=clamp(x+shift+(c-1)*split,0,w-1),lo=Math.floor(sx),a=row+4*lo+c,b=row+4*Math.min(w-1,lo+1)+c;
        const sampled=src[a]+(src[b]-src[a])*(sx-lo);
        dst[i+c]=sampled*scan+(hit&&band[3]===c?(22+edge*.45)*(1-.54*clear)*power:0);
      }
      dst[i+3]=src[i+3];
    }
  }
  ctx.putImageData(out,0,0);
}
