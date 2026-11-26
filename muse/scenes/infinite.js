import * as THREE from '../vendor/three.module.js';
import { Reflector } from '../vendor/Reflector.js';
import { createStudio, disposeObjects } from './optical-studio.js';

const clamp = THREE.MathUtils.clamp;
const mod = (value, length) => ((value % length) + length) % length;
const PERIOD = 55;
const FLOOR = -1;

function stoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const data = context.createImageData(512, 512);
  let seed = 17119;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const n = (seed % 1000) / 1000;
    const value = 202 + (n - .5) * 15 + Math.sin(x * .034 + Math.sin(y * .021)) * 3 + Math.sin(y * .11) * 1.6;
    const i = (y * 512 + x) * 4;
    data.data[i] = value + 2;
    data.data[i + 1] = value + 1;
    data.data[i + 2] = value - 2;
    data.data[i + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 8);
  return texture;
}

function softShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,.65)');
  gradient.addColorStop(.38, 'rgba(0,0,0,.34)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function archGeometry() {
  const outer = 7.25, inner = 6.75, spring = 1.65;
  const shape = new THREE.Shape();
  shape.moveTo(-outer, FLOOR);
  shape.lineTo(-outer, spring);
  shape.absarc(0, spring, outer, Math.PI, 0, true);
  shape.lineTo(outer, FLOOR);
  shape.lineTo(inner, FLOOR);
  shape.lineTo(inner, spring);
  shape.absarc(0, spring, inner, 0, Math.PI, false);
  shape.lineTo(-inner, FLOOR);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .5, steps: 1, bevelEnabled: true,
    bevelThickness: .035, bevelSize: .035, bevelSegments: 2, curveSegments: 40,
  });
  geometry.translate(0, 0, -.25);
  return geometry;
}

