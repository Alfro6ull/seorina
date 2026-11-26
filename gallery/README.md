# Seorina Gallery Experiments

Three separate gallery studies, each driven by the existing shared photo catalog at `assets/photos/library.json`. No image files are copied into this folder.

- `/gallery/depth/` — Atmospheric Depth: depth-layered Three.js planes, scroll-driven camera travel, palette atmosphere and velocity-reactive image shaders. Reference: Houmahani Kane / Codrops Atmospheric Depth Gallery. Original source is MIT; this is an independent adaptation, not a copy of its source assets.
- `/gallery/aristide/` — Motion Index: one full-frame image at a time, numbered sequence, restrained monochrome stage, hold-to-reveal metadata and keyboard navigation. Reference: Aristide Benoist portfolio's full-bleed paginated image/project interaction.
- `/gallery/camille/` — Horizontal Parallax: horizontal spatial strip, wheel/drag travel, pointer parallax and velocity-driven shader displacement. Reference: Camille Mormal portfolio's horizontal image browsing / Codrops horizontal WebGL gallery technique.

All three read the shared MUSE photo catalog. The active photo is loaded first, and only a small neighbourhood of textures is kept in memory. New photos without depth maps still participate in the layered and horizontal layouts. Each photograph links back to its source. The standard `/gallery/` photo grid remains separate.

## References
- https://tympanus.net/Tutorials/DepthGallery/
- https://github.com/houmahani/codrops-depth-gallery (MIT)
- https://aristidebenoist.com/
- https://camillemormal.com/
- https://tympanus.net/codrops/2026/02/19/creating-a-smooth-horizontal-parallax-gallery-from-dom-to-webgl/

The source sites' names and visual patterns are credited as inspiration. No third-party photos, video, or proprietary code/assets are copied.
