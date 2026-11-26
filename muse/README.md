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

MUSE reads the site-wide [photo library](../assets/photos/README.md) with the
`muse` use, reading the full catalog and decoding photographs on demand. The original six photos and their hashes,
source records and depth maps were migrated without expanding their existing
MUSE use. They have not been granted a general reuse license. The exhibition
allows visitors to select multiple local files with 本机试图. This is an
in-memory preview: it decodes one selection at a time and never uploads or
persists the files. Local photos use the curved-sheet particle mode rather
than inferred depth. Returning to the public collection releases the current
local object URL. If the catalog cannot load, original architectural light
studies provide a fallback.

Use `tools/index-library.py` to add documented photos without overwriting
entries used by other sections. Optional depth maps use white near, black far;
without a map, Memory Particles uses an artistic curved sheet rather than
inferring depth from the image brightness. See the shared photo library README
for the CSV fields and validation commands.

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
