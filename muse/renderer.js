import * as THREE from './vendor/three.module.js';
import { ParticlesScene } from './scenes/particles.js';

/** One particle sculpture, driven by the photo collection. */
export class MuseRenderer {
  constructor(canvas, { onError = () => {} } = {}) {
    Object.assign(this, { canvas, onError, input: {x:0,y:0,active:false,down:false}, elapsed:0, lastTime:0, settleUntil:0, frames:0 });
    this.abort = new AbortController();
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.motion = !this.preference.matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x111110);
    this.space = new ParticlesScene({reducedMotion:!this.motion});
    this.canvas.dataset.scene = 'particles';
    this.canvas.dataset.ready = 'true';
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.bind();
    this.resize();
  }
  setCollection(items,index=0) {
    this.space?.setCollection(items,index);
    this.invalidate(1800);
  }
  setIndex(index){this.space?.setIndex(index);this.invalidate(2200);}
  action(){const label=this.space?.action();this.invalidate(3000);return label;}
  setPaused(value){this.paused=value;if(value){cancelAnimationFrame(this.raf);this.raf=0;}else{this.lastTime=0;this.invalidate();}}
  setMotion(value){this.motion=value;if(this.space)this.space.reducedMotion=!value;this.invalidate(1600);}
  resize(){
    const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,this.width<650?1.35:1.75));
    this.renderer.setSize(this.width,this.height,false);this.space?.resize(this.width,this.height);this.invalidate();
  }
  invalidate(duration=900){this.settleUntil=Math.max(this.settleUntil,performance.now()+duration);if(!this.raf&&!this.paused&&!document.hidden)this.raf=requestAnimationFrame(time=>this.tick(time));}
  tick(time){
    this.raf=0;if(this.paused||document.hidden||!this.space)return;
    const dt=Math.min(.04,Math.max(.001,(time-(this.lastTime||time-16))/1000));this.lastTime=time;if(this.motion)this.elapsed+=dt;
    try{this.space.update(dt,this.elapsed,this.input);this.renderer.render(this.space.scene,this.space.camera);this.canvas.dataset.frames=String(++this.frames);}
    catch(error){this.onError(error);return;}
    if(this.motion||this.input.down||time<this.settleUntil)this.raf=requestAnimationFrame(t=>this.tick(t));
  }
  bind(){
    const options={signal:this.abort.signal};
    const position=event=>{const r=this.canvas.getBoundingClientRect();this.input.x=(event.clientX-r.left)/r.width*2-1;this.input.y=1-(event.clientY-r.top)/r.height*2;};
    this.canvas.addEventListener('pointerdown',event=>{position(event);this.input.down=this.input.active=true;this.pointer={id:event.pointerId,x:event.clientX,y:event.clientY};this.canvas.setPointerCapture(event.pointerId);this.canvas.classList.add('is-dragging');this.invalidate();},options);
    this.canvas.addEventListener('pointermove',event=>{position(event);this.input.active=true;if(this.pointer?.id===event.pointerId){const dx=event.clientX-this.pointer.x,dy=event.clientY-this.pointer.y;this.space?.drag(dx/this.width,dy/this.height);this.pointer.x=event.clientX;this.pointer.y=event.clientY;}this.invalidate();},options);
    const end=event=>{if(this.pointer?.id!==event.pointerId)return;this.pointer=null;this.input.down=false;this.canvas.classList.remove('is-dragging');this.invalidate();};
    this.canvas.addEventListener('pointerup',end,options);this.canvas.addEventListener('pointercancel',end,options);
    this.canvas.addEventListener('pointerleave',()=>{this.input.active=false;this.invalidate();},options);
    this.canvas.addEventListener('wheel',event=>{event.preventDefault();this.space?.wheel?.(THREE.MathUtils.clamp(event.deltaY*(event.deltaMode===1?16:1),-100,100));this.invalidate(1500);},{...options,passive:false});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;}else{this.lastTime=0;this.invalidate();}},options);
    this.preference.addEventListener('change',event=>this.setMotion(!event.matches),options);
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.setPaused(true);this.onError(new Error('画面暂时中断，请刷新后重新进入。'));},options);
  }
  dispose(){cancelAnimationFrame(this.raf);this.abort.abort();this.resizeObserver.disconnect();this.space?.dispose();this.renderer.dispose();}
}
