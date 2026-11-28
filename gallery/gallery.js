import { photoLibraryURL, photosFor, readPhotoLibrary } from '../assets/photos/library.js?v=instagram-archive';

const grid = document.querySelector('#gallery-grid');
const status = document.querySelector('#gallery-status');

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

const select = document.querySelector('#gallery-month');
const paging = document.querySelector('.gallery-paging');
const prev = document.querySelector('#gallery-newer');
const next = document.querySelector('#gallery-older');
const total = document.querySelector('#gallery-total');
const postTitles = new Map([['DgMv4KrEkVR', '钢3首播']]);
const element = (tag, name, content) => {
  const node = document.createElement(tag);
  if (name) node.className = name;
  if (content) node.textContent = content;
  return node;
};
const countLabel = n => n.toLocaleString('zh-Hans') + ' 张';
const monthLabel = key => key === 'undated' ? '日期未记录' : key.slice(0,4) + ' 年 ' + Number(key.slice(5)) + ' 月';
const months = new Map();
let visible = [], active = '', resizeFrame = 0, laidOutWidth = 0;

function createPhoto(photo, eager) {
  const original = instagramOriginal(photo);
  const frame = original ? originalLink(original) : document.createElement('div');
  frame.className = 'sheet-photo';
  const img = document.createElement('img');
  img.width = photo.width;
  img.height = photo.height;
  img.alt = photo.title;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.src = new URL(photo.src, photoLibraryURL);
  if (original) frame.setAttribute('aria-label', photo.title + ' · 查看 Instagram 原帖（新标签页）');
  frame.append(img);
  return { frame, ratio: photo.width / photo.height };
}

function makeRows(photos, width, gap, target) {
  const rows = [];
  let group = [], sum = 0;
  const push = (last = false) => {
    if (!group.length) return;
    const naturalWidth = target * sum + gap * (group.length - 1);
    const row = element('div', 'photo-row');
    row.style.gridTemplateColumns = group.map(x => 'minmax(0,' + x.ratio + 'fr)').join(' ');
    // Leave a short final row at a similar size to the preceding rows.
    if (last && naturalWidth < width * .9) row.style.width = Math.round(naturalWidth) + 'px';
    row.append(...group.map(x => x.frame));
    rows.push(row);
    group = [];
    sum = 0;
  };
  for (const photo of photos) {
    const old = target * sum + gap * Math.max(0, group.length - 1);
    const added = target * (sum + photo.ratio) + gap * group.length;
    if (group.length && added >= width && Math.abs(width - old) < Math.abs(width - added)) push();
    group.push(photo);
    sum += photo.ratio;
    if (target * sum + gap * (group.length - 1) >= width) push();
  }
  push(true);
  return rows;
}

function relayout() {
  resizeFrame = 0;
  const reference = visible[0]?.shelf;
  if (!reference) return;
  const width = reference.clientWidth;
  if (!width || width === laidOutWidth) return;
  laidOutWidth = width;
  const gap = parseFloat(getComputedStyle(reference).getPropertyValue('--photo-gap'));
  const target = Math.max(99, Math.min(172, width / (width < 610 ? 3.25 : 5.3)));
  const focused = document.activeElement;
  const restoreFocus = grid.contains(focused) && focused.matches('a.sheet-photo');
  for (const { shelf, photos } of visible) shelf.replaceChildren(...makeRows(photos, width, gap, target));
  if (restoreFocus) focused.focus({ preventScroll: true });
}

function render(key) {
  const posts = months.get(key);
  if (!posts || key === active) return;
  active = key;
  select.value = key;
  grid.setAttribute('aria-label', monthLabel(key) + '照片');
  const fragment = document.createDocumentFragment();
  visible = [];
  let first = 0;
  for (const post of posts.values()) {
    const sheet = element('section', 'post-sheet');
    const meta = element('header', 'sheet-meta');
    const title = element('h2');
    if (post.date) {
      const date = element('time', '', post.date.slice(5).replace('-', '.'));
      date.dateTime = post.date;
      title.append(date);
    }
    const label = postTitles.get(post.id) || (!post.date ? '未标日期' : '');
    if (label) title.append(element('span', '', label));
    const info = element('div', 'sheet-details');
    info.append(element('span', '', countLabel(post.photos.length)));
    if (post.url) {
      const link = originalLink(post.url);
      link.textContent = '原帖 ↗';
      link.setAttribute('aria-label', (post.date || '该组') + ' · Instagram 原帖（新标签页）');
      info.append(link);
    }
    meta.append(title, info);
    const shelf = element('div', 'sheet-photos');
    sheet.append(meta, shelf);
    fragment.append(sheet);
    visible.push({ shelf, photos: post.photos.map(photo => createPhoto(photo, first++ < 3)) });
  }
  grid.replaceChildren(fragment);
  laidOutWidth = 0;
  relayout();
  const keys = [...months.keys()], index = keys.indexOf(key);
  for (const [control, other, text] of [[prev, keys[index - 1], '← 较新'], [next, keys[index + 1], '继续看 →']]) {
    control.hidden = !other;
    if (other) {
      control.href = '#' + other;
      control.textContent = text + ' · ' + monthLabel(other);
    }
  }
  paging.hidden = prev.hidden && next.hidden;
}

function hashMonth() {
  const hash = location.hash.slice(1);
  return months.has(hash) ? hash : months.keys().next().value;
}
function jump() {
  render(hashMonth());
  grid.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

try {
  const rows = await readPhotoLibrary();
  const existingPublic = photosFor(rows, 'muse').filter(photo => photo.rightsStatus === 'existing-muse-only');
  const photos = [...new Map([...existingPublic, ...photosFor(rows, 'gallery')].map(p => [p.id, p])).values()];
  photos.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.instagramPost || '').localeCompare(b.instagramPost || '') || (a.instagramPosition || 1) - (b.instagramPosition || 1));
  if (!photos.length) throw Error('Empty photo library');
  for (const photo of photos) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(photo.date || '') ? photo.date : '';
    const key = date ? date.slice(0, 7) : 'undated';
    const original = instagramOriginal(photo);
    const url = original?.split('?')[0];
    const id = url?.split('/').at(-2) || photo.id;
    if (!months.has(key)) months.set(key, new Map());
    const posts = months.get(key);
    if (!posts.has(id)) posts.set(id, { id, date, url, photos: [] });
    posts.get(id).photos.push(photo);
  }
  const years = new Map();
  for (const key of months.keys()) {
    const year = key.slice(0, 4);
    if (!years.has(year)) {
      const group = document.createElement('optgroup');
      group.label = key === 'undated' ? '其他' : year;
      select.append(group);
      years.set(year, group);
    }
    const option = new Option(monthLabel(key), key);
    years.get(year).append(option);
  }
  grid.tabIndex = -1;
  total.textContent = countLabel(photos.length);
  select.parentElement.hidden = false;
  select.addEventListener('change', () => { location.hash = select.value; });
  window.addEventListener('hashchange', jump);
  render(hashMonth());
  new ResizeObserver(() => {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(relayout);
  }).observe(grid);
} catch (error) {
  status.textContent = '图库暂时无法读取。';
  status.hidden = false;
  console.error(error);
}
