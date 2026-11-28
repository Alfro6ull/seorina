export const photoLibraryURL = new URL('./library.json', import.meta.url);
const assetName = /^(?:files|depth)\/[A-Za-z0-9_.-]+\.(?:avif|bmp|gif|jpe?g|png|webp)$/i;

export async function readPhotoLibrary({ url = photoLibraryURL, signal } = {}) {
  const response = await fetch(url, { cache: 'no-cache', signal });
  if (!response.ok) throw new Error(`Photo library HTTP ${response.status}`);
  const manifest = await response.json();
  if (manifest?.version !== 3 || !Array.isArray(manifest.photos)) throw new Error('Invalid photo library');
  return manifest.photos;
}

export function photosFor(rows, use) {
  return rows.filter(row => {
    if (row?.publish !== true || (!Array.isArray(row.uses) || !row.uses.includes(use)) || !assetName.test(row.src) || (typeof row.rights !== 'string' || !row.rights.trim())) return false;
    if (row.rightsStatus === 'existing-muse-only') return use === 'muse';
    if (row.rightsStatus === 'public-instagram-archive-display') {
      return ['gallery','muse'].includes(use) && row.tags?.includes('instagram') &&
        /^https:\/\/www\.instagram\.com\/_seorina\/p\/[A-Za-z0-9_-]+\/\?img_index=[1-9]\d*$/.test(row.source) &&
        Boolean(row.sourceVerification?.trim());
    }
    if (row.rightsStatus === 'public-instagram-fan-display') {
      return ['gallery','muse'].includes(use) && row.tags?.includes('daily') &&
        /^https:\/\/www\.instagram\.com\/_seorina\/p\/[A-Za-z0-9_-]+\/\?img_index=\d+$/.test(row.source) &&
        Boolean(row.reviewedContent?.trim());
    }
    if (row.rightsStatus === 'license-documented') return Boolean(row.license?.name && row.license?.url?.startsWith('https://'));
    return row.rightsStatus === 'permission-documented' && Boolean(row.permissionReference?.trim());
  });
}

export async function photoFor(id, use, options) {
  const photo = photosFor(await readPhotoLibrary(options), use).find(row => row.id === id);
  if (!photo) throw new Error(`No photo ${id} for ${use}`);
  return { ...photo, src: new URL(photo.src, photoLibraryURL).href };
}
