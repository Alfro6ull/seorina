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

export function createStretchBrush(ctx,{getRadius=()=>.029,getLength=()=>.39,initial=()=>{},changed=()=>{}}={}){
 let source=null, paint=null, history=[], prior=null, seed=0, saveFrame=0;
 const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
 function commit(){if(!saveFrame)saveFrame=requestAnimationFrame(()=>{saveFrame=0;if(paint)ctx.putImageData(paint,0,0)})}
 function snapshot(){history.push(new Uint8ClampedArray(paint.data));if(history.length>12)history.shift();changed(history.length)}
 function dab(nx,ny,pressure){
  if(!source||!paint)return;
  const {width:w,height:h,data:original}=source, d=paint.data;
  const px=nx*w, py=ny*h, radius=Math.max(3,Math.min(w,h)*getRadius()*(.84+.24*pressure)), maxLen=getLength()*h, id=++seed;
  const left=Math.max(0,Math.floor(px-radius)),right=Math.min(w-1,Math.ceil(px+radius)), top=Math.max(0,Math.floor(py));
  for(let x=left;x<=right;x++){
   const t=Math.abs(x+.5-px)/radius;
   if(t>=1)continue;
   const feather=Math.pow(1-t*t,.85);
   const ridges=.65+.20*Math.sin(x*2.17)+.13*Math.sin(x*.83+id*.12);
   const len=Math.max(4,maxLen*feather*ridges*(.87+.2*pressure));
   const srcY=limit(Math.round(py+Math.sin(x*.59)*3),0,h-1);
   const si=(srcY*w+x)*4,end=Math.min(h-1,top+Math.ceil(len));
   for(let y=top;y<=end;y++){
    const k=(y-top)/len, mix=feather*(1-k*k)*.69; if(mix<=0)continue;
    const from=limit(srcY-Math.floor(9*k),0,h-1)*w*4+x*4;
    const di=(y*w+x)*4;
    for(let c=0;c<3;c++){const col=original[si+c]*.68+original[from+c]*.32;d[di+c]+=(col-d[di+c])*mix;}
   }
  }
 }
 function set(image){const {width:w,height:h,data}=image;source=image;paint=ctx.createImageData(w,h);paint.data.set(data);history=[];prior=null;seed=0;initial();changed(0);ctx.putImageData(paint,0,0)}
 function begin(point,pressure=.5){if(!paint)return;snapshot();prior=point;dab(...point,pressure);commit()}
 function move(point,pressure=.5){
  if(!prior||!paint)return;
  const [x,y]=point,[a,b]=prior;
  const w=paint.width,h=paint.height;
  const step=Math.max(1,Math.min(w,h)*getRadius()*.34);
  const n=limit(Math.ceil(Math.hypot((x-a)*w,(y-b)*h)/step),1,140);
  for(let j=1;j<=n;j++)dab(a+(x-a)*j/n,b+(y-b)*j/n,pressure);
  prior=point;commit();
 }
 function end(){prior=null}
 function undo(){end();if(history.length){paint.data.set(history.pop());commit()}changed(history.length)}
 function clear(){end();if(!source||!paint)return;snapshot();paint.data.set(source.data);commit()}
 function flush(){if(paint)ctx.putImageData(paint,0,0)}
 return {set,begin,move,end,undo,clear,flush};
}

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
