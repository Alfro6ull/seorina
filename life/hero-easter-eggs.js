/*
 * A separate visiting character for the year rail.
 * Load seorina-character.js and seorina-hobby-figures.js first.
 * This controller never reads or changes the annual character's pose.
 *
 * const guest = SeorinaEasterEggs.attach(stage, {
 *   reduce: matchMedia('(prefers-reduced-motion: reduce)'),
 *   scenes: [{ mode: 'dog', label: '遛狗' }], // optional; deduplicated by mode
 *   onStart(scene) { status.textContent = scene.label; }, // once per visit
 *   onEnd() { status.textContent = ''; }
 * });
 * guest.play('bike'); // or play() for the next shuffled scene
 * guest.stop();       // dismiss now; schedule a fresh 20–35 second wait
 * guest.pause();      // dismiss and stop scheduling
 * guest.resume();     // resume with a fresh wait, without catching up
 * guest.destroy();    // remove the canvas, observers, listeners and clocks
 * With reduced motion, manual play shows a still pose for 5 seconds; no RAF
 * or automatic visits run. Hidden/offscreen stages never show a new visitor.
 */
(function (root) {
  'use strict';
  const DEFAULT_SCENES = Object.freeze([
    {mode:'dog',label:'遛狗'}, {mode:'boxing',label:'拳击'},
    {mode:'bike',label:'骑车'}, {mode:'skate',label:'滑板'},
    {mode:'wave',label:'挥手'}, {mode:'script',label:'读剧本'},
    {mode:'bow',label:'鞠躬'}, {mode:'guitar',label:'弹吉他'},
    {mode:'listen',label:'听歌'}
  ].map(Object.freeze));
  const DURATION = 4200;
  const ENTER = 900;
  const EXIT = 900;
  const HOLD = DURATION - ENTER - EXIT;
  const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b, n));
  const ease = t => t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const mix = (a,b,t) => a+(b-a)*t;
  const canonical = mode => mode === 'cycling' ? 'bike' : mode;

  function attach(stage, options={}) {
    const core = root.SeorinaCharacter;
    const hobbies = root.SeorinaHobbyCharacter;
    if (!stage || !stage.ownerDocument || !core || !core.draw) return null;
    const doc = stage.ownerDocument;
    const win = doc.defaultView || root;
    const reduce = options.reduce || win.matchMedia('(prefers-reduced-motion: reduce)');
    const coreLabels = new Map(core.modes.map(item => [item.id, item.label]));
    const hobbyLabels = hobbies && hobbies.modes || {};
    const supported = mode => coreLabels.has(mode) || Object.prototype.hasOwnProperty.call(hobbyLabels,mode);
    const scenes = [];
    const seen = new Set();
    for (const entry of (Array.isArray(options.scenes) && options.scenes.length ? options.scenes : DEFAULT_SCENES)) {
      if (!entry || typeof entry.mode !== 'string') continue;
      const mode = canonical(entry.mode);
      if (!supported(mode) || seen.has(mode)) continue;
      seen.add(mode);
      scenes.push(Object.freeze({mode,label:typeof entry.label === 'string' && entry.label ? entry.label : coreLabels.get(mode) || hobbyLabels[mode]}));
    }
    if (!scenes.length) return null;

    const canvas = doc.createElement('canvas');
    canvas.className = 'hero-guest-canvas';
    canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style, {position:'absolute',left:'0',top:'0',pointerEvents:'none',zIndex:'3',display:'block'});
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const originalPosition = stage.style.position;
    const changedPosition = win.getComputedStyle(stage).position === 'static';
    if (changedPosition) stage.style.position = 'relative';
    stage.appendChild(canvas);

    let destroyed=false, paused=false, inside=false, allowedBefore=false, scheduledBefore=false;
    let timer=null, staticTimer=null, frame=null, visit=null, geometry=null, bag=[], lastMode='';
    let resizeObserver=null, intersectionObserver=null;

    function reduced() { return typeof reduce === 'boolean' ? reduce : Boolean(reduce && reduce.matches); }
    function viewportVisible() {
      const box=stage.getBoundingClientRect();
      return box.width>0 && box.height>0 && box.bottom>0 && box.right>0 && box.top<(win.innerHeight || doc.documentElement.clientHeight) && box.left<(win.innerWidth || doc.documentElement.clientWidth);
    }
    function available() {
      return !destroyed && !paused && !doc.hidden && inside && stage.isConnected !== false && geometry && geometry.width>0 && geometry.height>0;
    }
    function allowed() { return available() && !reduced(); }
    function cancelTimer() {
      if (timer !== null) win.clearTimeout(timer);
      timer=null;
    }
    function cancelFrame() {
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame=null;
    }
    function clear() {
      if (geometry) ctx.clearRect(0,0,geometry.width,geometry.height);
    }
    function announce(name, value) {
      if (typeof options[name] !== 'function') return;
      try { options[name](value); }
      catch (error) { if (win.console) win.console.error('Seorina Easter egg callback failed:',error); }
    }
    function end(reason) {
      cancelFrame();
      if (staticTimer !== null) win.clearTimeout(staticTimer);
      staticTimer=null;
      const ended=visit;
      visit=null;
      clear();
      if (ended) announce('onEnd',{...ended.scene,reason});
    }
    function delay(first=false) {
      if (!allowed() || timer !== null || visit) return;
      scheduledBefore=true;
      timer=win.setTimeout(() => {
        timer=null;
        if (!playInternal(undefined,'auto')) delay(false);
      }, first ? 4000+Math.random()*2000 : 20000+Math.random()*15000);
    }
    function reconcile() {
      if (!available()) {
        cancelTimer();
        end('suspended');
        allowedBefore=false;
        return;
      }
      if (reduced()) {
        cancelTimer();
        if (visit && !visit.static) end('reduced-motion');
        allowedBefore=false;
        return;
      }
      if (!allowedBefore) {
        allowedBefore=true;
        delay(!scheduledBefore);
      } else delay(false);
    }

    function measure() {
      if (destroyed) return;
      const box=stage.getBoundingClientRect();
      const css=win.getComputedStyle(stage);
      const avatar=stage.querySelector('.year-avatar');
      const actor=avatar && avatar.getBoundingClientRect();
      const stageTop=parseFloat(css.getPropertyValue('--stage-top'));
      const lineY=parseFloat(css.getPropertyValue('--line-y'));
      let ground=Number.isFinite(stageTop) && Number.isFinite(lineY) ? stageTop+lineY : actor ? actor.top-box.top+actor.height*53/56 : 83;
      if (!Number.isFinite(ground)) ground=83;
      const figureHeight=box.width<600 ? 44 : 60;
      const topPad=Math.max(0,Math.ceil(figureHeight*1.22+6-ground));
      const width=Math.max(0,box.width);
      const height=Math.max(0,box.height+topPad,ground+topPad+5);
      const ratio=Math.max(1,Math.min(Number(win.devicePixelRatio)||1,2));
      const center=actor ? actor.left-box.left+actor.width/2 : width/2;
      geometry={width,height,ground:ground+topPad,center,figureHeight,mainHalf:actor ? clamp(actor.width*.34,24,40) : 30,ratio};
      canvas.style.top=-topPad+'px';
      canvas.style.width=width+'px';
      canvas.style.height=height+'px';
      canvas.width=Math.max(1,Math.round(width*ratio));
      canvas.height=Math.max(1,Math.round(height*ratio));
      ctx.setTransform(ratio,0,0,ratio,0,0);
      if (!intersectionObserver) inside=viewportVisible();
      if (visit && !placement(visit.scene.mode,visit.side)) end('resized');
      if (visit && visit.static) paintStatic();
      else if (visit && frame === null) frame=win.requestAnimationFrame(tick);
      reconcile();
    }

    function placement(mode, preferredSide) {
      if (!geometry) return null;
      const g=geometry;
      const reach=mode==='dog' ? .85 : mode==='bike' ? .54 : .58;
      const sides=preferredSide ? [preferredSide] : Math.random()<.5 ? [-1,1] : [1,-1];
      for (const side of sides) {
        const h=g.figureHeight;
        const edge=10+Math.max(.85,reach)*h;
        const start=side<0 ? edge : g.width-edge;
        const target=g.center+side*(g.mainHalf+reach*h+12);
        if (side*(start-target)>=8) return {side,start,target,height:h};
      }
      return null;
    }
    function nextScene() {
      if (!bag.length) {
        bag=scenes.slice();
        for(let i=bag.length-1;i>0;i--) {
          const j=Math.floor(Math.random()*(i+1));
          [bag[i],bag[j]]=[bag[j],bag[i]];
        }
        if (bag.length>1 && bag[bag.length-1].mode===lastMode) [bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
      }
      return bag.pop();
    }
    function resolveScene(mode) {
      if (mode === undefined || mode === null || mode === '') return nextScene();
      mode=canonical(mode);
      if (typeof mode !== 'string' || !supported(mode)) return null;
      return scenes.find(item=>item.mode===mode) || {mode,label:coreLabels.get(mode)||hobbyLabels[mode]};
    }
    function playInternal(mode, source) {
      if (source==='auto' ? !allowed() : !available()) return false;
      const scene=resolveScene(mode);
      if (!scene) return false;
      const spot=placement(scene.mode);
      if (!spot) return false;
      cancelTimer();
      end('replaced');
      lastMode=scene.mode;
      // Manual choices are removed from this bag so the next random visit differs.
      bag=bag.filter(item=>item.mode!==scene.mode);
      visit={scene,side:spot.side,start:win.performance.now(),phase:0,previousX:spot.start,static:reduced()};
      scheduledBefore=true;
      announce('onStart',{...scene,source,static:visit.static});
      if (!visit || !available()) return true;
      if (visit.static) {
        paintStatic();
        staticTimer=win.setTimeout(()=>{staticTimer=null;end('complete');delay(false);},5000);
      } else frame=win.requestAnimationFrame(tick);
      return true;
    }
    function renderPose(mode, args, alpha) {
      if (alpha<=0) return;
      ctx.save();
      ctx.globalAlpha*=alpha;
      if (coreLabels.has(mode)) core.draw(ctx,{...args,mode});
      else hobbies.draw(ctx,{...args,mode});
      ctx.restore();
    }
    function paintStatic() {
      if (!visit || !visit.static) return;
      const spot=placement(visit.scene.mode,visit.side);
      if (!spot) {end('resized');return;}
      clear();
      renderPose(visit.scene.mode,{x:spot.target,y:geometry.ground,height:spot.height,phase:0,moving:0,action:visit.scene.mode==='boxing'?.28:.5,facing:-spot.side},1);
    }
    function tick(now) {
      frame=null;
      if (!visit) return;
      if (!allowed()) { reconcile(); return; }
      const elapsed=Math.max(0,now-visit.start);
      if (elapsed>=DURATION) { end('complete'); delay(false); return; }
      const spot=placement(visit.scene.mode,visit.side);
      if (!spot) { end('resized'); delay(false); return; }
      const entering=elapsed<ENTER;
      const leaving=elapsed>=DURATION-EXIT;
      const travelProgress=entering ? elapsed/ENTER : leaving ? (elapsed-DURATION+EXIT)/EXIT : 1;
      const x=entering ? mix(spot.start,spot.target,ease(travelProgress)) : leaving ? mix(spot.target,spot.start,ease(travelProgress)) : spot.target;
      const distance=Math.abs(x-visit.previousX);
      visit.phase+=distance/(.75*spot.height)*Math.PI*2;
      visit.previousX=x;
      const moving=entering || leaving ? Math.sin(travelProgress*Math.PI) : 0;
      const action=clamp((elapsed-ENTER)/HOLD);
      const opacity=Math.min(clamp(elapsed/180),clamp((DURATION-elapsed)/180));
      const mode=visit.scene.mode;
      const facing=leaving ? spot.side : -spot.side;
      clear();
      ctx.save();
      ctx.globalAlpha=opacity;
      ctx.fillStyle='rgba(22,23,29,.10)';
      ctx.beginPath();ctx.ellipse(x,geometry.ground+1,spot.height*.16,1.8,0,0,Math.PI*2);ctx.fill();
      const args={x,y:geometry.ground,height:spot.height,phase:visit.phase,moving,action,facing,
        idle:entering || leaving ? 0 : 1,idlePhase:elapsed*.001*Math.PI*2/4.4};
      if (mode==='dog' || mode==='bike' || mode==='skate') renderPose(mode,args,1);
      else {
        const blend=entering ? clamp((elapsed-ENTER+140)/140) : leaving ? 1-clamp((elapsed-DURATION+EXIT)/140) : 1;
        renderPose('walk',args,1-blend);
        renderPose(mode,{...args,moving:0},blend);
      }
      ctx.restore();
      frame=win.requestAnimationFrame(tick);
    }

    function visibilityChanged() { if (!intersectionObserver) inside=viewportVisible(); reconcile(); }
    function viewportChanged() { inside=viewportVisible(); reconcile(); }
    function play(mode) { return playInternal(mode,'manual'); }
    function stop() { if (destroyed) return; cancelTimer(); end('stopped'); delay(false); }
    function pause() { if (destroyed) return; paused=true; reconcile(); }
    function resume() { if (destroyed || !paused) return; paused=false; measure(); }
    function destroy() {
      if (destroyed) return;
      destroyed=true;
      cancelTimer();end('destroyed');
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      doc.removeEventListener('visibilitychange',visibilityChanged);
      win.removeEventListener('resize',measure);
      win.removeEventListener('scroll',viewportChanged);
      if (reduce && typeof reduce.removeEventListener==='function') reduce.removeEventListener('change',visibilityChanged);
      else if (reduce && typeof reduce.removeListener==='function') reduce.removeListener(visibilityChanged);
      canvas.remove();
      if (changedPosition && stage.style.position==='relative') stage.style.position=originalPosition;
    }

    inside=viewportVisible();
    if (typeof win.IntersectionObserver==='function') {
      intersectionObserver=new win.IntersectionObserver(entries=>{
        for (const entry of entries) if(entry.target===stage) inside=entry.isIntersecting && entry.intersectionRatio>0;
        reconcile();
      },{threshold:0});
      intersectionObserver.observe(stage);
    } else win.addEventListener('scroll',viewportChanged,{passive:true});
    if (typeof win.ResizeObserver==='function') {
      resizeObserver=new win.ResizeObserver(measure);
      resizeObserver.observe(stage);
      const avatar=stage.querySelector('.year-avatar');
      if (avatar) resizeObserver.observe(avatar);
    }
    doc.addEventListener('visibilitychange',visibilityChanged);
    win.addEventListener('resize',measure,{passive:true});
    if (reduce && typeof reduce.addEventListener==='function') reduce.addEventListener('change',visibilityChanged);
    else if (reduce && typeof reduce.addListener==='function') reduce.addListener(visibilityChanged);
    measure();
    return Object.freeze({play,stop,pause,resume,destroy});
  }

  root.SeorinaEasterEggs=Object.freeze({attach,scenes:DEFAULT_SCENES});
})(typeof globalThis!=='undefined' ? globalThis : this);
