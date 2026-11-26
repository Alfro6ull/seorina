import * as THREE from '../vendor/three.module.js';
import { createStudio, disposeObjects } from './optical-studio.js';

const clamp = THREE.MathUtils.clamp;
const mod = (value, length) => ((value % length) + length) % length;
const LONG_SEGMENTS = 440;
const CROSS_SEGMENTS = 10;

function createRibbonGeometry() {
  // One unbroken, open photographic surface. Neither a cylinder nor film frames.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.5, -1.5, -1.6),
    new THREE.Vector3(-3.1, 0.25, -0.35),
    new THREE.Vector3(-1.9, 1.8, 0.3),
    new THREE.Vector3(0.1, 2.12, -0.8),
    new THREE.Vector3(2.1, 1.32, -1.05),
    new THREE.Vector3(2.6, -0.35, -0.3),
    new THREE.Vector3(1.6, -1.65, 1.0),
    new THREE.Vector3(-0.3, -1.7, 1.7),
    new THREE.Vector3(-1.65, -0.35, 1.9),
    new THREE.Vector3(-0.72, 1.25, 1.45),
    new THREE.Vector3(1.0, 1.0, 0.9),
    new THREE.Vector3(2.6, -0.5, 0.65),
    new THREE.Vector3(3.65, -1.75, -0.6),
  ], false, 'centripetal', 0.5);
  const frames = curve.computeFrenetFrames(LONG_SEGMENTS, false);
  const positions = [];
  const unfolded = [];
  const uvs = [];
  const indices = [];
  const widthVector = new THREE.Vector3();
  const crossVector = new THREE.Vector3();
  const point = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let i = 0; i <= LONG_SEGMENTS; i++) {
    const u = i / LONG_SEGMENTS;
    curve.getPointAt(u, point);
    const twist = -0.5 + u * Math.PI * 1.15 + Math.sin(u * Math.PI * 2.3) * 0.86;
    widthVector.copy(frames.normals[i]).multiplyScalar(Math.cos(twist)).addScaledVector(frames.binormals[i], Math.sin(twist));
    crossVector.crossVectors(frames.tangents[i], widthVector).normalize();
    const taper = 0.7 + 0.3 * Math.pow(Math.sin(Math.PI * u), 0.5);
    const width = (1.65 + Math.sin(u * Math.PI * 4 + 0.5) * 0.25) * taper;
    for (let j = 0; j <= CROSS_SEGMENTS; j++) {
      const v = j / CROSS_SEGMENTS;
      const side = v - 0.5;
      vertex.copy(point).addScaledVector(widthVector, side * width).addScaledVector(crossVector, Math.sin(v * Math.PI) * 0.065);
      positions.push(vertex.x, vertex.y, vertex.z);
      unfolded.push((u - 0.5) * 9.2, side * 1.55 + Math.sin(u * Math.PI * 2) * 0.58, Math.cos(u * Math.PI * 3) * 0.44 + side * Math.sin(u * Math.PI * 2.6) * 0.8);
      uvs.push(u, v);
      if (i < LONG_SEGMENTS && j < CROSS_SEGMENTS) {
        const a = i * (CROSS_SEGMENTS + 1) + j;
        const b = a + CROSS_SEGMENTS + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const flat = new THREE.BufferGeometry();
  flat.setAttribute('position', new THREE.Float32BufferAttribute(unfolded, 3));
  flat.setIndex(indices);
  flat.computeVertexNormals();
  geometry.morphAttributes.position = [flat.getAttribute('position').clone()];
  geometry.morphAttributes.normal = [flat.getAttribute('normal').clone()];
  flat.dispose();
  geometry.computeBoundingSphere();
  return geometry;
}

function drawCover(ctx, image, x, width, height, focus = [0.5, 0.5]) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(width / iw, height / ih);
  const sw = width / scale;
  const sh = height / scale;
  const fx = Array.isArray(focus) ? clamp(Number(focus[0]) || 0.5, 0, 1) : 0.5;
  const fy = Array.isArray(focus) ? clamp(Number(focus[1]) || 0.5, 0, 1) : 0.5;
  ctx.drawImage(image, (iw - sw) * fx, (ih - sh) * fy, sw, sh, x, 0, width, height);
}

export class RibbonScene {
  constructor({ renderer, getTexture, reducedMotion = false, preview = false }) {
    this.renderer = renderer;
    this.getTexture = getTexture;
    this.reducedMotion = reducedMotion;
    this.preview = preview;
    this.items = [];
    this.index = 0;
    this.angle = this.angleTarget = -0.25;
    this.tilt = this.tiltTarget = 0.06;
    this.flow = 0;
    this.flowVelocity = 0;
    this.unfold = this.unfoldTarget = 0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07090b');
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 90);
    this.studio = createStudio(renderer, false);
    this.scene.environment = this.studio.texture;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3f465b, 2.05));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-3, 5, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc1d8ff, 2);
    rim.position.set(5, -1, -2);
    this.scene.add(rim);

    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.08,
      roughness: 0.27,
      clearcoat: 0.7,
      clearcoatRoughness: 0.19,
      envMapIntensity: 0.48,
      side: THREE.DoubleSide,
    });
    this.geometry = createRibbonGeometry();
    this.ribbon = new THREE.Mesh(this.geometry, this.material);
    this.ribbon.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.ribbon);
    this.group.rotation.z = -0.105;
    this.scene.add(this.group);

    // A soft pool of light provides a spatial reference without a card or pedestal.
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const sx = shadowCanvas.getContext('2d');
    const radial = sx.createRadialGradient(64, 64, 1, 64, 64, 64);
    radial.addColorStop(0, '#283343');
    radial.addColorStop(0.5, '#161b23');
    radial.addColorStop(1, '#07090b');
    sx.fillStyle = radial;
    sx.fillRect(0, 0, 128, 128);
    this.poolTexture = new THREE.CanvasTexture(shadowCanvas);
    this.poolTexture.colorSpace = THREE.SRGBColorSpace;
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(13, 5), new THREE.MeshBasicMaterial({ map: this.poolTexture, toneMapped: false, depthWrite: false }));
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.set(0, -2.9, 0);
    this.scene.add(this.pool);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.resize(1200, 800);
  }

  setCollection(items, index = 0) {
    this.items = items;
    this.setIndex(index);
  }

  setIndex(index) {
    if (!this.items.length) return;
    this.index = mod(index, this.items.length);
    const count = Math.min(8, this.items.length);
    this.atlasIndices = Array.from({ length: count }, (_, i) => mod(this.index + i, this.items.length));
    const canvas = document.createElement('canvas');
    const maxTextureSize = this.renderer.capabilities.maxTextureSize;
    const tileWidth = Math.min(this.preview ? 256 : 512, Math.floor(maxTextureSize / count));
    const tileHeight = Math.round(tileWidth * 1.12);
    canvas.width = tileWidth * count;
    canvas.height = tileHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f4f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.atlasIndices.forEach((photoIndex, i) => {
      const item = this.items[photoIndex];
      drawCover(ctx, item.image, i * tileWidth, tileWidth, tileHeight, item.focus);
      // A hairline join belongs to the continuous print, not a film frame.
      ctx.fillStyle = 'rgba(255,255,255,.32)';
      ctx.fillRect(i * tileWidth, 0, 1, tileHeight);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.repeat.set(count < 4 ? 3 : 2, 1);
    this.atlasTexture?.dispose();
    this.atlasTexture = texture;
    this.material.map = texture;
    this.material.needsUpdate = true;
    this.flow = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.mobile = width < 720;
    this.camera.aspect = width / Math.max(1, height);
    const fitWidth = this.mobile && !this.preview ? 7.8 : 9.3;
    const horizontalFit = fitWidth / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect);
    this.baseDistance = Math.max(this.preview ? 10.7 : 13, horizontalFit);
    this.camera.position.set(0, 0.25, this.baseDistance);
    this.camera.lookAt(0, this.mobile && !this.preview ? -0.2 : 0.1, 0);
    this.camera.updateProjectionMatrix();
    this.group.position.set(this.mobile || this.preview ? 0 : 0.35, this.mobile && !this.preview ? 1.0 : 0.2, 0);
  }

  update(dt, elapsed, input = {}) {
    const ease = 1 - Math.exp(-Math.min(dt, 0.05) * 6);
    this.angle += (this.angleTarget - this.angle) * ease;
    this.tilt += (this.tiltTarget - this.tilt) * ease;
    this.unfold += (this.unfoldTarget - this.unfold) * (this.reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 3));
    const idle = this.reducedMotion ? 0 : Math.sin(elapsed * 0.21) * 0.09;
    this.group.rotation.y = this.angle + idle + (input.active ? (input.x || 0) * 0.055 : 0);
    this.group.rotation.x = this.tilt + (input.active ? (input.y || 0) * -0.035 : 0);
    const compositionTilt = this.mobile && !this.preview ? -0.72 : -0.105;
    this.group.rotation.z = compositionTilt * (1 - this.unfold);
    // The unfolded print needs more horizontal room on a narrow viewport.
    this.camera.position.z = this.baseDistance * (this.mobile && !this.preview ? 1 + this.unfold * 0.27 : 1);
    this.ribbon.morphTargetInfluences[0] = this.unfold;
    this.flowVelocity *= Math.exp(-dt * 4);
    this.flow += (this.reducedMotion ? 0 : dt * 0.007) + this.flowVelocity * dt;
    if (this.atlasTexture) this.atlasTexture.offset.x = this.flow;
  }

  drag(dx, dy) {
    this.angleTarget += dx * 3.6;
    this.tiltTarget = clamp(this.tiltTarget + dy * 1.7, -0.65, 0.65);
    this.flowVelocity += dx * 0.18;
  }

  wheel(delta) {
    this.angleTarget += delta * 0.003;
    this.flowVelocity += delta * 0.0005;
  }

  action() {
    this.unfoldTarget = this.unfoldTarget ? 0 : 1;
    this.angleTarget = this.unfoldTarget ? 0 : -0.25;
    this.tiltTarget = 0.06;
    return this.unfoldTarget ? '折回胶卷' : '展开胶卷';
  }

  pick(x, y) {
    if (!this.atlasTexture || !this.atlasIndices?.length) return null;
    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.ribbon)[0];
    if (!hit?.uv) return null;
    const u = mod(hit.uv.x * this.atlasTexture.repeat.x + this.atlasTexture.offset.x, 1);
    return this.atlasIndices[Math.min(this.atlasIndices.length - 1, Math.floor(u * this.atlasIndices.length))];
  }

  dispose() {
    disposeObjects(this.scene);
    this.atlasTexture?.dispose();
    this.poolTexture.dispose();
    this.studio.dispose();
  }
}
