const feature = document.querySelector('#feature');
const image = document.querySelector('#feature-image');
const rows = [...document.querySelectorAll('.filter-row')];
const hover = matchMedia('(hover: hover)');
const defaultRow = rows[0];
let selected = defaultRow;
function preview(row) {
  if (row === selected) return;
  selected = row;
  image.src = row.querySelector('img').src;
  image.alt = '薛仁雅的' + row.dataset.label + '效果示例';
  feature.href = row.href;
  feature.setAttribute('aria-label','打开' + row.dataset.label);
  rows.forEach(el => el.classList.toggle('is-current',el === row));
}
defaultRow.classList.add('is-current');
for (const row of rows) {
  row.addEventListener('pointerenter', () => { if (hover.matches) preview(row); });
  row.addEventListener('focus', () => preview(row));
}
