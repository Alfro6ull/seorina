import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { photosFor, photoLibraryURL } from '../assets/photos/library.js';
const { version, photos } = JSON.parse(await readFile(photoLibraryURL));
const digest = buf => createHash('sha256').update(buf).digest('hex');
const ids = new Set(), assets = new Set(), dir = new URL('./', photoLibraryURL);
const legacy = new Set(['ig-daily-01-rain','ig-daily-02-bridge','ig-daily-03-night','ig-daily-04-street','ig-daily-07-night-walk','ig-daily-08-guitar']);
assert.equal(version, 3);
for (const row of photos) {
  assert.ok(row.id && !ids.has(row.id), 'duplicate or missing photo ID');
  ids.add(row.id);
  const source = new URL(row.source);
  assert.ok(source.protocol === 'https:' && !source.username && !source.password, 'invalid source for '+row.id);
  assert.ok(Array.isArray(row.uses) && row.uses.length && row.uses.every(x=>['filter-demo','muse','gallery'].includes(x)), 'no explicit use: '+row.id);
  assert.ok(row.uses.every(use=>photosFor([row],use).length), 'unapproved public entry: '+row.id);
  if (row.rightsStatus === 'existing-muse-only') {
    assert.ok(legacy.has(row.id), 'legacy status cannot be used for new photos');
    assert.deepEqual(row.uses, ['muse']);
  }
  for (const [path,hash,root] of [[row.src,row.sha256,'files'],[row.depthSrc,row.depthSha256,'depth']]) {
    if (!path && root==='depth') continue;
    assert.ok(path.startsWith(root+'/') && !path.slice(root.length+1).includes('/') && !path.includes('..'), 'invalid asset path '+path);
    assert.ok(!assets.has(path), 'duplicate asset '+path);
    const data = await readFile(new URL(path,dir));
    assert.equal(digest(data), hash, 'hash mismatch '+path);
    assets.add(path);
  }
}
for (const sub of ['files','depth']) {
  for (const name of await readdir(new URL(sub+'/',dir))) {
    if (sub==='depth' && ['MODEL.md','model-provenance.json'].includes(name)) continue;
    assert.ok(assets.has(sub+'/'+name), 'unregistered public asset '+name);
  }
}
assert.equal(photosFor(photos,'filter-demo').length,0,'Filters must not ship preset portraits');
console.log(`Shared photo library: ${photos.length} photos and ${assets.size-photos.length} depth maps validated`);
