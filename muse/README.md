# MUSE — SEORINA / Particles

An interactive particle portrait gallery made from Seorina's everyday photographs. `/muse/` is the collection index and links to each published experiment. `/muse/particles/` opens the current particle experience. New experiments can be added as separate entries without replacing the index. Both entry points use one photo catalog and the same public photo catalog.

Photographic color samples become a point sculpture, with relative depth supplying bounded displacement. Drag to change the viewpoint, move the pointer to disturb nearby points, or dissolve and reassemble the photograph. The interface also supports touch, keyboard photo selection, an image viewer, and an original-image viewer.

`renderer.js` owns the GPU context, input handling, and resizing. `scenes/particles.js` owns the particle scene, camera, geometry, materials, interaction state, and disposal. The bundled Three.js revision is r170; its license is retained under `vendor/`. No external JavaScript CDN or build step is needed.

## Run locally

Serve the repository root through HTTP, then open `/muse/`:

```sh
python3 -m http.server 8769
```

Opening the HTML through `file://` will not reliably load the ES modules or catalog. Production can serve these files as static assets. Existing `life/` and `filters/` remain separate sections.

## Photo collection

`gallery.js` reads `library.json` and loads only reviewed public entries from `library.json`; the exhibition has no visitor upload feature. The particle renderer consumes this collection without a hardcoded image list. `/muse/` and `/muse/particles/` use the same store.

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

### Public catalog only

The public exhibit does not provide a visitor upload control or accept local imports. Add new photographs by reviewing their source and rights, placing the image and optional depth map in the repository, then updating `library.json`.

- The gallery reads up to 48 approved public entries from the catalog in stable order.
- Public source images are loaded directly from same-origin repository assets; the renderer limits oversized GPU textures.
- 
- 
- 
- 



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

## Controls and fallback

Arrow buttons and left/right keys select a photo. The expand control opens the original photograph. Drag to change the viewpoint, move the pointer to disturb nearby points, and use the action control to dissolve or reassemble the image. The exhibition shows the source post and, where applicable, the source publication, plus a persistent non-commercial fan-made copyright notice.

If WebGL cannot initialize, a static-photo fallback retains the public collection. Selecting another photograph replaces the previous point geometry. Disposing the renderer releases its GPU resources.
