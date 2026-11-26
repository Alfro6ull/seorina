# MUSE — SEORINA / Particles

An interactive particle portrait gallery made from Seorina's everyday photographs. `/muse/` opens the particle experience directly; the existing `/muse/particles/` link opens the same experience. Both entry points use one photo catalog and the same browser-local collection.

Photographic color samples become a point sculpture, with relative depth supplying bounded displacement. Drag to change the viewpoint, move the pointer to disturb nearby points, or dissolve and reassemble the photograph. The interface also supports touch, keyboard photo selection, an image viewer, and local imports.

`renderer.js` owns the GPU context, input handling, and resizing. `scenes/particles.js` owns the particle scene, camera, geometry, materials, interaction state, and disposal. The bundled Three.js revision is r170; its license is retained under `vendor/`. No external JavaScript CDN or build step is needed.

## Run locally

Serve the repository root through HTTP, then open `/muse/`:

```sh
python3 -m http.server 8769
```

Opening the HTML through `file://` will not reliably load the ES modules or catalog. Production can serve these files as static assets. Existing `life/` and `filters/` remain separate sections.

## Photo collection

`gallery.js` reads `library.json` and combines its usable public entries with the current browser's local imports. The particle renderer consumes this collection without a hardcoded image list. `/muse/` and `/muse/particles/` use the same store.

The initial catalog contains **six everyday photographs associated with @_seorina's Instagram posts**, together with small precomputed depth textures. Two images come from the exact posts' public photographic previews; the other four come from an attributed Sports Donga article associated with an official post by its caption. The individual carousel positions for those article images were not inspected. The manifest retains those distinctions, source links, asset URLs, publication dates, image checksums, and depth provenance. See `credits.html`, `library.json`, and `photos/depth/MODEL.md` for the corresponding records.

The `rights` field records actual provenance and rights status. A source link or `publish: true` flag does not create a reuse license; no new license or permission is claimed for these photographs.

### Catalog format

Paths resolve relative to `muse/`. Public image and optional depth paths must remain on the same origin. Entries require `publish: true`, an image `src`, and a nonempty `rights` note. HTTPS source links are retained for the viewer. JPEG, PNG, WebP, AVIF, GIF, and BMP paths are recognized; actual decoding depends on the browser.

Example schema, with illustrative filenames:

```json
{
  "version": 2,
  "photos": [{
    "id": "photo-001",
    "src": "photos/photo-001.webp",
    "title": "A quiet afternoon",
    "source": "https://www.instagram.com/p/ACTUAL_POST_ID/",
    "date": "2026-01-01",
    "tags": ["daily"],
    "publish": true,
    "rights": "Record the actual source and rights status here.",
    "depthSrc": "photos/depth/photo-001.png",
    "depthDirection": "white-near",
    "depthModel": "Record the model actually used, if applicable."
  }]
}
```

Depth fields are optional. When a photo has no usable depth map, Particles uses an explicitly artistic curved sheet and identifies that presentation in the interface. It does not infer facial depth from brightness. If neither public photos nor local imports can be loaded, `demo.js` supplies four original architectural light studies, clearly labeled as studies and not as photographs of Seorina. Their depth textures describe their constructed artwork, not measured real-world geometry.

### Local imports and persistence

Local photos are processed entirely in the browser. They are not uploaded, added to the public catalog, or committed to the repository.

- The default budget is **48 real photographs in the active collection**, with local imports taking precedence. Public entries stay in stable catalog order.
- Imported images are normalized to a maximum side of **1600 pixels** and stored as browser-encoded image blobs in IndexedDB. Up to two images are decoded at once. The collection budget is reserved before processing a large import batch.
- Successfully saved images survive reloads and navigation between the two entry points on the same origin and browser profile. Clearing site data, private-browsing policies, or storage eviction can remove them. The selected image ID is also retained when storage permits it.
- If IndexedDB is unavailable or a write fails, including a quota failure, usable imports remain in the current page and the store reports that they are **session-only**. They must be imported again after leaving or refreshing that page.
- A local file must be nonempty and no larger than 40 MB. Unsupported, unreadable, oversized, duplicate, and capacity-exceeding files receive separate result codes. HEIC/HEIF files work only when the browser can decode them; no external service converts them.
- Clear local imports removes the saved local records and restores the public collection. Failed deletion is reported rather than silently discarding visible saved records.

