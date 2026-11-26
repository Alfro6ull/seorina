(() => {
 const world=document.querySelector('.world'), frame=document.querySelector('.frame'), plate=document.querySelector('.plate'), gate=document.querySelector('.cave-target'), iris=document.querySelector('.arrival');
 let focus=null, sequence=0, busy=false;
 function layout(){
  const w=world.clientWidth,h=world.clientHeight,iw=plate.naturalWidth,ih=plate.naturalHeight;
  if(!iw)return;
  const s=Math.max(w/iw,h/ih);
  const x=(w-iw*s)*(w<=680?.6:.5)+iw*s*.572;
  const y=(h-ih*s)*.54+ih*s*.512;
  focus={w,h,x,y,gw:iw*s*.288,gh:ih*s*.55};
  for(const [key,num] of Object.entries({'--gx':x,'--gy':y,'--gw':focus.gw,'--gh':focus.gh}))world.style.setProperty(key,num+'px');
 }
 if(plate.complete)layout();else plate.addEventListener('load',layout,{once:true});
 new ResizeObserver(layout).observe(world);
 gate.addEventListener('click',e=>{
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!focus||!frame.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  e.preventDefault();if(busy)return;
  busy=true;const token=++sequence;
  const {w,h,x,y,gw,gh}=focus, zoom=Math.max(w/(gw*.53),h/(gh*.57));
  world.classList.add('going');world.dispatchEvent(new Event('portal:enter'));
  frame.style.transformOrigin=x+'px '+y+'px';
  frame.animate([{transform:'none'},{transform:`translate(${w/2-x}px,${h/2-y}px) scale(${zoom})`}],{duration:1040,fill:'forwards',easing:'cubic-bezier(.35,.04,.41,1)'});
  const glow=iris.animate([{opacity:0},{opacity:0,offset:.52},{opacity:1,offset:.86},{opacity:1}],{duration:1040,fill:'forwards'});
  let jumped=false;const next=()=>{if(token===sequence&&!jumped){jumped=true;location.assign(gate.href);}};
  glow.onfinish=next;setTimeout(next,1280);
 });
 addEventListener('pageshow',event=>{if(event.persisted){sequence++;busy=false;world.classList.remove('going');for(const el of [frame,iris])el.getAnimations().forEach(anim=>anim.cancel());}});
 const menu=document.querySelector('.quick-index'), toggle=menu.querySelector('summary');
 document.addEventListener('pointerdown',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;toggle.focus();}});
 // Preserve old bookmarked event and year anchors without redirecting the homepage itself.
 if(/^#(?:e\d{3}|year-\d{4})$/.test(location.hash))location.replace('life/'+location.hash);
})();
