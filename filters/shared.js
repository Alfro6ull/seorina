export const demoUrl = new URL('./assets/seorina-cntv.jpg', import.meta.url).href;

export function saveFrame(canvas, name, isDemo, effect, notice) {
  let out = canvas;
  if (isDemo) {
    out = document.createElement('canvas');
    out.width = Math.max(720, canvas.width);
    out.height = canvas.height + 78;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#101116';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, (out.width - canvas.width) / 2, 0);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('CNTV 역사극채널 · Oasis cast interview (2023) · ' + effect, 14, canvas.height + 19);
    ctx.fillText('CC BY 3.0 · https://creativecommons.org/licenses/by/3.0/', 14, canvas.height + 39);
    ctx.font = '11px sans-serif';
    ctx.fillText('https://commons.wikimedia.org/wiki/File:Seol_In-ah_interview_on_CNTV_with_Oasis_cast.jpg', 14, canvas.height + 59);
  }
  out.toBlob(blob => {
    if (!blob) { notice.textContent = '暂时无法保存，请重试。'; return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name + '.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 'image/png');
}
