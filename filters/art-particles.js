// Original Canvas implementation. Every particle starts at a sample of the source image.
const cache = new WeakMap();
const TAU = 2 * Math.PI;
const unit = (n, fallback) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
const color = x => Math.max(0, Math.min(255, Math.round(x / 16) * 16));
const hash = (i, j, k) => {
  const n = Math.imul(i + 57 * k + 137, 1597334677) ^ Math.imul(j + 31 * k + 73, 3812015801);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

function buildSamples(source, density, spark) {
  const w = source.width;
  const h = source.height;
  const step = Math.max(1, Math.min(w, h) / density, Math.sqrt((w * h) / 24000));
  const cols = Math.ceil(w / step);
  const rows = Math.ceil(h / step);
  const mini = document.createElement('canvas');
  mini.width = cols * 2;
  mini.height = rows * 2;
  const ctx = mini.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(source, 0, 0, mini.width, mini.height);
  const pixels = ctx.getImageData(0, 0, mini.width, mini.height).data;
  const buckets = new Map();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const ix = i * 2 + (hash(i, j, 3) > .5 ? 1 : 0);
      const iy = j * 2 + (hash(i, j, 4) > .5 ? 1 : 0);
      const p = (iy * mini.width + ix) * 4;
      if (pixels[p + 3] < 18) continue;
      const [r, g, b] = [pixels[p], pixels[p + 1], pixels[p + 2]];
      const l = (.2126 * r + .7152 * g + .0722 * b) / 255;
      const a = Math.pow(l, .72);
      if (hash(i, j, 1) > .32 + a * .88) continue;
      const lift = 22 + 78 * l;
      const rgb = spark
        ? [color(r + lift * 1.05), color(g + lift * .71), color(b + lift * .95)]
        : [color(r + lift * .75), color(g + lift * .86), color(b + lift)];
      const key = 'rgb(' + rgb.join(',') + ')';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({
        x: (i + .5 + .52 * (hash(i, j, 3) - .5)) * step,
        y: (j + .5 + .52 * (hash(i, j, 4) - .5)) * step,
        radius: step * (.075 + a * .30 + .069 * hash(i, j, 5)),
        seed: hash(i, j, 6) * TAU,
        noise: hash(i, j, 7)
      });
    }
  }
  return {buckets, step, density, spark, w, h};
}

export function renderParticles(ctx, imageCanvas, {
  amount = .72, detail = .63, x = .73, y = .55, phase = 0, interaction = .6, variant = 'drift'
} = {}) {
  const {width: w, height: h} = imageCanvas;
  if (!w || !h) return;
  amount = unit(amount, .72);
  const density = 42 + 4 * Math.round(24 * unit(detail, .63));
  const spark = variant === 'spark';
  ctx.clearRect(0, 0, w, h);
  if (!amount) {ctx.drawImage(imageCanvas, 0, 0); return;}
  let stored = cache.get(imageCanvas);
  if (!stored || stored.density !== density || stored.spark !== spark || stored.w !== w || stored.h !== h) {
    stored = buildSamples(imageCanvas, density, spark);
    cache.set(imageCanvas, stored);
  }

  const short = Math.min(w, h);
  const px = unit(x, .73) * w;
  const py = unit(y, .55) * h;
  const t = unit(phase, 0) * TAU;
  const radius = short * (spark ? .28 : .32);
  const spread = short * amount * (.14 + .86 * unit(interaction, .6)) * (spark ? .18 : .135);
  const {buckets, step} = stored;
  ctx.save();
  // Keep a subdued photograph below the dots. Eyes and expression remain readable.
  ctx.fillStyle = spark ? '#1f141c' : '#131c23';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1 - .64 * amount;
  ctx.drawImage(imageCanvas, 0, 0);
  ctx.globalAlpha = Math.min(1, .76 + .24 * amount);
  for (const [ink, dots] of buckets) {
    ctx.fillStyle = ink;
    ctx.beginPath();
    for (const d of dots) {
      const dx = d.x - px, dy = d.y - py;
      const influence = Math.max(0, 1 - (dx * dx + dy * dy) / (radius * radius));
      const lift = influence * influence;
      const wave = Math.sin(t + d.seed + d.y / short * 6);
      const angle = Math.atan2(dy, dx) + (.28 + d.noise * .62) * lift;
      const push = (d.noise * .77 + .23) * lift * spread * (.88 + .12 * wave);
      const cx = d.x + Math.cos(angle) * push + wave * amount * step * .21;
      const cy = d.y + Math.sin(angle) * push + Math.cos(t + d.seed) * amount * step * .25;
      const r = d.radius * (.55 + amount * .60) * (1 - .29 * lift);
      if (spark && lift > .19 && d.noise > .58) {
        const vx = Math.cos(angle), vy = Math.sin(angle), len = r * (1 + 4 * lift);
        ctx.moveTo(cx + vx * len, cy + vy * len);
        ctx.lineTo(cx + vy * r * .6, cy - vx * r * .6);
        ctx.lineTo(cx - vx * len * .55, cy - vy * len * .55);
        ctx.lineTo(cx - vy * r * .6, cy + vx * r * .6);
        ctx.closePath();
      } else {
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, TAU);
      }
    }
    ctx.fill();
  }
  ctx.restore();
}
