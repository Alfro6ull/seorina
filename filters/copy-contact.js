const email=document.querySelector('#rights-email'),button=document.querySelector('#copy-rights-email'),status=document.querySelector('#copy-rights-status');
if(email&&button&&status){
  button.hidden=false;
  button.addEventListener('click',async()=>{
    status.hidden=false;
    try {
      await navigator.clipboard.writeText(email.textContent.trim());
      status.textContent='邮箱已复制';
    } catch {
      const range=document.createRange();
      range.selectNodeContents(email);
      const selection=window.getSelection();
      selection?.removeAllRanges();selection?.addRange(range);
      status.textContent='邮箱已选中，可以手动复制。';
    }
  });
}
