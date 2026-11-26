// Original, local raster effects. No fonts, textures, or third-party code.
const paper = [255, 241, 216];
const rose = [220, 78, 160];
const indigo = [33, 17, 67];
const fourInks = [[29, 17, 49], [118, 55, 128], [219, 123, 161], [255, 239, 212]];
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const frac = n => n - Math.floor(n);

// Construct an ordered threshold tile recursively; the earliest two
// thresholds are diagonally opposed so adjacent pixels fill later.
const bayer = (() => {
  let tile = [0], n = 1;
  while (n < 8) {
    const next = new Uint8Array(n * n * 4);
    for (let y = 0; y < n * 2; y++)
      for (let x = 0; x < n * 2; x++)
        next[y * n * 2 + x] = tile[(y % n) * n + x % n] * 4 + [0, 2, 3, 1][(y >= n ? 2 : 0) + (x >= n ? 1 : 0)];
    tile = next;
    n *= 2;
  }
  return tile;
})();

const luma = (data, i) => (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]) / 255;
function screen(x, y, theta, pitch, coverage, shift = 0) {
  const u = frac((theta[0] * x - theta[1] * y) / pitch + shift) - .5;
  const v = frac((theta[1] * x + theta[0] * y) / pitch) - .5;
  const radius = Math.sqrt(coverage * .51);
  return clamp(.5 + (radius - Math.sqrt(u*u + v*v)) * pitch / .92);
}
const roseAngle = [Math.cos(.19), Math.sin(.19)];
const violetAngle = [Math.cos(-.29), Math.sin(-.29)];

/** Render onto a same-size output context from an unmodified image canvas. */
export function renderPrint(ctx, imageCanvas, {amount = .83, variant = 'ink'} = {}) {
  const w = imageCanvas.width, h = imageCanvas.height;
  if (!w || !h) return;
  const strength = clamp(Number.isFinite(amount) ? amount : .83);
  if (strength === 0) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(imageCanvas, 0, 0);
    return;
  }
  const data = imageCanvas.getContext('2d').getImageData(0, 0, w, h);
  const pixels = data.data;
  const pitch = Math.max(4, Math.min(w, h) / 114);
  const pixelSize = Math.max(1, Math.round(pitch / 2.5));
  const pixel = variant === 'pixel';
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      if (!pixels[i+3]) continue;
      const tone = clamp((luma(pixels, i) - .035) * 1.1);
      const neutral = Math.pow(tone, .9);
      if (pixel) {
        const threshold = (bayer[(((y / pixelSize) | 0) & 7) * 8 + (((x / pixelSize) | 0) & 7)] + .5) / 64;
        const index = Math.min(3, Math.floor(neutral * 3 + threshold));
        const palette = fourInks[index];
        for (let c = 0; c < 3; c++) pixels[i+c] = mix(pixels[i+c], palette[c], strength);
      } else {
        const roseLoad = Math.sin(Math.PI * neutral) * .7 + (1 - neutral) * .15;
        const violetLoad = Math.pow(1 - neutral, 1.8);
        // A continuous underprint preserves fine eyes/hair detail; the two
        // separately angled dot screens provide the visible print grain.
        const redDot = screen(x, y, roseAngle, pitch, roseLoad, .04);
        const blueDot = screen(x, y, violetAngle, pitch * 1.06, violetLoad, .38);
        const baseShade = clamp((1 - neutral) * 1.03);
        for (let c = 0; c < 3; c++) {
          const screened = mix(mix(paper[c], rose[c], redDot * .78), indigo[c], blueDot * .90);
          const underprint = baseShade < .58
            ? mix(paper[c], rose[c], baseShade / .58)
            : mix(rose[c], indigo[c], (baseShade - .58) / .42);
          pixels[i+c] = mix(pixels[i+c], mix(screened, underprint, .53), strength);
        }
      }
    }
  }
  ctx.putImageData(data, 0, 0);
}
