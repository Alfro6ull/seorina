# Seorina entrance
The root page is a single-screen GitHub Pages landing page. The cave uses an independently generated environment image, not MotionSites artwork. The background image remains visible without WebGL; Three.js softly modulates the cave light. The plants are not alternate models: eight blossoms and five grass or leaf sprigs are isolated from the same picture, reconstructed behind their silhouettes, and drawn as separate animated layers anchored at the stem. The original cave plate is the static fallback, including under reduced motion. The cave and the direct shortcut lead to the same static index.

- Cormorant Garamond, Latin, 500 normal. Original hosted font file from Fontsource. See CORMORANT-OFL.txt (SIL OFL 1.1).
- Three.js r170, bundled with the local foreground source in flowers-source.mjs. See THREE-LICENSE.txt (MIT).
- To rebuild: in a temporary working directory with three@0.170.0 and esbuild installed, copy flowers-source.mjs and flora-cutouts.mjs there and run `npx esbuild flowers-source.mjs --bundle --minify --legal-comments=inline --outfile=flowers.js`. Copy the result back here. No build step is required to publish the page.
