/* Original architectural light studies, never presented as photographs of a person.
 * The accompanying depth is an artistic scene construction (white = near),
 * not a monocular-depth measurement or a reconstruction of real geometry.
 */
const W = 720, H = 960;

function surface() {
  const image = document.createElement('canvas');
  const depth = document.createElement('canvas');
  image.width = depth.width = W;
  image.height = depth.height = H;
  return { image, depth, c: image.getContext('2d'), d: depth.getContext('2d') };
}

function gradient(c, stops, x1 = 0, y1 = 0, x2 = W, y2 = H) {
  const g = c.createLinearGradient(x1, y1, x2, y2);
  stops.forEach(([offset, color]) => g.addColorStop(offset, color));
  return g;
}

function polygon(c, points, fill) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function plane(s, points, fill, depth) {
  polygon(s.c, points, fill);
  polygon(s.d, points, `rgb(${depth} ${depth} ${depth})`);
}

function arch(c, x, y, w, h, fill) {
  const r = w / 2;
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + r);
  c.arc(x + r, y + r, r, Math.PI, 0);
  c.lineTo(x + w, y + h);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function finish(s, index, title) {
  // Very faint paper grain makes light transitions less digitally flat.
  const c = s.c;
  let seed = (index + 1) * 7919;
  c.save();
  c.globalAlpha = .035;
  for (let i = 0; i < 12000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % W;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % H;
    c.fillStyle = i % 2 ? '#ffffff' : '#292923';
    c.fillRect(x, y, 1, 1);
  }
  c.restore();
  return {
    id: `study-${index + 1}`,
    title,
    image: s.image,
    depthImage: s.depth,
    src: s.image.toDataURL('image/jpeg', .9),
    depthSrc: s.depth.toDataURL('image/png'),
    width: W,
    height: H,
    demo: true,
    local: false,
    depthKind: 'artistic-geometry',
    depthDescription: 'Original artistic geometry; white is near. Not measured depth.',
    tags: ['architectural study', 'original artwork'],
  };
}

