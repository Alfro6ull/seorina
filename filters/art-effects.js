const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function renderGlass(ctx,source,out,{amount,detail,variant,coverage,focus}){
  const {width:w,height:h,data:src}=source;
  const top=coverage==='half'?Math.floor(h/2):0;
  const dst=out.data, frost=variant==='frost';
  dst.set(src);
  if(!amount){ctx.putImageData(out,0,0);return;}
  const unit=Math.min(w,h);
  const pitch=Math.max(4,Math.round(unit*(.006+.023*detail)));
  const xWeight=new Float32Array(w), lens=new Float32Array(pitch), light=new Float32Array(pitch), shade=new Float32Array(pitch);
  for(let x=0;x<w;x++)xWeight[x]=Math.exp(-((x/w-focus.x)**2)/(.22**2));
  for(let x=0;x<pitch;x++){
    const t=(x+.5)/pitch;
    lens[x]=(Math.sin(Math.PI*(t-.5))*1.2 + Math.sin(t*2*Math.PI)*.22)*pitch*amount;
    light[x]=Math.exp(-((t-.16)**2)/.013)*amount*(frost?.13:.16);
    shade[x]=Math.exp(-((t-.80)**2)/.019)*amount*(frost?.095:.13);
  }
  for(let y=top;y<h;y++){
    const yWeight=Math.exp(-((y/h-focus.y)**2)/(.215**2));
    const row=y*w*4;
    for(let x=0;x<w;x++){
      const i=row+x*4, p=x%pitch;
      // Preserve form in the focal zone while leaving optical ridges visible over it.
      const clear=xWeight[x]*yWeight;
      const offset=lens[p]*(1-.91*clear)*(frost?.72:1);
      const sx=clamp(x+offset,0,w-1), left=Math.floor(sx), mix=sx-left;
      const a=row+left*4,b=row+Math.min(w-1,left+1)*4;
      const refl=light[p]*(1-.45*clear), shadow=shade[p]*(1-.52*clear);
      const transmission=(1-.66*clear)*(frost?.65:.86);
      for(let c=0;c<3;c++){
        const bent=src[a+c]+(src[b+c]-src[a+c])*mix;
        let base=src[i+c]+(bent-src[i+c])*transmission;
        if(frost){
          const radius=Math.round(pitch*.30*(1-.85*clear));
          const lo=row+Math.max(0,left-radius)*4+c, hi=row+Math.min(w-1,left+radius)*4+c;
          base+=((src[lo]+src[hi])*.5-base)*amount*.45*(1-.75*clear);
        }
        const tint=c===0?218:c===1?242:255;
        dst[i+c]=base*(1-shadow)+(tint-base)*refl;
      }
    }
  }
  ctx.putImageData(out,0,0);
}
