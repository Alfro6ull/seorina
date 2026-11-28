const menu = document.querySelector('.entry-drawer');
if (menu) {
  document.addEventListener('click', e => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !menu.open) return;
    e.preventDefault();
    menu.open = false;
    menu.querySelector('summary').focus();
  });
}
