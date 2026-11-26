import { demoUrl, saveFrame } from './shared.js';
const el = id => document.getElementById(id);
const stage = el('stage'), canvas = el('preview'), original = el('original'), ctx = canvas.getContext('2d');
const amp = el('amp'), position = el('light-x'), fileInput = el('file'), notice = el('notice');
const light = document.createElement('canvas'), lx = light.getContext('2d');
const palette = {
  amber: ['255,90,43', '255,154,35', '255,211,112', '255,137,94'],
  blue: ['94,55,255', '74,112,255', '185,178,255', '106,190,255']
};
let photo, url, isDemo, comparing = false, tone = 'amber', ticket = 0, raf = 0;

function render() {
  if (!photo) return;
  const w = canvas.width, h = canvas.height;
  const amount = Number(amp.value)/100, pos = Number(position.value)/100;
  ctx.fillStyle = '#151722';
  ctx.fillRect(0,0,w,h);
  ctx.drawImage(photo,0,0,w,h);
  if (!amount) return;
  const x = (pos * 1.24 - .12)*w;
  const c = palette[tone], r = Math.max(h*.8, w*.7);
  lx.clearRect(0,0,w,h);
  lx.save();
  lx.translate(x, h*(isDemo ? .68 : .77));
  lx.rotate((pos - .5) * .58);
  lx.scale(.50,1);
  const halo = lx.createRadialGradient(0,0,0,0,0,r);
  halo.addColorStop(0,'rgba('+c[2]+',.88)');
  halo.addColorStop(.28,'rgba('+c[1]+',.75)');
  halo.addColorStop(.56,'rgba('+c[0]+',.38)');
  halo.addColorStop(1,'rgba('+c[0]+',0)');
  lx.fillStyle = halo; lx.fillRect(-r,-r,r*2,r*2);
  lx.restore();
  const wash = lx.createLinearGradient(0,h,0,h*.45);
  wash.addColorStop(0,'rgba('+c[3]+',.52)');
  wash.addColorStop(.38,'rgba('+c[0]+',.19)');
  wash.addColorStop(1,'rgba('+c[0]+',0)');
  lx.fillStyle = wash; lx.fillRect(0,0,w,h);
  lx.save();
  lx.globalCompositeOperation = 'destination-out';
  lx.translate(w*.50,h*.34);
  lx.scale(w*.35,h*.28);
  const hold = lx.createRadialGradient(0,0,0,0,0,1.2);
  hold.addColorStop(0,'rgba(0,0,0,1)'); hold.addColorStop(.7,'rgba(0,0,0,.91)'); hold.addColorStop(1,'rgba(0,0,0,0)');
  lx.fillStyle = hold; lx.fillRect(-1.2,-1.2,2.4,2.4);
  lx.restore();
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(light,0,0);
  ctx.restore();
}
function queue() {
  el('amp-value').value = amp.value + '%';
  el('light-value').value = position.value + '%';
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
}
function sync() {
  canvas.hidden = !photo || comparing;
  original.hidden = !photo || !comparing;
  el('empty').hidden = Boolean(photo);
  el('compare').disabled = el('save').disabled = !photo;
  el('compare').textContent = comparing ? '返回滤镜' : '看原图';
  el('compare').setAttribute('aria-pressed', String(comparing));
  el('screen-status').textContent = !photo ? '未选图' : comparing ? '原图' : '漏光预览';
  el('reset-demo').hidden = !photo || isDemo;
  stage.classList.toggle('is-demo', Boolean(isDemo));
}
async function choose(file, demo = false) {
  if (!demo && !file) return;
  const id = ++ticket;
  if (!demo && (!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name) || file.size > 24*1024*1024)) {
    notice.textContent = '请选择不超过 24 MB 的 JPG、PNG、WebP、GIF、AVIF 或 BMP 图片。'; sync(); return;
  }
  const src = demo ? demoUrl : URL.createObjectURL(file);
  const img = new Image(); img.src = src;
  notice.textContent = '';
  el('screen-status').textContent = '读取中';
  try {
    await img.decode();
    if (id !== ticket) { if (!demo) URL.revokeObjectURL(src); return; }
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 55000000) throw Error();
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    url = src; photo = img; isDemo = demo; original.src = url; comparing = false;
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width = light.width = Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height = light.height = Math.max(1,Math.round(img.naturalHeight*scale));
    el('image-info').textContent = (demo ? '仁雅 · CNTV 2023　/　' : '') + img.naturalWidth + ' × ' + img.naturalHeight + ' px';
    render(); sync();
  } catch {
    if (!demo) URL.revokeObjectURL(src);
    if (id === ticket) { notice.textContent = demo ? '示例加载失败，仍可选择本地图片。' : '读不出这张图片，请缩小或转换为 JPG 后重试。'; sync(); }
  }
}
for (const b of document.querySelectorAll('[data-pick]')) b.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { void choose(fileInput.files[0]); fileInput.value = ''; });
const hasFiles = e => Array.from(e.dataTransfer?.types ?? []).includes('Files');
document.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
document.addEventListener('drop', e => { if (hasFiles(e)) e.preventDefault(); });
stage.addEventListener('dragover', e => { if (hasFiles(e)) stage.classList.add('is-over'); });
stage.addEventListener('dragleave', e => { if (!stage.contains(e.relatedTarget)) stage.classList.remove('is-over'); });
stage.addEventListener('drop', e => { stage.classList.remove('is-over'); if (hasFiles(e)) void choose(e.dataTransfer.files[0]); });
function moveLight(e) {
  const rect = stage.getBoundingClientRect();
  const contentW = isDemo ? rect.width : Math.min(rect.width,rect.height*canvas.width/canvas.height);
  position.value = String(Math.round(Math.max(0,Math.min(1,(e.clientX-rect.left-(rect.width-contentW)/2)/contentW))*100));
  queue();
}
stage.addEventListener('pointerdown', e => {
  if (!photo || comparing || e.button !== 0) return;
  stage.setPointerCapture(e.pointerId); moveLight(e);
});
stage.addEventListener('pointermove', e => { if (photo && !comparing && stage.hasPointerCapture(e.pointerId)) moveLight(e); });
for (const input of [amp,position]) input.addEventListener('input',queue);
for (const radio of document.querySelectorAll('[name=tone]')) radio.addEventListener('change', () => { tone = radio.value; queue(); });
el('compare').addEventListener('click', () => { comparing = !comparing; sync(); });
el('save').addEventListener('click', () => { render(); saveFrame(canvas,'light-leak',isDemo,'Light leak filter',notice); });
el('reset-demo').addEventListener('click', () => void choose(null,true));
void choose(null,true);
