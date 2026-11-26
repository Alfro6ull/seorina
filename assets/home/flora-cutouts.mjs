// Each outline isolates an actual plant in the supplied plate. Coordinates
// below were traced from 2x inspection crops, then converted to original pixels.
const defs=[
 {view:[910,85],root:[342,147],mode:'leaf',poly:[[337,148],[349,148],[343,165],[327,181],[325,192],[340,199],[343,222],[337,243],[326,237],[322,261],[311,267],[299,244],[296,218],[283,223],[262,225],[259,216],[270,190],[292,174],[315,170],[331,156]]},
 {view:[910,85],root:[625,289],mode:'leaf',poly:[[618,287],[629,289],[637,295],[652,303],[667,324],[673,344],[664,353],[650,351],[654,371],[649,390],[635,391],[625,383],[632,403],[626,414],[616,433],[605,436],[593,414],[591,397],[597,374],[583,380],[563,379],[564,365],[568,343],[584,322],[611,313],[617,302]]},
 {view:[765,365],root:[207,337],mode:'grass',poly:[[203,340],[205,321],[223,272],[228,259],[216,265],[199,258],[186,245],[190,230],[204,217],[227,213],[242,211],[270,217],[291,235],[297,255],[290,278],[276,288],[263,269],[245,257],[237,269],[224,308],[212,343]]},
 {view:[765,365],root:[101,184],mode:'grass',poly:[[94,190],[103,166],[112,145],[98,153],[84,146],[85,125],[100,104],[123,99],[145,102],[169,116],[178,135],[174,153],[166,176],[154,161],[138,151],[124,150],[109,171],[103,191]]},
 {view:[765,365],root:[806,306],mode:'grass',poly:[[801,307],[794,279],[783,256],[771,250],[756,264],[736,265],[730,249],[738,231],[755,221],[777,214],[799,213],[819,220],[831,238],[829,257],[813,268],[798,254],[788,251],[791,266],[810,308]]},
 {view:[1050,335],root:[818,388],mode:'pink',poly:[[803,394],[805,377],[797,352],[783,352],[768,366],[741,377],[718,378],[710,368],[704,354],[708,341],[716,329],[715,320],[723,309],[738,300],[741,285],[755,277],[766,273],[793,277],[804,290],[813,277],[827,263],[847,265],[863,277],[860,298],[846,312],[829,326],[812,346],[825,387]]},
 {view:[1050,335],root:[408,571],mode:'pink',poly:[[404,575],[391,541],[372,543],[350,550],[327,554],[307,548],[297,536],[308,522],[314,508],[322,501],[330,478],[345,469],[357,474],[372,462],[386,458],[399,469],[412,454],[427,456],[438,466],[443,484],[434,502],[418,519],[401,532],[411,573]]},
 {view:[1050,335],root:[970,244],mode:'pink',poly:[[965,248],[952,216],[937,226],[914,235],[889,231],[877,217],[877,205],[868,198],[877,184],[888,174],[911,164],[920,143],[937,132],[958,129],[976,136],[992,133],[1006,141],[1008,184],[993,199],[969,208],[979,247]]},
 {view:[1050,335],root:[205,671],mode:'blue',poly:[[198,672],[195,645],[176,639],[151,634],[141,624],[147,610],[166,607],[164,594],[179,585],[193,579],[211,585],[222,582],[234,583],[238,591],[258,592],[269,604],[270,619],[257,627],[239,633],[219,640],[211,671]]},
 {view:[545,360],root:[242,388],mode:'blue',poly:[[234,388],[239,352],[224,350],[208,344],[200,334],[200,317],[212,306],[231,302],[246,305],[259,312],[277,314],[291,322],[302,331],[305,347],[289,359],[270,361],[254,359],[245,389]]},
 {view:[545,360],root:[339,282],mode:'warm',poly:[[332,282],[342,246],[329,241],[317,230],[316,214],[322,201],[326,187],[338,177],[350,180],[362,188],[375,187],[389,196],[397,211],[401,227],[392,242],[375,248],[351,248],[343,284]]},
 {view:[545,360],root:[389,364],mode:'warm',poly:[[382,364],[396,333],[382,325],[374,315],[373,299],[380,285],[394,277],[410,280],[427,290],[439,308],[441,322],[428,334],[406,340],[390,368]]},
 {view:[545,360],root:[368,180],mode:'warm',poly:[[363,180],[374,157],[368,153],[356,140],[355,124],[361,111],[370,101],[383,97],[397,102],[414,111],[428,113],[437,123],[444,140],[434,151],[423,157],[403,160],[389,154],[379,181]]}
];
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p);};

