# MUSE — SEORINA / Image experiments

The landing page at `muse/` offers four animated previews based on the shared catalog. Each link enters an independent WebGL experiment. The landing page samples up to four reviewed public images and uses labeled graphic studies when the catalog is empty. No image files are bundled.

Four independent URLs, shared rendering engine and one collection:

- `muse/infinite/`: infinite depth archive; drag to pan, wheel to fly.
- `muse/prism/`: interactive optical refraction and RGB dispersion.
- `muse/ribbon/`: tessellated, scroll/drag-controlled curved film strip.
- `muse/particles/`: GPU point-cloud disintegration and reassembly.

No server, build command, CDN or external runtime dependency. Serve from the repository root, e.g. `python3 -m http.server 8769`. Local imports stay in the current tab and survive client-side scene navigation. They are never uploaded, stored in the repository, or retained on reload. Public collections larger than 80 photos are randomly sampled on each page load; use the library dialog or arrow controls to select within that sample. Local imports are capped at 80 per tab. With no eligible photos, the renderer uses eight original abstract graphic studies (not photographs of the artist). There is no automatic Instagram download.

## Shared image catalog
`library.json` is the only public photo catalog read by all four scenes; paths are relative to `muse/`. Add image files under `photos/` or point to another same-origin collection under the site using relative paths. An entry must have `publish: true` to be loaded. Example (illustrative only):

```json
{"version":1,"photos":[{"id":"2026-example-01","src":"photos/2026-example-01.webp","title":"A quiet afternoon","source":"https://www.instagram.com/p/REPLACE_WITH_ACTUAL_POST/","date":"2026-01-01","tags":["daily"],"publish":true,"rights":"Record permission or applicable license here"}]}
```

`src`, `publish` and nonempty `rights` are required; only same-origin JPG/JPEG/PNG/WebP/AVIF image paths are accepted. Non-commercial use does not automatically clear copyright. Keep the exact source post, photographer/license and approval record; don't put unreviewed photos in the public Git repository, including a supposedly hidden directory.

For batch imports, prepare candidate images in a **local folder outside the public repository**, create a CSV of approved images (see the sample header in `tools/index-library.py`), and run:

```sh
python3 muse/tools/index-library.py --source /path/to/local/approved-photos --csv /path/to/review.csv
```

The script validates the reviewed entries, copies only those files to `muse/photos/`, and rewrites the shared manifest. It does not scrape Instagram, bypass access restrictions, or grant permission. Existing files are not automatically deleted; remove withdrawn photos from the repository and index manually.

## Controls
Left/right arrows switch photographs, drag/wheel changes spatial position in Infinite/Ribbon, cursor or finger moves the Prism lens or repels particles, and the action button resets the scene or dissolves/reassembles particles. Open Library to select an image, import local photos, or clear them. The expand button opens the unmodified loaded image, including the original source link where available. WebGL-unavailable devices display a plain image fallback. Reduced-motion preference disables idle camera/lens motion and shortens particle transitions.

Existing life/ and filters/ are intentionally unchanged.