export function createStudies() {
  const studies = [];
  {
    const s = surface(), { c, d } = s;
    c.fillStyle = gradient(c, [[0, '#ebe9e0'], [1, '#aeaaa0']]); c.fillRect(0, 0, W, H);
    d.fillStyle = '#b9b9b9'; d.fillRect(0, 0, W, H);
    plane(s, [[0, 675], [720, 595], [720, 960], [0, 960]], gradient(c, [[0, '#b2aea2'], [1, '#e9e3d4']], 0, 600, 420, 960), 220);
    arch(c, 200, 178, 335, 520, gradient(c, [[0, '#242b2b'], [1, '#737a74']], 200, 180, 510, 680));
    arch(d, 200, 178, 335, 520, '#363636');
    arch(c, 235, 213, 265, 485, gradient(c, [[0, '#888d83'], [1, '#d7d1bc']], 235, 250, 500, 670));
    arch(d, 235, 213, 265, 485, '#555555');
    plane(s, [[500, 349], [535, 355], [535, 699], [500, 672]], '#9d988c', 155);
    polygon(c, [[0, 330], [202, 434], [202, 697], [0, 770]], '#e8dcba');
    polygon(c, [[235, 698], [500, 698], [718, 960], [124, 960]], gradient(c, [[0, '#e8dcbb'], [1, '#f5ecd6']], 200, 700, 420, 960));
    for (let i = 5; i >= 0; i--) {
      const y = 688 + (5 - i) * 26;
      const x = 200 - (5 - i) * 24;
      const right = 535 + (5 - i) * 22;
      plane(s, [[x, y], [right, y], [right + 22, y + 20], [x - 24, y + 20]], i % 2 ? '#c2bba9' : '#d8cfbb', 170 + (5 - i) * 12);
      plane(s, [[x - 24, y + 20], [right + 22, y + 20], [right + 22, y + 27], [x - 24, y + 27]], '#9f988a', 180 + (5 - i) * 12);
    }
    studies.push(finish(s, 0, 'Light study 01 · The quiet arch'));
  }
  {
    const s = surface(), { c, d } = s;
    c.fillStyle = gradient(c, [[0, '#c5c9c7'], [.6, '#8d9696'], [1, '#e7e6dc']]); c.fillRect(0, 0, W, H);
    d.fillStyle = '#575757'; d.fillRect(0, 0, W, H);
    plane(s, [[0, 0], [330, 140], [330, 720], [0, 960]], gradient(c, [[0, '#efeee5'], [1, '#a3aaa5']], 0, 0, 430, 680), 195);
    plane(s, [[500, 0], [720, 0], [720, 960], [500, 700]], gradient(c, [[0, '#d1d5ce'], [1, '#687473']], 500, 0, 720, 900), 205);
    plane(s, [[330, 720], [500, 700], [720, 960], [0, 960]], gradient(c, [[0, '#677271'], [1, '#cfd3c9']], 330, 720, 420, 960), 218);
    polygon(c, [[40, 0], [155, 0], [330, 236], [330, 375]], '#fff4d6');
    polygon(c, [[330, 236], [500, 164], [500, 303], [330, 375]], '#daceaa');
    for (let i = 0; i < 5; i++) {
      const y = 465 + i * 43;
      polygon(c, [[0, y], [330, y + 70], [330, y + 81], [0, y + 11]], '#87928f');
    }
    studies.push(finish(s, 1, 'Light study 02 · Silver passage'));
  }
  {
    const s = surface(), { c, d } = s;
    c.fillStyle = gradient(c, [[0, '#e4e1d8'], [1, '#b8b7ac']], 0, 0, 0, H); c.fillRect(0, 0, W, H);
    d.fillStyle = gradient(d, [[0, '#686868'], [.55, '#777777'], [1, '#e5e5e5']], 0, 0, 0, H); d.fillRect(0, 0, W, H);
    polygon(c, [[110, 790], [335, 690], [720, 798], [720, 955]], '#929489');
    plane(s, [[280, 210], [425, 160], [425, 715], [280, 785]], gradient(c, [[0, '#f1eee1'], [1, '#c9c6b7']], 280, 0, 425, 0), 220);
    plane(s, [[425, 160], [547, 232], [547, 780], [425, 715]], gradient(c, [[0, '#697570'], [1, '#a8b0a4']], 425, 0, 547, 0), 198);
    plane(s, [[280, 210], [425, 160], [547, 232], [401, 291]], '#faf3df', 203);
    plane(s, [[152, 430], [280, 389], [280, 785], [152, 845]], gradient(c, [[0, '#e8dfbf'], [1, '#bbb392']], 152, 0, 280, 0), 239);
    plane(s, [[152, 430], [280, 389], [375, 443], [246, 489]], '#f3eacb', 225);
    plane(s, [[246, 489], [375, 443], [375, 800], [246, 860]], gradient(c, [[0, '#ada58e'], [1, '#d6cdae']], 246, 0, 375, 0), 228);
    studies.push(finish(s, 2, 'Light study 03 · Folded stone'));
  }
  {
    const s = surface(), { c, d } = s;
    c.fillStyle = gradient(c, [[0, '#c1c7c1'], [1, '#4f5d59']], 0, 0, W, H); c.fillRect(0, 0, W, H);
    d.fillStyle = '#343434'; d.fillRect(0, 0, W, H);
    plane(s, [[0, 660], [720, 520], [720, 960], [0, 960]], gradient(c, [[0, '#5b6860'], [1, '#b7b7a5']], 0, 600, 720, 960), 212);
    for (let i = 5; i >= 0; i--) {
      const x = 60 + i * 113;
      const y = 130 + i * 52;
      const w = 81 - i * 7;
      const h = 670 - i * 82;
      const value = 238 - i * 28;
      plane(s, [[x, y], [x + w, y - 18], [x + w, y + h - 18], [x, y + h]], gradient(c, [[0, '#c8c6b2'], [.35, '#eeead3'], [1, '#969c89']], x, 0, x + w, 0), value);
      plane(s, [[x + w, y - 18], [x + w + 18, y - 6], [x + w + 18, y + h - 6], [x + w, y + h - 18]], '#60705f', value - 8);
      polygon(c, [[x, y + h], [x + w, y + h - 18], [x + w + 175, 960], [x + 70, 960]], '#57635177');
    }
    studies.push(finish(s, 3, 'Light study 04 · Late colonnade'));
  }
  return studies;
}