The browser normalizes the imported image used by both the renderer and viewer; it does not retain an additional full-resolution original. Public images retain their original `src` for the viewer while oversized rendering inputs are limited to the same 1600-pixel maximum side. Depth input images are limited to 640 pixels inside the store.

## Add photos with a CSV

`tools/index-library.py` builds the shared catalog from local image files and explicit CSV records. It does not download Instagram content or determine a license. Start with these columns:

```text
filename,id,title,source,date,tags,publish,rights,depth_filename,depth_src,depth_model,depth_type,depth_direction
```

Only `publish=true` rows are included. Tags use `|` separators. `filename` is a plain filename under `--source`; `source` is the actual HTTPS source URL and `rights` describes the actual status.

For optional depth, choose one approach:

- `depth_filename`: a relative image path beneath `--source`. The map is copied to `photos/depth/` beside the catalog.
- `depth_src` or `depthSrc`: an existing image path relative to the catalog directory. It is referenced without copying. The indexer rejects external URLs and paths escaping that directory.

A row must not use both approaches. Depth values must be **white near / black far**. Optional metadata columns are `depth_model`, `depth_type`, `depth_direction`, `depth_normalization`, `depth_kind`, and `depth_description`; their camel-case manifest names are also accepted. No model name is invented for a map without model provenance.

```sh
python3 muse/tools/index-library.py \
  --source /path/to/local/photos \
  --csv /path/to/reviewed-photos.csv
```

`--catalog /path/to/gallery/library.json` targets another collection. Existing descriptive metadata and depth fields are preserved when the photograph is byte-identical. Replacing the photograph clears stale image/depth provenance; replacing a depth map clears its previous depth metadata unless supplied again. All input validation precedes asset copying or catalog replacement. JSON replacement is atomic. Assets omitted from the CSV are not automatically deleted from disk.

## Generate depth for new photos

The six bundled maps were actually generated with **Depth Anything V2 Small**, through a pinned FP32 ONNX export and CPU inference. They are relative inverse-depth predictions, normalized per image with white representing nearer regions. They supply bounded visual parallax; they are not metric measurements, complete 3D scans, or unseen back-of-subject geometry.

The website does not download or run the model. For newly indexed photos, use the offline preprocessing script:

```sh
python3 -m venv /tmp/muse-depth-env
/tmp/muse-depth-env/bin/python -m pip install -r muse/tools/requirements-depth.txt
/tmp/muse-depth-env/bin/python muse/tools/generate-depth.py \
  --model /path/outside/repository/model.onnx
```

Download instructions, pinned revision and SHA-256, map orientation, preprocessing, actual inference records, and `--overwrite` behavior are documented in [photos/depth/MODEL.md](photos/depth/MODEL.md). The script verifies the model and writes aligned maps plus provenance. Keep model weights outside the website repository. A changed photo crop or orientation requires a new map or the identical transformation applied to both inputs.

## Shared store API

```js
import { Gallery } from './gallery.js';

const gallery = new Gallery();
gallery.addEventListener('change', event => {
  const { items, index, status } = event.detail;
  // Update the renderer and display meaningful status messages.
});
gallery.addEventListener('select', event => {
  const { item, index } = event.detail;
  // Update the selected photograph.
});
await gallery.init();
gallery.select(1);
const result = await gallery.importFiles(fileInput.files);
// result: { added, failed, skipped, persisted, errors }
// Display gallery.status.message, especially when persisted < added.
await gallery.clearLocal();
```

The store exposes `items`, `index`, `current`, `status`, `localCount`, and `publicCount`. Both events carry `{ items, index, item, status }`. `init()` is idempotent; import and clear operations are serialized. `destroy()` aborts pending image loads, closes IndexedDB, and releases owned images and object URLs.

## Controls and fallback

Arrow buttons and left/right keys select a photo. The expand control opens the photo viewer. Library selects or imports photos. The motion control and reduced-motion preference stop optional idle movement while retaining direct manipulation. Dialogs, hidden tabs, and page transitions pause GPU work.

If WebGL cannot initialize, the static-photo fallback retains the collection and viewer. Selecting another photograph replaces the previous point geometry. Disposing the renderer releases its GPU resources; disposing the collection releases its decoded images and object URLs.
