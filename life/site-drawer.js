const drawer = document.querySelector(".life-site-drawer");
if (drawer) {
  const toggle = drawer.querySelector("summary");
  drawer.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !drawer.open) return;
    event.preventDefault();
    drawer.open = false;
    toggle.focus();
  });
  document.addEventListener("click", (event) => {
    if (drawer.open && !drawer.contains(event.target)) drawer.open = false;
  });
}
