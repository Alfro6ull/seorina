# Seorina Gallery Experiments

Three separate gallery studies, each driven by the existing shared photo catalog at `assets/photos/library.json`. No image files are copied into this folder.

- `/gallery/depth/` — Atmospheric Depth: depth-layered Three.js planes, scroll-driven camera travel, palette atmosphere and velocity-reactive image shaders. Reference: Houmahani Kane / Codrops Atmospheric Depth Gallery. Original source is MIT; this is an independent adaptation, not a copy of its source assets.
- `/gallery/aristide/` — Motion Index: one full-frame image at a time, numbered sequence, restrained monochrome stage, hold-to-reveal metadata and keyboard navigation. Reference: Aristide Benoist portfolio's full-bleed paginated image/project interaction.
- `/gallery/camille/` — Horizontal Parallax: horizontal spatial strip, wheel/drag travel, pointer parallax and velocity-driven shader displacement. Reference: Camille Mormal portfolio's horizontal image browsing / Codrops horizontal WebGL gallery technique.

All three read only the shared photo manifest's existing `galleryFeatured` records. The current four photographs are marked `existing-muse-only` and are only displayed under the repository's documented Gallery exception; this does not imply a broader reuse license. Each item links to its original Instagram post. Do not add magazine, campaign, or third-party photos without explicit rights review.

The shared data source is not hardcoded into each page. Future approved additions to `assets/photos/library.json` will appear in all three galleries automatically.

## References
- https://tympanus.net/Tutorials/DepthGallery/
- https://github.com/houmahani/codrops-depth-gallery (MIT)
- https://aristidebenoist.com/
- https://camillemormal.com/
- https://tympanus.net/codrops/2026/02/19/creating-a-smooth-horizontal-parallax-gallery-from-dom-to-webgl/

The source sites' names and visual patterns are credited as inspiration. No third-party photos, video, or proprietary code/assets are copied.
