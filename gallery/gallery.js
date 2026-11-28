import { photoLibraryURL, photosFor, readPhotoLibrary } from '../assets/photos/library.js?v=public-daily';

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

try {
  const rows = await readPhotoLibrary();
  const existingPublic = photosFor(rows, 'muse').filter(photo => photo.rightsStatus === 'existing-muse-only');
  const galleryPhotos = photosFor(rows, 'gallery');
  const photos = [...new Map([...existingPublic, ...galleryPhotos].map(photo => [photo.id, photo])).values()];
  if (!photos.length) throw Error('Empty photo library');
  const fragment = document.createDocumentFragment();
  for (const [i, photo] of photos.entries()) {
    const card = document.createElement('figure');
    const original = instagramOriginal(photo);
    const image = document.createElement('img');
    image.src = new URL(photo.src, photoLibraryURL);
    image.alt = photo.title;
    image.width = photo.width;
    image.height = photo.height;
    if (i > 2) image.loading = 'lazy';
    image.decoding = 'async';

    const frame = original ? originalLink(original) : document.createElement('div');
    frame.className = 'gallery-image';
    if (original) frame.setAttribute('aria-label', photo.title + ' · 查看 Instagram 原帖（新标签页）');
    frame.append(image);

    const caption = document.createElement('figcaption');
    if (original) {
      const title = originalLink(original);
      title.textContent = photo.title + ' ↗';
      caption.append(title);
    } else {
      caption.textContent = photo.title;
    }
    card.append(frame, caption);
    fragment.append(card);
  }
  grid.append(fragment);
} catch {
  status.textContent = '图库暂时无法读取。';
  status.hidden = false;
}
