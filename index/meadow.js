const frame=document.querySelector('#frame'),canvas=document.querySelector('#field'),ctx=canvas.getContext('2d',{alpha:false}),mq=matchMedia('(prefers-reduced-motion: reduce)');
if (ctx) {
const plate=document.createElement('canvas'),pc=plate.getContext('2d');
const palette=['#648643','#749344','#829f48','#8eaa4c','#9bb551','#aabe5d','#b6c869','#c2d077','#d6dc89','#e8e5a4'];
const chars=['/','∕','|',';','i','v','~','\\'], sprites=[];
let W,H,stems=[],px=-500,py=-500,power=0,start=performance.now(),raf=0,last=0;
const max=Math.max,min=Math.min,sin=Math.sin,cos=Math.cos;
const unit=x=>max(0,min(x,1));
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
function ridge(x,y){
 const phase=13*x+23*y+2.0*sin(5*x-5*y)+.7*cos(7*y+4*x);
 const clusters=.65+.21*sin(x*24+y*10)+.14*cos(x*37-y*25);
 const fine=.075*sin(x*71+y*37+1.5*cos(y*39-x*21));
 return [phase,unit(.19+.68*(.5+.5*sin(phase))**1.6*clusters+fine)];
}
function measure(){
 W=frame.clientWidth;H=frame.clientHeight;const D=min(devicePixelRatio||1,1.65);
 canvas.width=Math.round(W*D);canvas.height=Math.round(H*D);ctx.setTransform(D,0,0,D,0,0);
 plate.width=280;plate.height=176;
 const dat=pc.createImageData(plate.width,plate.height),rand=rng(1931);
 for(let y=0;y<plate.height;y++)for(let x=0;x<plate.width;x++){
  const a=x/(plate.width-1),b=y/(plate.height-1),[,shade]=ridge(a,b),n=(rand()-.5)*9;
  const i=(y*plate.width+x)*4;
  dat.data[i]=73+shade*124+n;dat.data[i+1]=101+shade*99+n;dat.data[i+2]=45+shade*43+n;dat.data[i+3]=255;
 }
 pc.putImageData(dat,0,0);
 const r=rng(4931),step=Math.sqrt(W*H/75000);
 stems=[];
 for(let y=-step;y<H+21;y+=step)for(let x=-step;x<W+16;x+=step){
  const xx=x+(r()-.5)*step*1.8,yy=y+(r()-.5)*step*1.8,a=xx/W,b=yy/H,[phase,shade]=ridge(a,b),grain=r();
  const mobile=W<650, clumpX=mobile?.62:.79, clumpY=mobile?.735:.653;
  const tuft=Math.exp(-(((a-clumpX)/.093)**2+((b-clumpY-.016)/.049)**2)) * (.76+.24*sin(phase*1.3));
  const extra=tuft*(7+grain*24)*(mobile?.84:1);
  stems.push([xx,yy,(3.1+r()*7.5)*(.73+b*.44)*(1+shade*.38)+extra,phase,shade,(r()-.5)*6,(r()*chars.length)|0,grain,tuft]);
 }
 for(let c=0;c<palette.length;c++)if(!sprites[c]){
  sprites[c]=chars.map(g=>{const s=document.createElement('canvas');s.width=s.height=18;const p=s.getContext('2d');p.font='13px ui-monospace, monospace';p.textAlign='center';p.textBaseline='middle';p.fillStyle=palette[c];p.translate(9,9);p.rotate(.35);p.fillText(g,0,0);return s});
 }
 draw(mq.matches?0:((pausedAt??performance.now())-start)/1000);
}
// A loop with eased holds: run into high grass, sniff, look up, bound out and circle back.
const beats=[
 // time, x, y, pace, sniff, look
 [0,.03,.48,.25,0,.08],[1.5,.24,.31,1,0,0],[2.9,.51,.26,.82,0,0],
 [3.75,.58,.29,.06,.15,0],[4.35,.59,.30,0,1,0],[5.65,.607,.31,0,.95,0],
 [6.22,.615,.305,0,0,1],[6.81,.617,.30,0,0,1],[7.24,.65,.288,.78,0,.1],
 [8.26,.86,.40,.88,0,0],[9.35,.98,.68,.45,0,0],[10.2,.92,.85,.74,0,0],
 [11.6,.68,.91,.93,0,0],[13.1,.36,.84,.93,0,0],[14.5,.11,.66,.66,0,0],[15.8,.03,.48,.25,0,.08]
];
function julie(t){
 const k=t%15.8;let i=0;while(i<beats.length-2&&k>beats[i+1][0])i++;
 const a=beats[i],b=beats[i+1],f=unit((k-a[0])/(b[0]-a[0])),s=f*f*(3-2*f),mix=(x,y)=>x+(y-x)*s;
 const p=unit((k-7.24)/.84),jump=sin(p*Math.PI)*sin(p*Math.PI),sign=k>=9.35&&k<15.5?-1:1;
 return {x:mix(a[1],b[1]),y:mix(a[2],b[2]),pace:mix(a[3],b[3]),sniff:mix(a[4],b[4]),look:mix(a[5],b[5]),jump,sign};
}
function draw(t){
 ctx.globalAlpha=1;ctx.drawImage(plate,0,0,W,H);
 const mobile=W<650,q=julie(t);
 const dogX=W*((mobile?.12:.53)+(mobile?.83:.45)*q.x),dogY=H*((mobile?.69:.626)+(mobile?.146:.082)*q.y);
 const stride=t*21, size=(mobile?.78:1)*(1+q.y*.11),dogTop=dogY-(9.3+(1-cos(stride*2))*q.pace*.9+q.jump*17)*size;
 const layers=[palette.map(()=>new Path2D()),palette.map(()=>new Path2D())],glyphs=[[],[]],high=palette.map(()=>new Path2D());
 const tangent=px>-100&&power>.02;
 for(const [x,y,len,phase,shade,j,g,r,tuft] of stems){
   const crest=.5+.5*sin(phase*.89-t*2.25+.6*sin(y/H*21-x/W*9+t*.62));
   const wind=crest**3;
   const local=tangent?power*Math.exp(-((x-px)**2+(y-py)**2)/6600):0;
   let lean=(shade-.41)*7+wind*(8+tuft*5)+local*11+j;
   const ux=x-dogX,uy=y-dogY;
   if(Math.abs(ux)<37&&Math.abs(uy)<26&&q.pace>.08){
     const brush=(1-Math.abs(ux)/37)*(1-Math.abs(uy)/26);
     lean+=brush*q.pace*(ux<0?-1:1)*(4+tuft*10)*(1-q.jump);
   }
   const c=min(9,max(0,(shade*8.6+wind*1.45+r*2.15)|0));
   const tipX=x+lean,tipY=y-len+wind*2;
   const fore=y>dogY+1?1:0,p=layers[fore][c];
   p.moveTo(x,y);p.quadraticCurveTo(x+lean*.14,y-len*.58,tipX,tipY);
   if(fore&&tuft>.34&&r>.64){const h=high[max(0,c-1)];h.moveTo(x,y);h.quadraticCurveTo(x+lean*.14,y-len*.58,tipX,tipY)}
   if(r>.929&&shade>.30)glyphs[fore].push([c,g,tipX,tipY]);
 }
 function grass(n){
  ctx.lineWidth=.67;ctx.globalAlpha=.68;
  for(let i=0;i<palette.length;i++){ctx.strokeStyle=palette[i];ctx.stroke(layers[n][i])}
  if(n===1){ctx.lineWidth=.98;ctx.globalAlpha=.87;for(let i=0;i<palette.length;i++){ctx.strokeStyle=palette[i];ctx.stroke(high[i])}}
  ctx.globalAlpha=.75;
  for(const [c,g,x,y] of glyphs[n])ctx.drawImage(sprites[c][g],x-3.7,y-4.2,7.4,7.4);
 }
 grass(0);
 // Julie stays in the field: her feet move behind the nearest grass.
 const dir=q.sign;
 ctx.globalAlpha=1;
 ctx.fillStyle='rgba(34,52,25,'+(.50-q.jump*.32)+')';ctx.beginPath();ctx.ellipse(dogX,dogY+1.1,11*size,2.6*size,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(dogX,dogTop);ctx.scale(dir*size,size);
 ctx.lineCap='round';ctx.lineJoin='round';
 function leg(x,phase,color){
   const kick=sin(stride+phase)*q.pace+q.jump*(x>0?.8:-.7),lift=max(0,cos(stride+phase))*q.pace+q.jump*.56;
   ctx.strokeStyle=color;ctx.lineWidth=1.65;ctx.beginPath();ctx.moveTo(x,1);
   ctx.quadraticCurveTo(x-1.5+kick*2,5,x+kick*4.2,9.1-lift*3.8);ctx.stroke();
 }
 leg(5,.72,'#c4c0a7');leg(-5,-2.42,'#c4c0a7');
 ctx.save();ctx.translate(-7.5,-1.2);ctx.rotate((.11+.11*q.look)*sin(t*10));
 ctx.fillStyle='#efebd8';
 ctx.fill(new Path2D('M 1 1 Q -3 0 -5 -3 C -8 -8 -5 -12 -1 -10 Q 1 -9 1 -6 Q -1 -8 -2.5 -7 Q -3.1 -5 -1.5 -3 L 2 -2 Z'));
 ctx.restore();
 leg(5,3.86,'#eae7d4');leg(-5,-.85,'#eae7d4');
 const coat=ctx.createLinearGradient(0,-6,0,6);coat.addColorStop(0,'#fffdf0');coat.addColorStop(.58,'#f5f1e1');coat.addColorStop(1,'#cbc8ae');
 ctx.fillStyle=coat;
 ctx.fill(new Path2D('M -8.3 -3.4 C -6.2 -5.4 -1 -4.6 2.2 -4.8 Q 5.2 -5 7.6 -7.3 L 9.4 -4.7 Q 9.7 -.9 6.6 3.7 Q 5.7 4.7 3.3 3.6 Q -.1 2.8 -2.8 3.6 C -6.3 5 -9.4 2.7 -9.3 -.6 Z'));
 ctx.save();ctx.translate(8.1-q.sniff*.6,-5.7+q.sniff*6.6-q.look*1.4);ctx.rotate(.06*sin(stride)*q.pace+q.sniff*(.67+.09*sin(t*13))-q.look*.26);
 ctx.fillStyle='#d2ccaf';ctx.fill(new Path2D('M .4 -1.6 Q .8 -5.8 2.4 -6.8 Q 3.6 -7 4.1 -2.9 L 3.4 -.7 Z'));
 ctx.fillStyle='#fbf7e8';
 ctx.fill(new Path2D('M -3 1 Q -4.8 -.7 -3 -3.5 L -3.4 -7.4 Q -3.35 -8.55 -2.45 -8.05 L .35 -4.55 Q 2.25 -4.45 3.4 -3.25 Q 4.15 -2.4 5.5 -1.75 L 7.25 -1.2 Q 8.55 -.65 7.5 .85 Q 6.7 2.25 4.1 2.3 Q .9 3.6 -2.2 2.95 Z'));
 ctx.fillStyle='#d8c4ad';ctx.fill(new Path2D('M -2.65 -6.9 L -.85 -4.75 L -2.55 -4.02 Z'));
 ctx.fillStyle='#433c33';ctx.beginPath();ctx.ellipse(7.2,-.43,.95,.75,.18,0,Math.PI*2);ctx.ellipse(2.45,-1.84,.65,.43,-.25,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#534839';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(6.8,1.02);ctx.quadraticCurveTo(5.3,1.5,3.5,.85);ctx.stroke();
 ctx.restore();
 ctx.restore();
 grass(1);ctx.globalAlpha=1;
}
let inView=true, pausedAt=null;
function shouldPlay(){return inView&&!document.hidden&&!mq.matches}
function loop(ms){if(!shouldPlay()){raf=0;return}if(ms-last>=32){draw((ms-start)/1000);power*=.88;last=ms}raf=requestAnimationFrame(loop)}
function motion(){
 cancelAnimationFrame(raf);raf=0;
 const now=performance.now();
 if(mq.matches){power=0;start=now;pausedAt=now;draw(0);return}
 if(!shouldPlay()){pausedAt??=now;return}
 if(pausedAt!==null){start+=now-pausedAt;pausedAt=null}
 raf=requestAnimationFrame(loop);
}
if ('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{
 inView=entry.isIntersecting;motion();
}).observe(frame);
document.addEventListener('visibilitychange',motion);
new ResizeObserver(measure).observe(frame);
frame.addEventListener('pointermove',e=>{if(mq.matches)return;const box=frame.getBoundingClientRect();px=e.clientX-box.left;py=e.clientY-box.top;power=1});
mq.addEventListener('change',motion);measure();motion();
}
