/*
 * Mouse/pen dragging for an existing native horizontal year scroller.
 * Touch keeps the browser's scrolling and inertia; passive touch listeners
 * only tell the host when a finger is still held down.
 *
 * const rail = SeorinaYearRail.attach(viewport, {
 *   reduce, // accepted for host consistency; this module adds no inertia
 *   onStart() { clearTimeout(settleTimer); },
 *   onEnd({cancelled}) { if (!cancelled) queueSettle(); }
 * });
 * Host scroll/debounce/scrollend handlers must not settle while
 * rail.isInteracting. Requeue the host's normal settle delay in onEnd.
 *
 * isInteracting: mouse/pen held, including before the 5px threshold, or touch held.
 * isDragging: mouse/pen exceeded the threshold and is moving the scroller.
 * cancel() and destroy() restore all temporary inline styles and capture.
 */
(function(root) {
  'use strict';
  const THRESHOLD=5;
  const CLICK_GUARD_MS=500;

  function attach(viewport, options={}) {
    if (!viewport || !viewport.ownerDocument) return null;
    const doc=viewport.ownerDocument;
    const win=doc.defaultView || root;
    const selectionRoot=doc.documentElement;
    const originalDragging=viewport.classList.contains('is-dragging');
    const originalInteracting=viewport.getAttribute('data-rail-interacting');
    const originalDragFlag=viewport.getAttribute('data-rail-dragging');
    let pointer=null, touchStartScroll=0, destroyed=false, clickGuard=null;
    const touchIds=new Set();

    function now() { return win.performance ? win.performance.now() : Date.now(); }
    function callback(name, value) {
      if (typeof options[name]!=='function') return;
      try {options[name](value);}
      catch(error) {if(win.console)win.console.error('Year rail callback failed:',error);}
    }
    function setFlag(name, active, original) {
      if (active) viewport.setAttribute(name,'true');
      else if (original===null) viewport.removeAttribute(name);
      else viewport.setAttribute(name,original);
    }
    function syncFlags() {
      const dragging=Boolean(pointer && pointer.dragging);
      viewport.classList.toggle('is-dragging',dragging || originalDragging);
      setFlag('data-rail-interacting',Boolean(pointer) || touchIds.size>0,originalInteracting);
      setFlag('data-rail-dragging',dragging,originalDragFlag);
    }
    function keepStyle(element, name) {
      if (!element) return null;
      return {element,name,value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)};
    }
    function restoreStyles(saved) {
      for (const item of saved) {
        if (!item) continue;
        if (item.value) item.element.style.setProperty(item.name,item.value,item.priority);
        else item.element.style.removeProperty(item.name);
      }
    }
    function finishPointer(cancelled, reason) {
      if (!pointer) return;
      const ended=pointer;
      pointer=null; // lostpointercapture may fire synchronously on release.
      restoreStyles(ended.styles);
      syncFlags();
      if (ended.captured) {
        try {
          if (!viewport.hasPointerCapture || viewport.hasPointerCapture(ended.id)) viewport.releasePointerCapture(ended.id);
        } catch (_) { /* The browser may have released capture already. */ }
      }
      if (ended.dragging && reason!=='destroyed' && reason!=='hidden') clickGuard={id:ended.id,until:now()+CLICK_GUARD_MS};
      callback('onEnd',{pointerType:ended.type,dragged:ended.dragging,cancelled,reason});
    }
    function finishTouches(cancelled, reason) {
      if (!touchIds.size) return;
      touchIds.clear();
      syncFlags();
      callback('onEnd',{pointerType:'touch',dragged:Math.abs(viewport.scrollLeft-touchStartScroll)>.5,cancelled,reason});
    }

    function pointerDown(event) {
      if (destroyed) return;
      // A fresh physical press must never inherit the previous drag's click guard.
      clickGuard=null;
      const type=event.pointerType || 'mouse';
      if (type==='touch' || pointer || touchIds.size || event.isPrimary===false || event.button!==0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (type!=='mouse' && type!=='pen') return;
      const target=event.target;
      if (target && typeof target.closest==='function' && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      pointer={
        id:event.pointerId,type,startX:event.clientX,startScroll:viewport.scrollLeft,
        dragging:false,captured:false,
        styles:[keepStyle(viewport,'scroll-snap-type'),keepStyle(viewport,'scroll-behavior'),keepStyle(viewport,'cursor'),keepStyle(viewport,'user-select'),keepStyle(viewport,'-webkit-user-select'),keepStyle(selectionRoot,'user-select'),keepStyle(selectionRoot,'-webkit-user-select')]
      };
      viewport.style.setProperty('user-select','none');
      viewport.style.setProperty('-webkit-user-select','none');
      if (selectionRoot) {
        selectionRoot.style.setProperty('user-select','none');
        selectionRoot.style.setProperty('-webkit-user-select','none');
      }
      syncFlags();
      // Do not prevent default or capture yet: a genuine link click keeps focus
      // and its original target. Capture begins only after horizontal intent.
    }
    function pointerMove(event) {
      if (!pointer || event.pointerId!==pointer.id) return;
      if (typeof event.buttons==='number' && !(event.buttons&1)) {finishPointer(true,'buttons-released');return;}
      const delta=event.clientX-pointer.startX;
      if (!pointer.dragging) {
        if (Math.abs(delta)<=THRESHOLD) return;
        pointer.dragging=true;
        viewport.style.setProperty('scroll-snap-type','none');
        viewport.style.setProperty('scroll-behavior','auto');
        viewport.style.setProperty('cursor','grabbing');
        try {viewport.setPointerCapture(pointer.id);pointer.captured=true;}
        catch (_) { /* Document listeners still track a pointer outside the rail. */ }
        syncFlags();
        callback('onStart',{pointerType:pointer.type,dragged:true});
        if (!pointer) return; // The host may cancel from its callback.
      }
      if (event.cancelable) event.preventDefault();
      viewport.scrollLeft=pointer.startScroll-delta;
    }
    function pointerUp(event) {
      if (!pointer || event.pointerId!==pointer.id) return;
      if (pointer.dragging && event.cancelable) event.preventDefault();
      finishPointer(false,'pointerup');
    }
    function pointerCancel(event) {
      // Native touch pan emits pointercancel while the finger is still down.
      // Touch has a separate gate and is cleared only by touchend/touchcancel.
      if (pointer && event.pointerId===pointer.id) finishPointer(true,'pointercancel');
    }
    function captureLost(event) {
      if (pointer && event.pointerId===pointer.id) finishPointer(true,'lostpointercapture');
    }
    function dragStart(event) {
      if (pointer && event.cancelable) event.preventDefault();
    }
    function click(event) {
      if (!clickGuard) return;
      if (now()>clickGuard.until) {clickGuard=null;return;}
      // Keyboard Enter and programmatic activation have detail=0.
      if (event.detail===0) return;
      if (typeof event.pointerId==='number' && event.pointerId>=0 && event.pointerId!==clickGuard.id) return;
      clickGuard=null;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }

    function touchStart(event) {
      if (destroyed) return;
      clickGuard=null;
      const wasHeld=touchIds.size>0;
      if (pointer) finishPointer(true,'touch-started');
      for (const touch of Array.from(event.changedTouches || [])) touchIds.add(touch.identifier);
      if (!wasHeld && touchIds.size) {
        touchStartScroll=viewport.scrollLeft;
        syncFlags();
        callback('onStart',{pointerType:'touch',dragged:false});
      }
    }
    function touchEnd(event) {
      if (!touchIds.size) return;
      const wasHeld=touchIds.size>0;
      let matched=false;
      for (const touch of Array.from(event.changedTouches || [])) matched=touchIds.delete(touch.identifier) || matched;
      if (wasHeld && matched && !touchIds.size) {
        syncFlags();
        callback('onEnd',{pointerType:'touch',dragged:Math.abs(viewport.scrollLeft-touchStartScroll)>.5,cancelled:event.type==='touchcancel',reason:event.type});
      }
    }
    function visibilityChanged() {
      if (!doc.hidden) return;
      clickGuard=null;
      finishPointer(true,'hidden');
      finishTouches(true,'hidden');
    }
    function cancel() {
      if (destroyed) return;
      finishPointer(true,'cancelled');
      finishTouches(true,'cancelled');
    }
    function destroy() {
      if (destroyed) return;
      destroyed=true;
      clickGuard=null;
      finishPointer(true,'destroyed');
      finishTouches(true,'destroyed');
      viewport.removeEventListener('pointerdown',pointerDown);
      doc.removeEventListener('pointermove',pointerMove);
      doc.removeEventListener('pointerup',pointerUp);
      doc.removeEventListener('pointercancel',pointerCancel);
      viewport.removeEventListener('lostpointercapture',captureLost);
      viewport.removeEventListener('dragstart',dragStart);
      viewport.removeEventListener('click',click,true);
      viewport.removeEventListener('touchstart',touchStart);
      doc.removeEventListener('touchend',touchEnd);
      doc.removeEventListener('touchcancel',touchEnd);
      doc.removeEventListener('visibilitychange',visibilityChanged);
      syncFlags();
    }

    viewport.addEventListener('pointerdown',pointerDown);
    doc.addEventListener('pointermove',pointerMove,{passive:false});
    doc.addEventListener('pointerup',pointerUp);
    doc.addEventListener('pointercancel',pointerCancel);
    viewport.addEventListener('lostpointercapture',captureLost);
    viewport.addEventListener('dragstart',dragStart);
    viewport.addEventListener('click',click,true);
    viewport.addEventListener('touchstart',touchStart,{passive:true});
    doc.addEventListener('touchend',touchEnd,{passive:true});
    doc.addEventListener('touchcancel',touchEnd,{passive:true});
    doc.addEventListener('visibilitychange',visibilityChanged);
    return Object.freeze({destroy,cancel,get isDragging(){return Boolean(pointer && pointer.dragging);},get isInteracting(){return Boolean(pointer) || touchIds.size>0;}});
  }

  root.SeorinaYearRail=Object.freeze({attach});
})(typeof globalThis!=='undefined' ? globalThis : this);
