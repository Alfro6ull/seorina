export function saveFrame(canvas,name,notice){
  canvas.toBlob(blob=>{
    if(!blob){notice.textContent='暂时无法保存，请重试。';return;}
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name+'.png';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  },'image/png');
}
