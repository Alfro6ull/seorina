import { photoFor } from '../assets/photos/library.js';

export const filterDemo = () => photoFor('kpopit-2025-8', 'filter-demo');

export function saveFrame(canvas, name, demo, effect, notice) {
  let out = canvas;
  if (demo) {
    out = document.createElement('canvas');
    out.width = Math.max(720, canvas.width);
    out.height = canvas.height + 78;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#101116';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, (out.width - canvas.width) / 2, 0);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(demo.sourceAttribution + ' · ' + demo.title + ' · ' + effect, 14, canvas.height + 19);
    ctx.fillText(demo.license ? demo.license.name + ' · ' + demo.license.url : 'Used with permission', 14, canvas.height + 39);
    ctx.font = '11px sans-serif';
    ctx.fillText(demo.source, 14, canvas.height + 59);
  }
  out.toBlob(blob => {
    if (!blob) { notice.textContent = '暂时无法保存，请重试。'; return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name + '.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 'image/png');
}
