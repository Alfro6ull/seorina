// Dependency-free WebGL photographic experiments.
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>((v%n)+n)%n,mix=(a,b,t)=>a+(b-a)*t;
const vs='attribute vec4 a_clip;attribute vec2 a_uv;varying vec2 v_uv;void main(){gl_Position=a_clip;v_uv=a_uv;}';
const fs=[
'precision mediump float;varying vec2 v_uv;uniform sampler2D u_image;uniform float u_alpha,u_aspect;uniform vec2 u_lens,u_fit;uniform int u_effect;',
'vec3 photo(vec2 p){return texture2D(u_image,clamp((p-.5)*u_fit+.5,.001,.999)).rgb;}',
'float ring(float r,float center,float w){float q=(r-center)/w;return exp(-q*q);}',
'void main(){vec2 uv=v_uv;vec3 col=photo(uv);',
'if(u_effect==1){vec2 d=(uv-u_lens)*vec2(u_aspect,1.);float r=length(d),radius=.29;float mask=1.-smoothstep(radius-.025,radius+.004,r),b=max(0.,1.-r/radius);',
'vec2 bend=d/vec2(u_aspect,1.)*(.42*b+.08*mask),lensUV=uv-bend;',
'vec2 ca=normalize(d+vec2(.00001))/vec2(u_aspect,1.)*(.015*mask*smoothstep(.06,.28,r));',
'vec3 glass=vec3(photo(lensUV+ca).r,photo(lensUV).g,photo(lensUV-ca).b);',
'float sheen=pow(max(0.,dot(normalize(d+vec2(.00001)),normalize(vec2(-.7,-1.)))),8.);',
'col=mix(col,glass,mask)+ring(r,radius,.008)*(.17+.4*sheen)*vec3(.67,.88,1.)+mask*sheen*b*.10;',
'float r2=length((uv-vec2(.78,.18))*vec2(u_aspect,1.));float m2=1.-smoothstep(.105,.12,r2);col=mix(col,photo(vec2(.78,.18)+(uv-vec2(.78,.18))*.72),m2*.85)+ring(r2,.118,.005)*.22;',
'}else if(u_effect==2){float edge=step(uv.y,.047)+step(.953,uv.y),holes=step(.24,fract(uv.x*9.))*step(fract(uv.x*9.),.77);float hy=step(.012,min(uv.y,1.-uv.y))*step(min(uv.y,1.-uv.y),.033);',
'col=mix(col,vec3(.045),min(edge,1.));col=mix(col,vec3(.75,.70,.59),min(edge,1.)*holes*hy*.92);col=mix(col,vec3(.035),1.-step(.012,min(uv.x,1.-uv.x)));}',
'gl_FragColor=vec4(col,u_alpha);}'
].join('\n');
const pvs=[
'attribute vec3 a_target,a_color,a_seed;varying vec3 v_color;varying float v_alpha;uniform vec2 u_scale,u_center,u_mouse;uniform float u_progress,u_time,u_dpr,u_motion;',
'void main(){float t=clamp(u_progress,0.,1.),e=t*t*(3.-2.*t);float phase=a_seed.x*6.28318+u_time*.22*u_motion,radius=.4+a_seed.y*.95;',
'vec2 cloud=vec2(cos(phase),sin(phase))*radius+vec2(a_seed.z-.5,a_seed.y-.5)*.55;',
'vec2 pos=mix(cloud,a_target.xy*u_scale,e),delta=pos+u_center-u_mouse;',
'float repel=(1.-smoothstep(0.,.25,length(delta)))*e*.13*u_motion;pos+=normalize(delta+vec2(.00001))*repel;pos+=vec2(sin(phase*2.1),cos(phase*1.4))*.008*(1.-e)*u_motion;',
'gl_Position=vec4(pos+u_center,0.,1.);gl_PointSize=mix(1.2,2.8,e)*u_dpr*(.75+a_seed.z*.45);v_color=a_color;v_alpha=mix(.48,.95,e);}'
].join('\n');
const pfs='precision mediump float;varying vec3 v_color;varying float v_alpha;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(v_color,(1.-smoothstep(.28,.5,r))*v_alpha);}';
function program(gl,vert,frag,attrs,uniforms){
 const shaders=[[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]].map(([type,src])=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;});
 const p=gl.createProgram();shaders.forEach(s=>gl.attachShader(p,s));gl.linkProgram(p);shaders.forEach(s=>gl.deleteShader(s));if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 return {p,a:Object.fromEntries(attrs.map(k=>[k,gl.getAttribLocation(p,k)])),u:Object.fromEntries(uniforms.map(k=>[k,gl.getUniformLocation(p,k)]))};
}
function hit(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export class MuseRenderer{
 constructor(canvas,{onPick,onError}={}){
  this.canvas=canvas;this.onPick=onPick;this.onError=onError;const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('WebGL unavailable');this.gl=gl;
  this.q=program(gl,vs,fs,['a_clip','a_uv'],['u_image','u_alpha','u_aspect','u_lens','u_fit','u_effect']);
  this.p=program(gl,pvs,pfs,['a_target','a_color','a_seed'],['u_scale','u_center','u_mouse','u_progress','u_time','u_dpr','u_motion']);
  this.mesh=gl.createBuffer();this.points=gl.createBuffer();this.cache=new Map();this.images=[];this.index=0;this.mode='infinite';this.pointer={x:0,y:0,active:false};this.hit=[];this.pointIndex=-1;this.progress=1;this.pending=null;this.last=0;this.start=performance.now();this.reset();
  const m=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=m.matches;m.addEventListener?.('change',e=>this.reduced=e.matches);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);this.bind();this.raf=requestAnimationFrame(t=>this.frame(t));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.destroyed=true;cancelAnimationFrame(this.raf);this.onError?.('Graphics context lost; reload to restore.');});
 }
 setCollection(images,index=0){for(const t of this.cache.values())this.gl.deleteTexture(t);this.cache.clear();this.images=images;this.index=clamp(index,0,Math.max(0,images.length-1));this.pointIndex=-1;this.pending=null;this.progress=this.target=1;if(this.mode==='particles'&&images.length)this.buildPoints(this.index);}
 setMode(mode){this.mode=mode;this.reset();if(mode==='particles'&&this.images.length){this.buildPoints(this.index);this.progress=this.reduced?1:.04;}}
 setIndex(i){if(!this.images.length)return;this.index=mod(i,this.images.length);if(this.mode==='particles'){if(this.pointIndex===this.index){this.pending=null;this.target=1;}else if(this.reduced){this.pending=null;this.buildPoints(this.index);this.progress=this.target=1;}else{this.pending=this.index;this.target=0;}}else if(this.mode==='infinite'){this.travel=this.travelTo=-.72;}}
 reset(){this.travel=this.travelTo=-.72;this.pan=[0,0];this.panTo=[0,0];this.phase=this.phaseTo=0;this.pointer.active=false;this.target=1;this.pending=null;}
 action(){if(this.mode==='particles'){if(this.pending!==null){this.buildPoints(this.pending);this.pending=null;}this.target=this.target===1?0:1;return this.target===1?'Dissolve':'Reassemble';}this.reset();return 'Reset view';}
 bind(){
  const c=this.canvas;let down=null;const pos=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2];};
  c.addEventListener('pointerdown',e=>{if(e.button!==0)return;const [x,y]=pos(e);down={id:e.pointerId,x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};this.pointer={x,y,active:true};c.setPointerCapture(e.pointerId);c.classList.add('dragging');});
  c.addEventListener('pointermove',e=>{const [x,y]=pos(e);this.pointer={x,y,active:true};if(!down||down.id!==e.pointerId)return;const dx=e.clientX-down.px,dy=e.clientY-down.py;down.px=e.clientX;down.py=e.clientY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)down.moved=true;if(this.mode==='infinite'){this.panTo[0]=clamp(this.panTo[0]+dx*.012,-7,7);this.panTo[1]=clamp(this.panTo[1]-dy*.012,-5,5);}if(this.mode==='ribbon')this.phaseTo+=dx*.008;});
  const end=e=>{if(!down||down.id!==e.pointerId)return;if(!down.moved&&e.type==='pointerup'&&['infinite','ribbon'].includes(this.mode)){const [x,y]=pos(e),h=[...this.hit].reverse().find(h=>hit(x,y,h.poly));if(h)this.onPick?.(h.index);}down=null;c.classList.remove('dragging');if(e.pointerType!=='mouse')this.pointer.active=false;};
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('pointerleave',()=>{if(!down)this.pointer.active=false;});
  c.addEventListener('wheel',e=>{if(!['infinite','ribbon'].includes(this.mode))return;e.preventDefault();const d=clamp(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?300:1),-200,200);if(this.mode==='infinite')this.travelTo+=d*.011;else this.phaseTo+=d*.003;},{passive:false});
 }
 resize(){const c=this.canvas;this.dpr=Math.min(window.devicePixelRatio||1,1.8);const w=Math.max(1,Math.round(c.clientWidth*this.dpr)),h=Math.max(1,Math.round(c.clientHeight*this.dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}this.aspect=w/h;this.mobile=c.clientWidth<=760;this.gl.viewport(0,0,w,h);}
 texture(item){if(this.cache.has(item))return this.cache.get(item);const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const max=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),1600),s=Math.min(1,max/Math.max(item.width,item.height));let src=item.image;if(s<1){src=document.createElement('canvas');src.width=Math.max(1,Math.round(item.width*s));src.height=Math.max(1,Math.round(item.height*s));src.getContext('2d').drawImage(item.image,0,0,src.width,src.height);}gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);this.cache.set(item,t);if(this.cache.size>28){const first=this.cache.keys().next().value;gl.deleteTexture(this.cache.get(first));this.cache.delete(first);}return t;}
 project(x,y,z){const f=this.mobile?2.05:2.7,cx=this.mobile?0:.21,cy=this.mobile?.40:.13;return [x*f/this.aspect+cx*z,y*f+cy*z,0,z];}
 fit(item,ratio){const a=item.width/item.height;return a>ratio?[ratio/a,1]:[1,a/ratio];}
 attrib(p,name,size,stride,offset){const gl=this.gl,i=p.a[name];if(i<0)return;gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,stride,offset);}
 use(p){const gl=this.gl;for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.useProgram(p.p);}
 draw(item,verts,{effect=0,alpha=1,fit=[1,1],lens=[.5,.5],ratio=item.width/item.height}={}){const gl=this.gl,q=this.q;this.use(q);gl.bindBuffer(gl.ARRAY_BUFFER,this.mesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);this.attrib(q,'a_clip',4,24,0);this.attrib(q,'a_uv',2,24,16);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture(item));gl.uniform1i(q.u.u_image,0);gl.uniform1i(q.u.u_effect,effect);gl.uniform1f(q.u.u_alpha,alpha);gl.uniform1f(q.u.u_aspect,ratio);gl.uniform2fv(q.u.u_lens,lens);gl.uniform2fv(q.u.u_fit,fit);gl.drawArrays(gl.TRIANGLES,0,verts.length/6);}
 quad(p){const uv=[[0,0],[1,0],[1,1],[0,1]];return [0,1,2,0,2,3].flatMap(i=>[...p[i],...uv[i]]);}
 addHit(p,index){this.hit.push({poly:p.map(v=>[v[0]/v[3],v[1]/v[3]]),index});}
 plane(cx,cy,z,w,h,rot=0){return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>this.project(cx+x*w*.5*Math.cos(rot),cy+y*h*.5,z+x*w*.5*Math.sin(rot)));}
 infinite(t){const n=Math.max(24,Math.min(28,this.images.length)),depth=n*1.08,items=[];for(let i=0;i<n;i++){const index=mod(this.index+i,this.images.length),item=this.images[index],a=i*2.399963,z=3.2+mod(i*1.08-this.travel,depth),radius=i%5===0?.12:2.8+(i%3)*.42,idle=this.reduced?0:Math.sin(t*.37+i*.63)*.10,x=Math.cos(a)*radius+this.pan[0]+idle,y=Math.sin(a)*radius*.72+this.pan[1],h=2.1+(i%3)*.19,ratio=clamp(item.width/item.height,.55,1.65);items.push({index,item,z,ratio,p:this.plane(x,y,z,h*ratio,h,Math.sin(a)*.23)});}items.sort((a,b)=>b.z-a.z);for(const o of items){this.draw(o.item,this.quad(o.p),{alpha:clamp((o.z-3.2)/.6,0,1)*clamp((3.2+depth-o.z)/1.1,0,1)*clamp(1-(o.z-3.2)/depth*.64,.25,1),fit:this.fit(o.item,o.ratio)});this.addHit(o.p,o.index);}}
 rect(item){const ratio=item.width/item.height,cx=this.mobile?0:.22,cy=this.mobile?.39:.10;let hy=this.mobile?.43:.79,hx=hy*ratio/this.aspect,maxX=this.mobile?.91:.57;if(hx>maxX){hx=maxX;hy=hx*this.aspect/ratio;}return{cx,cy,hx,hy,ratio};}
 prism(t){const item=this.images[this.index],{cx,cy,hx,hy,ratio}=this.rect(item),p=[[cx-hx,cy+hy,0,1],[cx+hx,cy+hy,0,1],[cx+hx,cy-hy,0,1],[cx-hx,cy-hy,0,1]];const lens=this.pointer.active?[clamp((this.pointer.x-cx)/hx*.5+.5,-.2,1.2),clamp((cy-this.pointer.y)/hy*.5+.5,-.2,1.2)]:[.49+(this.reduced?0:Math.sin(t*.55)*.18),.53+(this.reduced?0:Math.cos(t*.48)*.12)];this.draw(item,this.quad(p),{effect:1,ratio,lens});}
 ribbon(t){const count=Math.max(12,Math.min(16,this.images.length)),step=TAU/count,R=3.35,tiles=[],phase=this.phase+(this.reduced?0:Math.sin(t*.19)*.07),height=this.mobile?2.25:2.55,ratio=R*step/height;
 const pos=(a,v)=>this.project(R*Math.sin(a),Math.sin(a)*.85+Math.cos(a+phase)*.18+(1-2*v)*height*.5,6.1-R*Math.cos(a));
 for(let i=0;i<count;i++){const index=mod(this.index+i,this.images.length),item=this.images[index],a=i*step-phase,z=6.1-R*Math.cos(a+step/2),verts=[],steps=14;for(let j=0;j<steps;j++){const u=j/steps,v=(j+1)/steps,p0=[...pos(a+u*step,0),u,0],p1=[...pos(a+v*step,0),v,0],p2=[...pos(a+v*step,1),v,1],p3=[...pos(a+u*step,1),u,1];verts.push(...p0,...p1,...p2,...p0,...p2,...p3);}tiles.push({item,index,z,verts,p:[pos(a,0),pos(a+step,0),pos(a+step,1),pos(a,1)]});}
 tiles.sort((a,b)=>b.z-a.z);for(const q of tiles){this.draw(q.item,q.verts,{effect:2,fit:this.fit(q.item,ratio),ratio,alpha:clamp(1-(q.z-2.75)*.068,.55,1)});this.addHit(q.p,q.index);}}
 buildPoints(index){const item=this.images[index];if(!item)return;const c=document.createElement('canvas'),ratio=item.width/item.height,s=Math.sqrt(32000/ratio);c.width=clamp(Math.round(s*ratio),48,240);c.height=clamp(Math.round(s),48,240);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(item.image,0,0,c.width,c.height);const pix=ctx.getImageData(0,0,c.width,c.height).data,arr=[];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const k=(y*c.width+x)*4;if(pix[k+3]<30)continue;arr.push(x/(c.width-1)*2-1,1-y/(c.height-1)*2,0,pix[k]/255,pix[k+1]/255,pix[k+2]/255,Math.random(),Math.random(),Math.random());}const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.points);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);this.pointCount=arr.length/9;this.pointIndex=index;}
 particles(t){if(this.pointIndex<0)this.buildPoints(this.index);if(this.pending!==null&&this.progress<.045){const i=this.pending;this.pending=null;this.buildPoints(i);this.target=1;}const item=this.images[this.pointIndex];if(!item)return;const r=this.rect(item),gl=this.gl,p=this.p;this.use(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.points);['a_target','a_color','a_seed'].forEach((n,i)=>this.attrib(p,n,3,36,i*12));gl.uniform2f(p.u.u_scale,r.hx,r.hy);gl.uniform2f(p.u.u_center,r.cx,r.cy);gl.uniform2f(p.u.u_mouse,this.pointer.active?this.pointer.x:10,this.pointer.active?this.pointer.y:10);gl.uniform1f(p.u.u_progress,this.progress);gl.uniform1f(p.u.u_time,t);gl.uniform1f(p.u.u_dpr,this.dpr);gl.uniform1f(p.u.u_motion,this.reduced?0:1);gl.drawArrays(gl.POINTS,0,this.pointCount||0);}
 frame(now){if(this.destroyed)return;const dt=Math.min(.045,(now-(this.last||now))/1000),t=(now-this.start)/1000;this.last=now;const ease=this.reduced?1:1-Math.exp(-dt*8),ep=this.reduced?1:1-Math.exp(-dt*5.2);this.travel=mix(this.travel,this.travelTo,ease);this.phase=mix(this.phase,this.phaseTo,ease);this.pan=this.pan.map((v,i)=>mix(v,this.panTo[i],ease));this.progress=mix(this.progress,this.target,ep);try{this.resize();const gl=this.gl,bg={infinite:[.065,.075,.067],prism:[.055,.076,.088],ribbon:[.087,.065,.052],particles:[.042,.053,.079]}[this.mode];gl.clearColor(...bg,1);gl.clear(gl.COLOR_BUFFER_BIT);this.hit=[];if(this.images.length)this[this.mode](t);this.raf=requestAnimationFrame(n=>this.frame(n));}catch(e){this.destroyed=true;this.onError?.('Graphics error: '+e.message);}}
}
