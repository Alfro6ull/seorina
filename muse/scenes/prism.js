import * as THREE from '../vendor/three.module.js';
import { createStudio, beveledBox, disposeObjects } from './optical-studio.js';

const clamp = THREE.MathUtils.clamp;
const mod = (value, length) => ((value % length) + length) % length;

/** Optical objects stand in front of a photograph and refract its rendered image. */
export class PrismScene {
  constructor({ renderer, getTexture, reducedMotion = false, preview = false }) {
    this.getTexture = getTexture;
    this.reducedMotion = reducedMotion;
    this.preview = preview;
    this.items = [];
    this.index = 0;
    this.turn = this.turnTarget = 0;
    this.tilt = this.tiltTarget = 0;
    this.pointer = new THREE.Vector2();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#171613');
    this.scene.fog = new THREE.Fog('#171613', 10, 30);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    this.camera.position.set(0.1, 0.3, 10.6);
    this.studio = createStudio(renderer, true);
    this.scene.environment = this.studio.texture;
    this.group = new THREE.Group();
    this.group.position.set(0.2, 0.22, 0);
    this.scene.add(this.group);

    this.scene.add(new THREE.HemisphereLight(0xf4f3ef, 0x53493a, 1.3));
    const key = new THREE.DirectionalLight(0xffe4c4, 3.3);
    key.position.set(-3, 5, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xd2e8ff, 1.7);
    rim.position.set(4, 2, -1);
    this.scene.add(rim);

    this.photoMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
    this.photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.photoMaterial);
    this.photo.position.set(0.62, 0.05, -0.48);
    this.group.add(this.photo);
    this.backing = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.055), new THREE.MeshStandardMaterial({ color: 0x181916, roughness: 0.6, fog: false }));
    this.backing.position.copy(this.photo.position);
    this.backing.position.z -= 0.045;
    this.group.add(this.backing);

    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.018,
      transmission: 1,
      thickness: 0.52,
      ior: 1.46,
      dispersion: 1.05,
      clearcoat: 0.15,
      clearcoatRoughness: 0.01,
      attenuationColor: new THREE.Color('#fff7e7'),
      attenuationDistance: 18,
      envMapIntensity: 0.65,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.glassMaterials = [glass];
    this.prisms = [];
    this.addPrism(beveledBox(0.36, 3.62, 0.36), glass, [-0.52, 0.06, 0.55], [0.02, -0.2, -0.025]);
    const narrow = glass.clone();
    narrow.thickness = 0.38;
    narrow.dispersion = 1.2;
    this.glassMaterials.push(narrow);
    this.addPrism(beveledBox(0.16, 3.38, 0.25, 0.023), narrow, [-0.85, 0.11, 0.38], [-0.04, 0.22, 0.025]);
    const wedgeShape = new THREE.Shape();
    wedgeShape.moveTo(-0.6, -0.45);
    wedgeShape.lineTo(0.6, -0.45);
    wedgeShape.lineTo(-0.08, 0.6);
    wedgeShape.closePath();
    const wedgeGeometry = new THREE.ExtrudeGeometry(wedgeShape, { depth: 0.65, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, steps: 1 });
    wedgeGeometry.translate(0, 0, -0.325);
    const wedgeMaterial = glass.clone();
    wedgeMaterial.thickness = 0.75;
    wedgeMaterial.dispersion = 1.0;
    this.glassMaterials.push(wedgeMaterial);
    this.addPrism(wedgeGeometry, wedgeMaterial, [1.4, -1.25, 0.7], [0.08, -0.18, -0.19]);

    // A matte, fogged floor merges into the background instead of drawing a horizon.
    const floorMaterial = new THREE.MeshBasicMaterial({ color: '#25221d', toneMapped: false });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -2.05;
    this.scene.add(this.floor);

    // The warm light trace is art-directed, not a simulated photon caustic.
    this.caustic = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 4.7), new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAngle: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime,uAngle;
        float gaussian(float x){return exp(-x*x);}
        void main(){
          vec2 p=vUv-.5; p.x+=p.y*.42+uAngle*.12;
          float beam=gaussian((p.x+.10+sin(p.y*8.+uAngle)*.035)*11.);
          float line1=gaussian((p.x+.11+sin(p.y*7.+uAngle)*.07)*55.);
          float line2=gaussian((p.x-.02+sin(p.y*5.+uAngle)*.11)*68.);
          float fade=(1.-smoothstep(.04,.52,abs(p.y)))*(1.-smoothstep(.28,.49,abs(p.x)));
          vec3 warm=vec3(1.,.58,.19)*(beam*.33+line1*.61)+vec3(.73,.88,1.)*line2*.22;
          gl_FragColor=vec4(warm,fade*.78);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    this.caustic.rotation.x = -Math.PI / 2;
    this.caustic.position.set(-0.5, -2.038, 0.8);
    this.scene.add(this.caustic);

    this.raycaster = new THREE.Raycaster();
    this.rayPointer = new THREE.Vector2();
    this.resize(1200, 800);
  }

  addPrism(geometry, material, position, rotation) {
    const prism = new THREE.Mesh(geometry, material);
    prism.position.fromArray(position);
    prism.rotation.set(...rotation);
    prism.userData.baseRotation = prism.rotation.clone();
    this.group.add(prism);
    this.prisms.push(prism);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), new THREE.LineBasicMaterial({ color: '#f8eddb', transparent: true, opacity: 0.15, depthWrite: false, fog: false }));
    prism.add(edge);
    return prism;
  }

  setCollection(items, index = 0) {
    this.items = items;
    this.setIndex(index);
  }

  setIndex(index) {
    if (!this.items.length) return;
    this.index = mod(index, this.items.length);
    const item = this.items[this.index];
    this.photoMaterial.map = this.getTexture(item);
    this.photoMaterial.needsUpdate = true;
    const ratio = clamp(item.width / item.height, 0.6, 1.6);
    const height = ratio > 1.15 ? 3.55 : 4.12;
    const width = height * ratio;
    this.photo.scale.set(width, height, 1);
    this.backing.scale.set(width + 0.025, height + 0.025, 1);
    this.photo.position.y = this.backing.position.y = 0.03 + (4.12 - height) * 0.13;
    // Anchor the optics to the actual photograph edge, including landscape imports.
    const left = this.photo.position.x - width / 2;
    this.prisms[0].position.x = left + 0.43;
    this.prisms[1].position.x = left + 0.13;
    this.prisms[0].scale.y = this.prisms[1].scale.y = height / 4.12;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.mobile = width < 720;
    this.camera.aspect = width / Math.max(1, height);
    const aspect = this.camera.aspect;
    const horizontalFit = 5.8 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * aspect);
    this.baseDistance = Math.max(this.preview ? 8.9 : 10.5, horizontalFit);
    this.camera.position.z = this.baseDistance;
    this.camera.updateProjectionMatrix();
    this.group.position.x = this.mobile || this.preview ? -0.2 : 0.36;
    this.group.position.y = this.mobile && !this.preview ? 0.55 : 0.18;
    this.camera.lookAt(0.15, this.mobile && !this.preview ? -0.08 : 0.05, 0);
  }

  update(dt, elapsed, input = {}) {
    const ease = 1 - Math.exp(-Math.min(dt, 0.05) * 6);
    const px = input.active ? input.x || 0 : 0;
    const py = input.active ? input.y || 0 : 0;
    this.pointer.lerp(new THREE.Vector2(px, py), ease);
    this.turn += (this.turnTarget - this.turn) * ease;
    this.tilt += (this.tiltTarget - this.tilt) * ease;
    const idle = this.reducedMotion ? 0 : Math.sin(elapsed * 0.26) * 0.025;
    this.group.rotation.y = this.turn + this.pointer.x * 0.12 + idle;
    this.group.rotation.x = this.tilt - this.pointer.y * 0.045;
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      prism.rotation.y = prism.userData.baseRotation.y + this.pointer.x * (0.22 + i * 0.035) + this.turn * 0.23;
    }
    this.caustic.material.uniforms.uTime.value = elapsed;
    this.caustic.material.uniforms.uAngle.value = this.group.rotation.y * 3 + this.pointer.x * 0.3;
  }

  drag(dx, dy) {
    this.turnTarget = clamp(this.turnTarget + dx * 1.8, -0.7, 0.7);
    this.tiltTarget = clamp(this.tiltTarget + dy * 0.6, -0.13, 0.13);
  }

  wheel(delta) {
    this.turnTarget = clamp(this.turnTarget + delta * 0.0018, -0.7, 0.7);
  }

  action() {
    this.turnTarget = this.tiltTarget = 0;
    return '重置光线';
  }

  pick(x, y) {
    this.rayPointer.set(x, y);
    this.raycaster.setFromCamera(this.rayPointer, this.camera);
    return this.raycaster.intersectObject(this.photo).length ? this.index : null;
  }

  dispose() {
    disposeObjects(this.scene);
    this.studio.dispose();
  }
}