function lightGlow(horizontal = false) {
  return new THREE.ShaderMaterial({
    uniforms: { horizontal: { value: horizontal ? 1 : 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec2 vUv;uniform float horizontal;
      void main(){
        float d=mix(abs(vUv.x-.5),abs(vUv.y-.5),horizontal);
        float end=mix(vUv.y,vUv.x,horizontal);
        float a=exp(-d*d*42.)*.22*smoothstep(0.,.06,end)*(1.-smoothstep(.94,1.,end));
        gl_FragColor=vec4(1.,.66,.34,a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    toneMapped: false, side: THREE.DoubleSide,
  });
}

/** A continuous architectural gallery; all photographs remain parent-owned textures. */
export class InfiniteScene {
  constructor({ renderer, getTexture, reducedMotion = false, preview = false }) {
    this.renderer = renderer;
    this.getTexture = getTexture;
    this.reducedMotion = reducedMotion;
    this.preview = preview;
    this.items = [];
    this.index = 0;
    this.travel = this.travelTarget = 0;
    this.pan = new THREE.Vector2();
    this.panTarget = new THREE.Vector2();
    this.pointer = new THREE.Vector2();
    this.lookTarget = new THREE.Vector3();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#817d76');
    this.scene.fog = new THREE.Fog('#817d76', 24, 78);
    this.camera = new THREE.PerspectiveCamera(43, 1, .12, 110);
    this.camera.position.set(0, 2.2, 13);
    this.camera.lookAt(0, 1.7, -5);
    this.studio = createStudio(renderer, true);
    this.scene.environment = this.studio.texture;
    this.stone = stoneTexture();
    this.shadowTexture = softShadowTexture();
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.unitPlane = new THREE.PlaneGeometry(1, 1);
    this.stoneMaterial = new THREE.MeshStandardMaterial({
      color: '#99958d', map: this.stone, bumpMap: this.stone, bumpScale: .025,
      roughness: .88, metalness: .04, envMapIntensity: .15,
    });
    this.metalMaterial = new THREE.MeshStandardMaterial({ color: '#9d8d71', metalness: .78, roughness: .29, envMapIntensity: 1.0 });
    this.backMaterial = new THREE.MeshStandardMaterial({ color: '#393731', metalness: .3, roughness: .62 });
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: this.shadowTexture, transparent: true, opacity: .34, depthWrite: false,
      color: '#272219', toneMapped: false,
    });
    this.scene.add(new THREE.HemisphereLight('#f0efea', '#66615a', 1.55));
    this.sun = new THREE.DirectionalLight('#fff0d8', 3.15);
    this.sun.position.set(-10, 13, 14);
    this.sun.target.position.set(0, 1, -8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    Object.assign(this.sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 85 });
    this.sun.shadow.bias = -.00015;
    this.sun.shadow.normalBias = .025;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    const fill = new THREE.DirectionalLight('#e6edf1', .65);
    fill.position.set(7, 6, 8);
    this.scene.add(fill);
    this.buildRoom();
    this.buildFloor();
    this.buildPortals();
    this.buildPhotos();
    this.raycaster = new THREE.Raycaster();
    this.rayPointer = new THREE.Vector2();
    this.resize(1440, 960);
  }

  box(width, height, depth, material, x, y, z, parent = this.scene) {
    const mesh = new THREE.Mesh(this.unitBox, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  buildRoom() {
    this.box(.6, 13, 90, this.stoneMaterial, -7.7, 5.2, -24);
    this.box(.6, 13, 90, this.stoneMaterial, 7.7, 5.2, -24);
    this.box(16, .5, 90, this.stoneMaterial, 0, 9.1, -24);
    this.box(16, 13, .6, this.stoneMaterial, 0, 5, -62);
    this.arches = [];
    const geometry = archGeometry();
    for (const z of [-2.7, -16.5, -30.3, -44.1]) {
      const mesh = new THREE.Mesh(geometry, this.stoneMaterial);
      mesh.position.z = z;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.arches.push({ mesh, z });
    }
    // Architectural seams remain subtle at eye level and give travel a scale.
    const seamMaterial = new THREE.MeshStandardMaterial({ color: '#655e54', roughness: .95 });
    for (const x of [-7.37, 7.37]) {
      this.box(.015, .025, 82, seamMaterial, x, 2.8, -22);
      this.box(.015, .025, 82, seamMaterial, x, 6, -22);
    }
  }

  buildFloor() {
    const shader = {
      ...Reflector.ReflectorShader,
      uniforms: { ...Reflector.ReflectorShader.uniforms, blurStep: { value: new THREE.Vector2(1.7 / 1024, 1.7 / 1024) } },
      fragmentShader: Reflector.ReflectorShader.fragmentShader
        .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform vec2 blurStep;')
        .replace('vec4 base = texture2DProj( tDiffuse, vUv );', `
          vec2 p=vUv.xy/vUv.w;
          vec4 base=texture2D(tDiffuse,p)*.25;
          base+=texture2D(tDiffuse,p+vec2(blurStep.x,0.))*.125;
          base+=texture2D(tDiffuse,p-vec2(blurStep.x,0.))*.125;
          base+=texture2D(tDiffuse,p+vec2(0.,blurStep.y))*.125;
          base+=texture2D(tDiffuse,p-vec2(0.,blurStep.y))*.125;
          base+=texture2D(tDiffuse,p+blurStep)*.0625;
          base+=texture2D(tDiffuse,p-blurStep)*.0625;
          base+=texture2D(tDiffuse,p+vec2(blurStep.x,-blurStep.y))*.0625;
          base+=texture2D(tDiffuse,p+vec2(-blurStep.x,blurStep.y))*.0625;
        `),
    };
    this.reflector = new Reflector(new THREE.PlaneGeometry(22, 110), {
      color: '#88847c', textureWidth: 1024, textureHeight: 1024, clipBias: .004,
      multisample: 0, shader,
    });
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.position.set(0, FLOOR - .008, -25);
    this.scene.add(this.reflector);
    const veilMaterial = new THREE.MeshStandardMaterial({
      color: '#8c877e', map: this.stone, bumpMap: this.stone, bumpScale: .018,
      roughness: .55, metalness: .18, transparent: true, opacity: .42,
      depthWrite: false, envMapIntensity: .3,
    });
    this.floorVeil = new THREE.Mesh(new THREE.PlaneGeometry(22, 110), veilMaterial);
    this.floorVeil.position.set(0, FLOOR, -25);
    this.floorVeil.rotation.x = -Math.PI / 2;
    this.floorVeil.receiveShadow = true;
    this.floorVeil.renderOrder = 1;
    this.scene.add(this.floorVeil);
  }

  buildPortals() {
    this.portals = [];
    const coreMaterial = new THREE.MeshBasicMaterial({ color: '#ffe1ae', toneMapped: false, fog: true });
    const verticalGlow = lightGlow(false);
    const horizontalGlow = lightGlow(true);
    for (const z of [-5.7, -19.5, -33.3, -47.1]) {
      const group = new THREE.Group();
      group.position.z = z;
      const w = 6.9, h = 6.35, cy = FLOOR + h / 2 + .015;
      for (const sign of [-1, 1]) {
        this.box(.025, h, .035, coreMaterial, sign * w / 2, cy, 0, group);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(.35, h + .2), verticalGlow);
        glow.position.set(sign * w / 2, cy, .018);
        group.add(glow);
      }
      for (const y of [FLOOR + .03, FLOOR + h]) {
        this.box(w, .025, .035, coreMaterial, 0, y, 0, group);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + .2, .35), horizontalGlow);
        glow.position.set(0, y, .018);
        group.add(glow);
      }
      const spill = new THREE.PointLight('#ffd29b', 21, 12, 2);
      spill.position.set(0, 4.7, .65);
      group.add(spill);
      this.scene.add(group);
      this.portals.push({ group, z });
    }
  }

  buildPhotos() {
    const positions = [
      [0, 2, 2, 4.5, -.07],
      [-5, 2, 3.5, 4.5, .19], [5, 2, 3.5, 4.5, -.19],
      [-3.65, 1.7, -4, 4.45, .13], [3.65, 1.8, -4, 4.65, -.13],
      [-4.0, 1.65, -12, 4.3, .12], [4.0, 1.65, -12, 4.3, -.12],
      [-3.7, 1.6, -22, 4.3, .1], [3.7, 1.6, -22, 4.3, -.1],
      [-4.1, 1.75, -32, 4.6, .1], [4.1, 1.75, -32, 4.6, -.1],
      [-3.7, 1.7, -44, 4.5, .08], [3.7, 1.7, -44, 4.5, -.08],
    ];
    this.panels = positions.map(([x, y, z, height, turn], slot) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.rotation.y = turn;
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false, side: THREE.DoubleSide });
      const face = new THREE.Mesh(this.unitPlane, material);
      face.position.z = .066;
      face.castShadow = true;
      group.add(face);
      const backing = this.box(1, 1, .105, this.backMaterial, 0, 0, 0, group);
      backing.castShadow = true;
      const bars = Array.from({ length: 4 }, () => {
        const bar = this.box(1, 1, .13, this.metalMaterial, 0, 0, .01, group);
        bar.castShadow = true;
        return bar;
      });
      const shadow = new THREE.Mesh(this.unitPlane, this.shadowMaterial);
      shadow.rotation.set(-Math.PI / 2, 0, -turn);
      shadow.position.set(x, FLOOR + .012, z + .18);
      shadow.renderOrder = 2;
      this.scene.add(group, shadow);
      group.visible = shadow.visible = false;
      return { group, face, material, backing, bars, shadow, x, y, z, height, slot, assignedIndex: -1, cycle: null };
    });
    this.pickable = this.panels.map(panel => panel.face);
  }

  assignPhoto(panel, photoIndex) {
    if (!this.items.length) return;
    const index = mod(photoIndex, this.items.length);
    if (panel.assignedIndex === index) return;
    const item = this.items[index];
    const ratio = Math.max(.15, item.width / Math.max(1, item.height));
    let height = panel.height;
    let width = height * ratio;
    const maxWidth = panel.slot === 0 ? 4.35 : 4.1;
    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
    panel.assignedIndex = index;
    panel.face.userData.photoIndex = index;
    panel.material.map = this.getTexture(item);
    panel.material.needsUpdate = true;
    panel.face.scale.set(width, height, 1);
    panel.backing.scale.set(width + .04, height + .04, .105);
    const thickness = .055;
    panel.bars[0].scale.set(width + thickness * 2, thickness, .13);
    panel.bars[0].position.y = (height + thickness) / 2;
    panel.bars[1].scale.set(width + thickness * 2, thickness, .13);
    panel.bars[1].position.y = -(height + thickness) / 2;
    panel.bars[2].scale.set(thickness, height, .13);
    panel.bars[2].position.x = -(width + thickness) / 2;
    panel.bars[3].scale.set(thickness, height, .13);
    panel.bars[3].position.x = (width + thickness) / 2;
    panel.shadow.scale.set(width * 1.7, 2.8, 1);
  }

  setCollection(items, index = 0) {
    this.items = items;
    this.panels.forEach(panel => { panel.assignedIndex = -1; panel.cycle = null; });
    this.setIndex(index);
  }

  setIndex(index) {
    this.index = this.items.length ? mod(index, this.items.length) : 0;
    this.travel = this.travelTarget = 0;
    this.panels.forEach(panel => {
      panel.group.visible = panel.shadow.visible = Boolean(this.items.length);
      panel.assignedIndex = -1;
      this.assignPhoto(panel, this.index + panel.slot);
    });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.mobile = width < 720;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.fov = this.mobile ? 55 : 43;
    this.baseDistance = this.mobile ? 16 : 13;
    if (this.preview) this.baseDistance += 1.3;
    this.camera.position.z = this.baseDistance;
    this.camera.updateProjectionMatrix();
    const resolution = this.mobile || this.preview ? 512 : 1024;
    this.reflector.getRenderTarget().setSize(resolution, resolution);
    this.reflector.material.uniforms.blurStep.value.set(1.8 / resolution, 1.8 / resolution);
    this.sun.shadow.mapSize.set(this.mobile ? 768 : 1536, this.mobile ? 768 : 1536);
  }

  update(dt, elapsed, input = {}) {
    const ease = this.reducedMotion ? 1 : 1 - Math.exp(-Math.min(.05, dt) * 6);
    this.travel += (this.travelTarget - this.travel) * ease;
    this.pan.lerp(this.panTarget, ease);
    const pointerX = input.active && !input.down && !this.reducedMotion ? (input.x || 0) : 0;
    const pointerY = input.active && !input.down && !this.reducedMotion ? (input.y || 0) : 0;
    this.pointer.x += (pointerX - this.pointer.x) * ease;
    this.pointer.y += (pointerY - this.pointer.y) * ease;
    this.camera.position.set(this.pan.x + this.pointer.x * .24, 2.2 + this.pan.y + this.pointer.y * .12, this.baseDistance);
    this.lookTarget.set(this.pan.x * .4, this.mobile ? 1.6 : 1.7, -6);
    this.camera.lookAt(this.lookTarget);
    for (const panel of this.panels) {
      const unwrapped = panel.z + this.travel;
      const cycle = Math.floor((unwrapped + 47) / PERIOD);
      const z = mod(unwrapped + 47, PERIOD) - 47;
      panel.group.position.z = z;
      panel.shadow.position.z = z + .18;
      if (panel.cycle !== cycle) {
        panel.cycle = cycle;
        this.assignPhoto(panel, this.index + panel.slot + cycle * this.panels.length);
      }
    }
    for (const arch of this.arches) arch.mesh.position.z = mod(arch.z + this.travel + 47, PERIOD) - 47;
    for (const portal of this.portals) portal.group.position.z = mod(portal.z + this.travel + 48, PERIOD) - 48;
  }

  drag(dx, dy) {
    this.panTarget.x = clamp(this.panTarget.x - dx * 9, -3.1, 3.1);
    this.panTarget.y = clamp(this.panTarget.y + dy * 4, -.7, 1.3);
  }

  wheel(delta) {
    this.travelTarget += clamp(delta, -100, 100) * .018;
    if (Math.abs(this.travelTarget) > 11000) {
      const shift = Math.trunc(this.travelTarget / PERIOD) * PERIOD;
      this.travelTarget -= shift;
      this.travel -= shift;
    }
  }

  action() {
    this.travelTarget = 0;
    this.panTarget.set(0, 0);
    return '重置视角';
  }

  pick(x, y) {
    if (!this.items.length) return null;
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.rayPointer.set(x, y);
    this.raycaster.setFromCamera(this.rayPointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickable, false)[0];
    return hit ? hit.object.userData.photoIndex : null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.reflector);
    this.reflector.geometry.dispose();
    this.reflector.dispose();
    this.sun.shadow.dispose();
    disposeObjects(this.scene);
    this.stone.dispose();
    this.shadowTexture.dispose();
    this.studio.dispose();
  }
}
