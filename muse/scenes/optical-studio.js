import * as THREE from '../vendor/three.module.js';

// A compact, original studio environment. There are no remote HDR dependencies.
export function createStudio(renderer, warm = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, warm ? '#8c8071' : '#747e89');
  gradient.addColorStop(0.43, warm ? '#35312d' : '#30343b');
  gradient.addColorStop(1, '#0b0c0e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(65, 24, 52, 146);
  ctx.fillRect(313, 42, 94, 18);
  ctx.fillStyle = warm ? '#fbd4a2' : '#d6edff';
  ctx.fillRect(430, 65, 14, 104);
  ctx.fillStyle = '#d0d4da';
  ctx.fillRect(186, 0, 70, 17);
  const source = new THREE.CanvasTexture(canvas);
  source.colorSpace = THREE.SRGBColorSpace;
  source.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(source);
  generator.dispose();
  source.dispose();
  return target;
}

export function disposeObjects(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  root.clear();
}

export function beveledBox(width, height, depth, bevel = 0.035) {
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(-x, -y);
  shape.lineTo(x, -y);
  shape.lineTo(x, y);
  shape.lineTo(-x, y);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}
