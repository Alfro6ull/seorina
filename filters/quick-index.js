// Provide a direct link fallback when JavaScript is unavailable.
for(const original of document.querySelectorAll('a[data-quick-index]')){
 const root=new URL('../',original.href);
 const icon=original.dataset.quickIndex==='icon';
 const wrap=document.createElement('div');wrap.className=icon?'quick-index timeline-quick-index':'quick-index';
 const button=document.createElement('button');button.type='button';button.className='quick-toggle';
 button.textContent=icon?'+':'站点索引';if(icon)button.setAttribute('aria-label','站点索引');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','section-quick-nav');
 const nav=document.createElement('nav');nav.id='section-quick-nav';nav.className='quick-panel';nav.setAttribute('aria-label','站点索引');nav.hidden=true;
 for(const [href,label] of [['','开场'],['life/','时间线'],['filters/','滤镜'],['muse/','Muse'],['gallery/','图库']]){
  const a=document.createElement('a');a.href=new URL(href,root);a.textContent=label;
  if(location.pathname.replace(/index\.html$/,'')===new URL(a.href).pathname)a.setAttribute('aria-current','page');nav.append(a);
 }
 function toggle(open,focus){
  nav.hidden=!open;button.setAttribute('aria-expanded',String(open));
  if(focus)(open?nav.firstElementChild:button).focus();
 }
 button.addEventListener('click',e=>toggle(nav.hidden,e.detail===0));
 document.addEventListener('pointerdown',e=>{if(!nav.hidden&&!wrap.contains(e.target))toggle(false,false)});
 wrap.addEventListener('focusout',e=>{if(!nav.hidden&&e.relatedTarget&&!wrap.contains(e.relatedTarget))toggle(false,false)});
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden){e.preventDefault();toggle(false,true)}});
 wrap.append(button,nav);original.replaceWith(wrap);
}
