import { photoLibraryURL, photosFor, readPhotoLibrary } from '../assets/photos/library.js?v=instagram-archive';


const index = document.querySelector('.gallery-index');
index.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !index.open) return;
  event.preventDefault();
  index.open = false;
  index.querySelector('summary').focus();
});
document.addEventListener('click', event => {
  if (index.open && !index.contains(event.target)) index.open = false;
});

function instagramOriginal(photo) {
  for (const candidate of [photo.instagramPost, photo.source]) {
    if (!candidate) continue;
    let url;
    try { url = new URL(candidate); } catch { continue; }
    if (url.origin !== 'https://www.instagram.com' || url.username || url.password ||
        !/^\/(?:_seorina\/)?p\/[A-Za-z0-9_-]+\/$/.test(url.pathname)) continue;
    const position = String(photo.instagramPosition ?? url.searchParams.get('img_index') ?? '');
    url.search = '';
    url.hash = '';
    if (/^[1-9]\d*$/.test(position)) url.searchParams.set('img_index', position);
    return url.href;
  }
  return null;
}

function originalLink(href) {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

const view = document.querySelector('#wall-scroll');
const wall = document.querySelector('#wall');
const count = document.querySelector('#gallery-count');
const slider = document.querySelector('#gallery-position');
const prev = document.querySelector('#gallery-prev');
const next = document.querySelector('#gallery-next');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function mountWall(photos) {
  const columns = [], mounted = new Set();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < photos.length; i += 3) {
    const column = document.createElement('div');
    column.className = 'wall-column';
    for (const photo of photos.slice(i, i + 3)) {
      const source = instagramOriginal(photo);
      const tile = source ? originalLink(source) : document.createElement('div');
      tile.className = 'wall-tile';
      if (source) tile.setAttribute('aria-label', photo.title + ' · IG 原帖（新标签页）');
      column.append(tile);
    }
    fragment.append(column);
    columns.push(column);
  }
  wall.append(fragment);
  let frame = 0, target = 0, dragging = null, suppressUntil = 0, paintFrame = 0;
  const max = () => Math.max(0, view.scrollWidth - view.clientWidth);
  function paint() {
    paintFrame = 0;
    const x = view.scrollLeft, end = max(), fraction = end ? x / end : 0;
    const step = columns[1] ? columns[1].offsetLeft - columns[0].offsetLeft : columns[0].offsetWidth;
    if (!step) return;
    const first = Math.max(0, Math.floor(x / step) - 1);
    const last = Math.min(columns.length, Math.ceil((x + view.clientWidth) / step) + 2);
    const current = x >= end - 1 && end > 0 ? photos.length :
      Math.min(photos.length, Math.max(1, Math.floor((x + step / 2) / step) * 3 + 1));
    count.textContent = current + ' / ' + photos.length;
    slider.value = String(Math.round(fraction * 1000));
    slider.setAttribute('aria-valuetext', '第 ' + current + ' 张，共 ' + photos.length + ' 张');
    prev.disabled = x <= 1;
    next.disabled = x >= end - 1;
    slider.disabled = end === 0;
    for (let i = first; i < last; i++) {
      const column = columns[i];
      if (!mounted.has(i)) {
        [...column.children].forEach((tile, j) => {
          const photo = photos[i * 3 + j];
          const image = new Image();
          image.alt = tile.matches('a') ? '' : photo.title;
          image.decoding = 'async';
          image.draggable = false;
          image.src = new URL(photo.src, photoLibraryURL);
          tile.append(image);
        });
        mounted.add(i);
      }
      column.style.transform = reduced.matches ? '' :
        'translateY(calc(var(--shift,0%) + ' + clamp((x + view.clientWidth / 2 - column.offsetLeft - step / 2) / 9, -39, 39) + 'px))';
    }
    for (const i of mounted) {
      if (i >= first - 2 && i < last + 2) continue;
      for (const tile of columns[i].children) tile.firstElementChild?.remove();
      columns[i].style.transform = '';
      mounted.delete(i);
    }
  }
  function queuePaint() { if (!paintFrame) paintFrame = requestAnimationFrame(paint); }
  function animate() {
    const delta = target - view.scrollLeft;
    if (Math.abs(delta) < 1.15 || reduced.matches) {
      frame = 0;
      view.scrollLeft = target;
      queuePaint();
      return;
    }
    view.scrollLeft += delta * .18;
    frame = requestAnimationFrame(animate);
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function shift(delta) {
    target = clamp((frame ? target : view.scrollLeft) + delta, 0, max());
    if (!frame) animate();
  }
  prev.addEventListener('click', () => shift(-view.clientWidth * .56));
  next.addEventListener('click', () => shift(view.clientWidth * .56));
  slider.addEventListener('input', () => { stop(); view.scrollLeft = max() * Number(slider.value) / 1000; queuePaint(); });
  view.addEventListener('scroll', queuePaint, { passive: true });
  new ResizeObserver(queuePaint).observe(view);
  reduced.addEventListener('change', queuePaint);
  view.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY * .85;
    if (!delta || (delta > 0 && view.scrollLeft >= max() - 1) || (delta < 0 && view.scrollLeft <= 1)) return;
    e.preventDefault();
    shift(delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? view.clientWidth : 1));
  }, { passive: false });
  view.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    shift(view.clientWidth * .56 * (e.key === 'ArrowLeft' ? -1 : 1));
  });
  view.addEventListener('dragstart', e => e.preventDefault());
  view.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stop();
    dragging = { id: e.pointerId, x: e.clientX, left: view.scrollLeft, moved: false };
  });
  view.addEventListener('pointermove', e => {
    if (dragging?.id !== e.pointerId) return;
    const delta = dragging.x - e.clientX;
    if (!dragging.moved && Math.abs(delta) <= 6) return;
    if (!dragging.moved) {
      dragging.moved = true;
      view.setPointerCapture(e.pointerId);
      view.classList.add('is-grabbing');
    }
    view.scrollLeft = dragging.left + delta;
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture','pointerleave']) {
    view.addEventListener(name, e => {
      if (dragging?.id !== e.pointerId) return;
      if (dragging.moved) suppressUntil = performance.now() + 240;
      dragging = null;
      view.classList.remove('is-grabbing');
    });
  }
  view.addEventListener('click', e => { if (e.detail && performance.now() < suppressUntil) e.preventDefault(); }, true);
  paint();
}

try {
  const rows = await readPhotoLibrary();
  const legacy = photosFor(rows, 'muse').filter(row => row.rightsStatus === 'existing-muse-only');
  const photos = [...new Map([...legacy, ...photosFor(rows, 'gallery')].map(row => [row.id, row])).values()];
  photos.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.instagramPost || '').localeCompare(b.instagramPost || '') || (a.instagramPosition || 1) - (b.instagramPosition || 1));
  if (!photos.length) throw Error('Empty photo library');
  mountWall(photos);
} catch (error) {
  document.querySelector('#gallery-status').textContent = '图库暂时无法读取。';
  document.querySelector('#gallery-status').hidden = false;
  console.error(error);
}
