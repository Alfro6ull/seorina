import { demoUrl, saveFrame } from './shared.js';
import * as THREE from 'three';
import { loadImage, deriveMaps } from './vendor/living-ascii/maps.js';
import { buildField } from './vendor/living-ascii/field.js';
import { makePost } from './vendor/living-ascii/post.js';

const el = id => document.getElementById(id);
const fileInput = el('file'), canvas = el('preview'), orig = el('original'), stage = el('stage');
const notice = el('notice'), pause = el('pause'), compare = el('compare'), save = el('save');
const amp = el('amp'), status = el('screen-status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, field, post, sourceUrl, sourceName, isDemo = false, queueId = 0, raf = 0;
let mode = 'ascii', showingOriginal = false, paused = motion.matches, motionMs = 0, lastFrame = null;

function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastFrame = null;
}

function render() {
  if (!post) return;
  field.update((motionMs % 12000) / 12000);
  post.renderScene(Math.floor((motionMs % 12000) * .03));
  post.output(mode);
}

function frame(now) {
  raf = 0;
  if (!post || paused || showingOriginal || document.hidden) return;
  if (lastFrame === null) lastFrame = now;
  if (now - lastFrame >= 31) {
    motionMs += now - lastFrame;
    lastFrame = now;
    render();
  }
  raf = requestAnimationFrame(frame);
}

function sync() {
  const hasEffect = Boolean(post);
  canvas.hidden = !hasEffect || showingOriginal;
  orig.hidden = !sourceUrl || (!showingOriginal && hasEffect);
  el('empty').hidden = Boolean(sourceUrl);
  el('reset-demo').hidden = !sourceUrl || isDemo;
  stage.classList.toggle('is-demo', Boolean(isDemo));
  pause.disabled = compare.disabled = save.disabled = !hasEffect;
  pause.textContent = paused ? '播放' : '暂停';
  compare.textContent = showingOriginal ? '返回滤镜' : '看原图';
  compare.setAttribute('aria-pressed', String(showingOriginal));
  status.textContent = !sourceUrl ? '未选图' : !hasEffect || showingOriginal ? '原图' : paused ? '已暂停' : '播放中';
  if (hasEffect && !paused && !showingOriginal && !document.hidden) {
    if (!raf) raf = requestAnimationFrame(frame);
  } else stopLoop();
}

function disposeEffect() {
  stopLoop();
  post?.dispose();
  field?.dispose();
  post = field = null;
}

async function choose(file, demo = false) {
  if (!file && !demo) return;
  const ticket = ++queueId;
  if (!demo && (!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name) ||
      (file.type && !/^image\/(png|jpeg|webp|gif|avif|bmp|x-ms-bmp)$/.test(file.type)))) {
    notice.textContent = '请选择 JPG、PNG、WebP、GIF、AVIF 或 BMP 图片。';
    sync();
    return;
  }
  if (!demo && file.size > 24 * 1024 * 1024) {
    notice.textContent = '图片超过 24 MB，请先缩小再试。';
    sync();
    return;
  }
  notice.textContent = '';
  status.textContent = '读取中';
  const nextUrl = demo ? demoUrl : URL.createObjectURL(file);
  try {
    const img = await loadImage(nextUrl);
    if (ticket !== queueId) { URL.revokeObjectURL(nextUrl); return; }
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 55000000) {
      throw new Error('图片像素过多，请缩小后再试。');
    }
    disposeEffect();
    const previous = sourceUrl;
    sourceUrl = nextUrl;
    isDemo = demo;
    sourceName = demo ? 'seorina-cntv.jpg' : file.name;
    orig.src = nextUrl;
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
    el('image-info').textContent = (demo ? '仁雅 · CNTV 2023　/　' : '') + img.naturalWidth + ' × ' + img.naturalHeight + ' px';
    showingOriginal = false;
    paused = motion.matches;
    motionMs = 0;
    try {
      renderer ??= new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
      const maxSide = matchMedia('(max-width: 700px)').matches ? 720 : 1080;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const W = Math.max(8, Math.round(img.naturalWidth * scale));
      const H = Math.max(8, Math.round(img.naturalHeight * scale));
      const resized = document.createElement('canvas');
      resized.width = W; resized.height = H;
      const ctx = resized.getContext('2d');
      ctx.fillStyle = '#151722'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      renderer.setPixelRatio(1);
      renderer.setSize(W, H, false);
      const maps = deriveMaps(resized);
      field = buildField(renderer, {image:resized, maps, width:W, height:H, wind:maps.dominant, light:130 * Math.PI / 180, amp:Number(amp.value), density:1});
      post = makePost(renderer, W, H, field);
      render();
    } catch (error) {
      console.warn(error);
      disposeEffect();
      notice.textContent = '此浏览器暂时不能运行字浪，已保留原图预览。';
    }
    sync();
  } catch (error) {
    if (!demo) URL.revokeObjectURL(nextUrl);
    if (ticket !== queueId) return;
    notice.textContent = error?.message?.startsWith('图片像素') ? error.message : '读不出这张图片，请试试 JPG 或 PNG。';
    sync();
  }
}

for (const button of document.querySelectorAll('[data-pick]')) {
  button.addEventListener('click', () => fileInput.click());
}
fileInput.addEventListener('change', () => {
  void choose(fileInput.files[0]);
  fileInput.value = '';
});
const hasFiles = event => Array.from(event.dataTransfer?.types ?? []).includes('Files');
document.addEventListener('dragover', event => { if (hasFiles(event)) event.preventDefault(); });
document.addEventListener('drop', event => { if (hasFiles(event)) event.preventDefault(); });
stage.addEventListener('dragover', event => { if (hasFiles(event)) stage.classList.add('is-over'); });
stage.addEventListener('dragleave', event => { if (!stage.contains(event.relatedTarget)) stage.classList.remove('is-over'); });
stage.addEventListener('drop', event => {
  stage.classList.remove('is-over');
  if (hasFiles(event)) void choose(event.dataTransfer.files[0]);
});
for (const radio of document.querySelectorAll('input[name=mode]')) {
  radio.addEventListener('change', () => { mode = radio.value; render(); });
}
amp.addEventListener('input', () => {
  el('amp-value').value = Number(amp.value).toFixed(2);
  field?.setAmp(Number(amp.value));
  if (paused || showingOriginal) render();
});
pause.addEventListener('click', () => { paused = !paused; sync(); });
compare.addEventListener('click', () => {
  showingOriginal = !showingOriginal;
  if (!showingOriginal) render();
  sync();
});
save.addEventListener('click', () => {
  const name = sourceName.replace(/\.[^.]+$/, '') + (mode === 'ascii' ? '-ascii' : '-flow');
  saveFrame(canvas, name, isDemo, mode === 'ascii' ? 'ASCII filter' : 'Flow filter', notice);
});
el('reset-demo').addEventListener('click', () => void choose(null, true));
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  disposeEffect();
  renderer = null;
  notice.textContent = '图形预览已中断，仍可查看原图。恢复后可重新选图。';
  sync();
});
document.addEventListener('visibilitychange', sync);
motion.addEventListener('change', ({matches}) => { if (matches) { paused = true; sync(); } });
sync();
void choose(null, true);
