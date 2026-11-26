// Provide a direct link fallback when JavaScript is unavailable.
for(const original of document.querySelectorAll('a[data-quick-index]')){
 const root=new URL('../',original.href);
 const wrap=document.createElement('div');wrap.className='quick-index';
 const button=document.createElement('button');button.type='button';button.className='quick-toggle';
 button.textContent='站点索引';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','filter-quick-nav');
 const nav=document.createElement('nav');nav.id='filter-quick-nav';nav.className='quick-panel';nav.setAttribute('aria-label','站点索引');nav.hidden=true;
 for(const [href,label] of [['','开场'],['life/','时间线'],['filters/','滤镜'],['muse/','MUSE']]){
  const a=document.createElement('a');a.href=new URL(href,root);a.textContent=label;nav.append(a);
 }
 // Include the current section as a way back to the filter list.
 if(location.pathname===new URL('filters/',root).pathname)nav.children[2].setAttribute('aria-current','page');
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