export function makeCutouts(image,host){
 const iw=image.naturalWidth,ih=image.naturalHeight;
 const backing=canvas(iw,ih), bx=backing.getContext('2d',{willReadFrequently:true});
 bx.drawImage(image,0,0);
 const layers=[];
 for(let k=0;k<defs.length;k++){
  const d=defs[k],abs=([x,y])=>[d.view[0]+x/2,d.view[1]+y/2],points=d.poly.map(abs);
  const [rx,ry]=abs(d.root);
  const l=Math.floor(Math.min(...points.map(a=>a[0])))-4,t=Math.floor(Math.min(...points.map(a=>a[1])))-4;
  const w=Math.ceil(Math.max(...points.map(a=>a[0])))-l+5,h=Math.ceil(Math.max(...points.map(a=>a[1])))-t+5,N=w*h;
  const orig=bx.getImageData(l,t,w,h), m=canvas(w,h).getContext('2d');
  m.beginPath();points.forEach(([x,y],i)=>i?m.lineTo(x-l,y-t):m.moveTo(x-l,y-t));m.closePath();m.fill();
  const edge=m.getImageData(0,0,w,h).data, mask=new Uint8Array(N);
  let fill=new Float32Array(N*3), next=new Float32Array(N*3);
  for(let j=0;j<N;j++){
   mask[j]=edge[j*4+3]>30?1:0;
   for(let c=0;c<3;c++)fill[j*3+c]=orig.data[j*4+c];
  }
  next.set(fill);
  // Harmonic reconstruction fills only the isolated silhouette; leave the
  // rock, wall and the other plants entirely untouched.
  for(let r=0;r<85;r++){
   for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const j=y*w+x;if(!mask[j])continue;
    for(let c=0;c<3;c++){const a=j*3+c;next[a]=(fill[a-3]+fill[a+3]+fill[a-w*3]+fill[a+w*3])*.25;}
   }
   const old=fill;fill=next;next=old;
  }
  const cleaned=bx.createImageData(w,h), fg=canvas(w,h), fx=fg.getContext('2d'), cut=fx.createImageData(w,h);
  for(let j=0;j<N;j++){
   const a=j*4,b=j*3, aa=edge[a+3]/255;
   const dr=orig.data[a]-fill[b],dg=orig.data[a+1]-fill[b+1],db=orig.data[a+2]-fill[b+2];
   const strength=Math.max(Math.abs(dr),Math.abs(dg),Math.abs(db));
   const diff=d.mode==='leaf'?Math.max(0,-(.36*dr+.6*dg+.04*db)):strength;
   const isFlower=d.mode==='pink'||d.mode==='blue'||d.mode==='warm';
   const r=orig.data[a],g=orig.data[a+1],bch=orig.data[a+2];
   let match=1;
   if(d.mode==='pink')match=smooth(12,37,.8*(r-g)+.67*(bch-g));
   if(d.mode==='blue')match=smooth(5,27,bch-Math.max(r,g));
   if(d.mode==='warm')match=smooth(14,48,r-g)*smooth(94,154,r);
   // A narrow stem near the pivot may still move even when it isn't the blossom hue.
   const nearStem=smooth(11,0,Math.abs(j%w+l-rx))*smooth(22,1,ry-(Math.floor(j/w)+t));
   if(isFlower)match=Math.max(match,nearStem*.83);
   const motion=match*smooth(d.mode==='leaf'?3:2,d.mode==='leaf'?18:13,diff)*aa;
   const alpha=motion*smooth(2,32,strength);
   for(let c=0;c<3;c++){
    const v=orig.data[a+c],g=fill[b+c], bg=v+(g-v)*motion;
    cleaned.data[a+c]=bg;
    cut.data[a+c]=alpha>.015?clamp(bg+(v-bg)/alpha,0,255):v;
   }
   cleaned.data[a+3]=255;cut.data[a+3]=Math.round(alpha*255);
  }
  bx.putImageData(cleaned,l,t);fx.putImageData(cut,0,0);
  layers.push({image:fg,l,t,w,h,rx,ry,phase:k*1.94,kind:d.mode});
 }
 const overlay=canvas(1,1), cx=overlay.getContext('2d');
 overlay.className='cutout-flora';overlay.setAttribute('aria-hidden','true');host.prepend(overlay);
 let w=1,h=1,scale=1,dx=0,dy=0,dpr=1;
 function resize(vw,vh){
  w=vw;h=vh;dpr=Math.min(devicePixelRatio,1.5);overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);
  scale=Math.max(w/iw,h/ih);dx=(w-iw*scale)*(w<=680?.68:.5);dy=(h-ih*scale)*.54;
 }
 function paint(t,px,py,active){
  cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,w,h);
  for(const p of layers){
   const x=dx+p.rx*scale,y=dy+p.ry*scale;
   const close=Math.exp(-((x-(px+.5)*w)**2+(y-(py+.5)*h)**2)/Math.max(2400,(h*.21)**2))*active;
   const isFlower=p.kind!=='leaf'&&p.kind!=='grass';
   const a=(Math.sin(t*1.18+p.phase)*.132+.04*Math.sin(t*2.21+p.phase*1.73))*(isFlower?.63:p.kind==='leaf'?1:1.16)+close*(isFlower?.13:.20)*Math.sin(t*2.9+p.phase);

   cx.save();cx.translate(x,y);cx.rotate(a);cx.transform(1,0,.045*Math.sin(t*1.34+p.phase),1-.018*Math.sin(t*1.43+p.phase),0,0);
   cx.drawImage(p.image,(p.l-p.rx)*scale,(p.t-p.ry)*scale,p.w*scale,p.h*scale);cx.restore();
  }
 }
 return {backing,resize,paint};
}
