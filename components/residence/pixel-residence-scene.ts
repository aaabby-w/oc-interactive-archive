import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  PixelResidenceAppearance,
  ResidenceActivity,
} from "@/content/characters/types";
import type { ResidenceWeather } from "@/lib/residence-weather";

type MutableValue<T> = { current: T };

type SceneOptions = {
  container: HTMLDivElement;
  characterName: string;
  appearance?: PixelResidenceAppearance;
  activityRef: MutableValue<ResidenceActivity>;
  weatherRef: MutableValue<ResidenceWeather>;
  nightRef: MutableValue<boolean>;
  waveUntil: MutableValue<number>;
};

const palette = {
  ink: 0x3f403b,
  darkestWood: 0x4c3d35,
  wood: 0x856b58,
  paleWood: 0xc6a784,
  cream: 0xf0ead7,
  creamShade: 0xd8d2c1,
  floorA: 0xded9c8,
  floorB: 0xcdd6c7,
  mint: 0x75aaa0,
  deepMint: 0x52746d,
  teal: 0x42777b,
  coral: 0xc9785b,
  blue: 0x6693a0,
  leaf: 0x66865d,
  darkLeaf: 0x4d7057,
};

function smooth(current: number, target: number, speed: number) {
  return THREE.MathUtils.lerp(current, target, speed);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDrapedQuiltGeometry() {
  const columns = 24;
  const rows = 20;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const mint = new THREE.Color(palette.mint);
  const paleMint = new THREE.Color(0xa8ccc0);
  const cream = new THREE.Color(palette.cream);

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const footT = THREE.MathUtils.smoothstep(u, 0.76, 1);
      const sideT = THREE.MathUtils.smoothstep(v, 0.78, 1);
      const drop = Math.max(footT * 0.68, sideT * 0.58);
      const foldStrength = 1 - Math.max(footT, sideT) * 0.66;
      const x = -0.58 + u * 1.72 + Math.sin(footT * Math.PI * 0.5) * 0.33;
      const z = -0.78 + v * 1.27 + Math.sin(sideT * Math.PI * 0.5) * 0.34;
      const folds = (
        Math.sin(u * Math.PI * 9 + v * 1.4) * 0.035
        + Math.sin(v * Math.PI * 6.5) * 0.018
      ) * foldStrength;
      const y = 1.43 - drop + folds;
      positions.push(x, y, z);

      const stripe = Math.floor(u * 10) % 3;
      const color = stripe === 1 ? cream : stripe === 2 ? paleMint : mint;
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const current = row * (columns + 1) + column;
      const next = current + columns + 1;
      indices.push(current, next, current + 1, current + 1, next, next + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function mountPixelResidenceScene({
  container,
  characterName,
  appearance,
  activityRef,
  weatherRef,
  nightRef,
  waveUntil,
}: SceneOptions) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const backgroundColor = new THREE.Color(0xbfd9d1);
  scene.background = backgroundColor;
  scene.fog = new THREE.Fog(0xbfd9d1, 15, 28);

  const camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, 0.1, 60);
  camera.position.set(10.5, 8.7, 12.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    `${characterName}的等距像素居所；角色会阅读、工作、休息、逗猫，也会暂时外出。可拖动查看。`,
  );
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableRotate = !reduceMotion;
  controls.minZoom = 0.82;
  controls.maxZoom = 1.5;
  controls.minPolarAngle = 0.06;
  controls.maxPolarAngle = Math.PI - 0.06;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.target.set(-0.1, 1.15, -0.2);

  scene.add(new THREE.HemisphereLight(0xfff4d8, 0x526a65, 2.7));
  const keyLight = new THREE.DirectionalLight(0xffe5bd, 4.2);
  keyLight.position.set(-5, 10, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  scene.add(keyLight);

  const toon = (color: number) => new THREE.MeshToonMaterial({ color });
  const box = (
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), toon(color));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: [number, number, number],
    color: number,
    parent: THREE.Object3D = scene,
    segments = 8,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
      toon(color),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const smoothMesh = (
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    color: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 }),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // A raised, tiled dollhouse base keeps the room legible as an isometric miniature.
  box([11.7, 0.38, 8.5], [0, -0.22, 0], palette.darkestWood);
  box([11.35, 0.18, 8.15], [0, 0, 0], palette.creamShade);
  const tileWidth = 11.05 / 8;
  const tileDepth = 7.85 / 6;
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      box(
        [tileWidth - 0.035, 0.055, tileDepth - 0.035],
        [-4.84 + column * tileWidth, 0.12, -3.27 + row * tileDepth],
        (row + column) % 2 ? palette.floorA : palette.floorB,
      );
    }
  }

  // Cutaway walls, dark timber outlines and wainscot bands.
  box([11.35, 4.9, 0.18], [0, 2.48, -4.08], palette.cream);
  // The side wall is built around a real doorway instead of placing a door
  // against a solid wall. The opening sits clear of both desk and bookshelf.
  box([0.18, 4.9, 5.33], [-5.67, 2.48, -1.41], 0xe5dfcc);
  box([0.18, 4.9, 1.2], [-5.67, 2.48, 3.48], 0xe5dfcc);
  box([0.18, 2.04, 1.63], [-5.67, 3.9, 2.06], 0xe5dfcc);
  box([11.5, 0.18, 0.24], [0, 1.03, -3.94], palette.paleWood);
  box([0.24, 0.18, 5.33], [-5.53, 1.03, -1.41], palette.paleWood);
  box([0.24, 0.18, 1.2], [-5.53, 1.03, 3.48], palette.paleWood);
  box([0.27, 2.88, 0.13], [-5.53, 1.48, 1.22], palette.darkestWood);
  box([0.27, 2.88, 0.13], [-5.53, 1.48, 2.88], palette.darkestWood);
  box([0.27, 0.16, 1.78], [-5.53, 2.88, 2.05], palette.darkestWood);
  for (let beam = -4.8; beam <= 4.8; beam += 1.6) {
    box([0.055, 4.55, 0.04], [beam, 2.42, -3.96], 0xd2c7b0);
  }
  box([11.3, 0.16, 0.22], [0, 4.82, -3.94], palette.darkestWood);
  box([0.22, 0.16, 8.1], [-5.53, 4.82, 0], palette.darkestWood);

  // Window and persistent weather layer.
  const windowFrame = new THREE.Group();
  windowFrame.position.set(0.2, 2.85, -3.94);
  scene.add(windowFrame);
  box([4.25, 2.55, 0.08], [0, 0, 0], palette.darkestWood, windowFrame);
  const windowPane = box([3.88, 2.18, 0.095], [0, 0, 0.07], 0xb8dfe0, windowFrame);
  box([0.1, 2.22, 0.13], [0, 0, 0.14], palette.cream, windowFrame);
  box([3.92, 0.1, 0.13], [0, 0, 0.14], palette.cream, windowFrame);
  box([4.58, 0.18, 0.42], [0, -1.34, 0.25], palette.paleWood, windowFrame);

  const weatherScene = new THREE.Group();
  weatherScene.position.z = 0.16;
  windowFrame.add(weatherScene);
  const sunGroup = new THREE.Group();
  sunGroup.position.set(1.3, 0.53, 0);
  weatherScene.add(sunGroup);
  box([0.38, 0.38, 0.05], [0, 0, 0], 0xffcf69, sunGroup);
  [[0, 0.39], [0, -0.39], [0.39, 0], [-0.39, 0]].forEach(([x, y]) => {
    box([0.08, 0.18, 0.04], [x, y, 0], 0xffcf69, sunGroup);
  });
  const moonGroup = new THREE.Group();
  moonGroup.position.set(1.25, 0.52, 0);
  weatherScene.add(moonGroup);
  box([0.42, 0.42, 0.05], [0, 0, 0], 0xffefbd, moonGroup);
  box([0.28, 0.34, 0.065], [0.14, 0.1, 0.02], 0x728b9b, moonGroup);
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(-0.3, 0.42, 0.03);
  weatherScene.add(cloudGroup);
  [[-0.55, 0, 0.72, 0.28], [0, 0.1, 0.94, 0.4], [0.58, -0.02, 0.62, 0.27]].forEach(([x, y, w, h]) => {
    box([w, h, 0.06], [x, y, 0], 0xf0eee1, cloudGroup);
  });
  const rainGroup = new THREE.Group();
  rainGroup.position.z = 0.06;
  weatherScene.add(rainGroup);
  for (let drop = 0; drop < 28; drop += 1) {
    const streak = box([0.026, 0.23, 0.026], [0, 0, 0], 0x6ea8b7, rainGroup);
    streak.userData.seedX = -1.8 + (drop * 0.73 % 3.6);
    streak.userData.seedY = -0.98 + (drop * 0.43 % 1.96);
    streak.position.x = streak.userData.seedX;
    streak.position.y = streak.userData.seedY;
    streak.rotation.z = -0.18;
  }
  const lightningGroup = new THREE.Group();
  lightningGroup.position.set(0.62, 0.12, 0.09);
  weatherScene.add(lightningGroup);
  box([0.11, 0.62, 0.06], [0, 0.18, 0], 0xffefae, lightningGroup).rotation.z = -0.35;
  box([0.11, 0.54, 0.06], [-0.12, -0.28, 0], 0xffefae, lightningGroup).rotation.z = 0.42;
  const rainbowGroup = new THREE.Group();
  rainbowGroup.position.set(0.3, -0.48, 0.08);
  weatherScene.add(rainbowGroup);
  [0xda9990, 0xe7c77f, 0x83b796, 0x8fa5c3].forEach((color, index) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.82 - index * 0.12, 0.038, 4, 18, Math.PI),
      new THREE.MeshToonMaterial({ color, transparent: true, opacity: 0.52 }),
    );
    arc.rotation.z = Math.PI;
    rainbowGroup.add(arc);
  });

  // Bed: every visible layer has its own contact plane, so the frame, mattress,
  // pillows and quilt read as a built object rather than overlapping blocks.
  const bed = new THREE.Group();
  bed.position.set(-3.55, 0, -2.48);
  scene.add(bed);
  [[-1.53, -0.84], [-1.53, 0.84], [1.53, -0.84], [1.53, 0.84]].forEach(([x, z]) => {
    box([0.22, 0.56, 0.22], [x, 0.42, z], palette.darkestWood, bed);
    box([0.3, 0.13, 0.3], [x, 0.17, z], palette.paleWood, bed);
  });
  box([3.42, 0.28, 0.16], [0, 0.64, -0.92], palette.darkestWood, bed);
  box([3.42, 0.28, 0.16], [0, 0.64, 0.92], palette.darkestWood, bed);
  box([0.18, 1.52, 2.0], [-1.67, 1.1, 0], palette.darkestWood, bed);
  box([0.14, 1.38, 1.82], [-1.55, 1.12, 0], palette.wood, bed);
  for (let slat = -0.66; slat <= 0.66; slat += 0.44) {
    box([0.08, 1.0, 0.14], [-1.46, 1.13, slat], palette.paleWood, bed);
  }
  box([0.16, 0.74, 2.0], [1.67, 0.73, 0], palette.darkestWood, bed);
  box([3.22, 0.34, 1.76], [0, 0.84, 0], palette.creamShade, bed);
  box([3.08, 0.25, 1.62], [0, 1.04, 0], palette.cream, bed);
  box([3.11, 0.045, 1.65], [0, 1.19, 0], 0xf7f0dd, bed);
  const pillow = box([0.86, 0.2, 0.7], [-1.03, 1.31, -0.38], 0xf7f1e2, bed);
  const secondPillow = box([0.82, 0.18, 0.64], [-1.03, 1.3, 0.39], 0xe5eadf, bed);
  box([0.72, 0.025, 0.53], [-1.03, 1.415, 0.39], 0xf3eee0, bed);
  const blanket = new THREE.Group();
  bed.add(blanket);
  const quilt = new THREE.Mesh(
    createDrapedQuiltGeometry(),
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  quilt.castShadow = true;
  quilt.receiveShadow = true;
  blanket.add(quilt);

  // Desk: drawers, books, paper, task lamp, laptop and a pulled-out chair.
  const desk = new THREE.Group();
  desk.position.set(2.95, 0, -2.55);
  scene.add(desk);
  box([3.35, 0.18, 1.25], [0, 1.33, 0], palette.wood, desk);
  box([0.76, 1.28, 1.08], [1.15, 0.65, 0], palette.darkestWood, desk);
  for (let drawer = 0; drawer < 3; drawer += 1) {
    box([0.62, 0.29, 0.94], [1.15, 0.35 + drawer * 0.38, 0], palette.paleWood, desk);
    box([0.13, 0.05, 0.08], [1.15, 0.35 + drawer * 0.38, 0.51], palette.ink, desk);
  }
  box([0.15, 1.28, 0.15], [-1.35, 0.65, -0.44], palette.darkestWood, desk);
  box([0.15, 1.28, 0.15], [-1.35, 0.65, 0.44], palette.darkestWood, desk);
  const laptop = new THREE.Group();
  laptop.position.set(-0.15, 1.48, -0.12);
  desk.add(laptop);
  const laptopFrame = box([0.88, 0.56, 0.09], [0, 0.27, -0.13], palette.ink, laptop);
  laptopFrame.rotation.x = -0.14;
  const laptopScreenMaterial = new THREE.MeshToonMaterial({
    color: 0x7fc1b4,
    emissive: 0x356b64,
    emissiveIntensity: 0.3,
  });
  const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.025), laptopScreenMaterial);
  laptopScreen.position.set(0, 0.28, -0.075);
  laptopScreen.rotation.x = -0.14;
  laptop.add(laptopScreen);
  box([0.94, 0.08, 0.62], [0, 0.01, 0.12], 0x66746e, laptop);
  box([0.6, 0.025, 0.25], [0, 0.065, 0.2], 0x4a5954, laptop);
  const deskLamp = new THREE.Group();
  deskLamp.position.set(-1.18, 1.45, -0.18);
  desk.add(deskLamp);
  cylinder(0.22, 0.25, 0.08, [0, 0, 0], palette.deepMint, deskLamp);
  box([0.08, 0.72, 0.08], [0, 0.36, 0], palette.deepMint, deskLamp).rotation.z = -0.28;
  const lampShade = cylinder(0.13, 0.3, 0.32, [0.12, 0.74, 0], palette.coral, deskLamp);
  lampShade.rotation.z = -0.28;
  box([0.52, 0.035, 0.35], [0.52, -0.08, 0.16], 0xf2ead6, laptop).rotation.y = -0.08;
  box([0.3, 0.09, 0.42], [0.84, 0, 0.18], palette.coral, laptop);
  const chair = new THREE.Group();
  chair.position.set(2.68, 0, -1.35);
  scene.add(chair);
  box([0.9, 0.16, 0.84], [0, 0.67, 0], palette.teal, chair);
  box([0.9, 1.0, 0.15], [0, 1.1, 0.34], palette.darkestWood, chair);
  [[-0.34, -0.28], [0.34, -0.28], [-0.34, 0.28], [0.34, 0.28]].forEach(([x, z]) => {
    box([0.12, 0.68, 0.12], [x, 0.32, z], palette.darkestWood, chair);
  });

  // Shelf and reading corner.
  const shelf = new THREE.Group();
  shelf.position.set(-4.78, 0, 0.66);
  scene.add(shelf);
  box([1.62, 3.18, 0.6], [0, 1.58, 0], palette.darkestWood, shelf);
  box([1.42, 2.96, 0.5], [0, 1.58, 0.05], palette.wood, shelf);
  for (let level = 0; level < 3; level += 1) {
    box([1.48, 0.1, 0.58], [0, 0.54 + level * 0.9, 0], palette.darkestWood, shelf);
    for (let book = 0; book < 5; book += 1) {
      box(
        [0.18, 0.48 + (book % 2) * 0.12, 0.34],
        [-0.51 + book * 0.26, 0.83 + level * 0.9, 0.08],
        [palette.mint, palette.coral, palette.creamShade, palette.blue][(book + level) % 4],
        shelf,
      );
    }
  }
  const readingChair = new THREE.Group();
  readingChair.position.set(-2.72, 0, 1.18);
  readingChair.rotation.y = 0.18;
  scene.add(readingChair);
  box([1.18, 0.38, 1.08], [0, 0.48, 0], palette.deepMint, readingChair);
  box([1.22, 1.22, 0.3], [0, 1.08, -0.42], palette.teal, readingChair);
  box([0.25, 0.74, 1.0], [-0.58, 0.75, 0], palette.darkestWood, readingChair);
  box([0.25, 0.74, 1.0], [0.58, 0.75, 0], palette.darkestWood, readingChair);
  const heldBook = new THREE.Group();
  box([0.58, 0.06, 0.52], [-0.29, 0, 0], palette.coral, heldBook).rotation.z = -0.12;
  box([0.58, 0.06, 0.52], [0.29, 0, 0], palette.coral, heldBook).rotation.z = 0.12;
  box([0.51, 0.025, 0.45], [-0.29, 0.055, 0], palette.cream, heldBook).rotation.z = -0.12;
  box([0.51, 0.025, 0.45], [0.29, 0.055, 0], palette.cream, heldBook).rotation.z = 0.12;
  heldBook.visible = false;
  scene.add(heldBook);

  // Wall details and plants build the denser, handmade pixel-room texture.
  const map = new THREE.Group();
  map.position.set(-2.96, 2.78, -3.94);
  scene.add(map);
  box([1.72, 1.08, 0.08], [0, 0, 0], palette.darkestWood, map);
  box([1.5, 0.86, 0.1], [0, 0, 0.07], 0x9bc7be, map);
  [[-0.45, 0.14], [-0.12, -0.12], [0.32, 0.2], [0.52, -0.18]].forEach(([x, y], index) => {
    box([0.36 + index * 0.04, 0.14, 0.03], [x, y, 0.14], index % 2 ? 0xd8c27c : 0x7a9f69, map);
  });
  const notice = new THREE.Group();
  notice.position.set(-5.54, 2.68, -0.86);
  notice.rotation.y = Math.PI / 2;
  scene.add(notice);
  box([1.5, 1.4, 0.08], [0, 0, 0], palette.paleWood, notice);
  [[-0.35, 0.3, palette.cream], [0.3, 0.34, 0xd9b9a0], [-0.2, -0.28, 0xadc6b0], [0.38, -0.2, 0xe2d398]].forEach(([x, y, color]) => {
    box([0.5, 0.38, 0.025], [x, y, 0.06], color, notice);
  });
  const plant = new THREE.Group();
  plant.position.set(4.82, 0, 2.86);
  scene.add(plant);
  cylinder(0.4, 0.32, 0.65, [0, 0.44, 0], palette.coral, plant);
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const angle = leaf / 7 * Math.PI * 2;
    const leafMesh = box(
      [0.3, 0.65, 0.22],
      [Math.cos(angle) * 0.3, 1.02 + (leaf % 3) * 0.16, Math.sin(angle) * 0.3],
      leaf % 2 ? palette.leaf : palette.darkLeaf,
      plant,
    );
    leafMesh.rotation.z = Math.cos(angle) * 0.5;
  }

  // Door is a pivoted object so leaving feels like a physical event.
  const doorMount = new THREE.Group();
  doorMount.position.set(-5.56, 0, 2.76);
  doorMount.rotation.y = Math.PI / 2;
  scene.add(doorMount);
  const doorPivot = new THREE.Group();
  doorMount.add(doorPivot);
  const door = box([1.42, 2.72, 0.18], [0.71, 1.36, 0], palette.deepMint, doorPivot);
  for (let panelY = 0.72; panelY < 2.2; panelY += 0.72) {
    box([1.02, 0.5, 0.06], [0.71, panelY, 0.12], 0x6f9188, doorPivot);
  }
  cylinder(0.08, 0.08, 0.09, [1.18, 1.34, 0.16], 0xd8bd7c, doorPivot).rotation.x = Math.PI / 2;
  door.userData.isDoor = true;

  // A smooth, conventionally modelled white cat contrasts with the room's
  // pixel-inspired furniture while keeping the same animated behaviour.
  const cat = new THREE.Group();
  cat.position.set(0.9, 0.52, 1.5);
  scene.add(cat);
  const catBody = smoothMesh(new THREE.SphereGeometry(0.46, 24, 16), [0, 0, 0], 0xf3eee2, cat);
  catBody.scale.set(1.08, 0.66, 0.68);
  const catHaunch = smoothMesh(new THREE.SphereGeometry(0.31, 20, 14), [-0.3, 0.02, 0], 0xe8e2d7, cat);
  catHaunch.scale.set(1.1, 0.9, 1.05);
  const catHead = new THREE.Group();
  catHead.position.set(0.44, 0.13, 0);
  cat.add(catHead);
  const catFace = smoothMesh(new THREE.SphereGeometry(0.29, 24, 16), [0, 0, 0], 0xf9f4e9, catHead);
  catFace.scale.set(1, 0.95, 1.02);
  const leftEar = smoothMesh(new THREE.ConeGeometry(0.135, 0.3, 16), [-0.04, 0.28, -0.16], 0xf3eee2, catHead);
  const rightEar = smoothMesh(new THREE.ConeGeometry(0.135, 0.3, 16), [-0.04, 0.28, 0.16], 0xf3eee2, catHead);
  leftEar.rotation.z = -0.1;
  rightEar.rotation.z = 0.1;
  const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xe7b9b3, roughness: 1 });
  [-0.16, 0.16].forEach((z) => {
    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.16, 12), innerEarMaterial);
    innerEar.position.set(0.07, 0.285, z);
    innerEar.rotation.z = -0.15;
    catHead.add(innerEar);
  });
  [-0.105, 0.105].forEach((z) => {
    const eye = smoothMesh(new THREE.SphereGeometry(0.046, 12, 8), [0.258, 0.035, z], 0x50646a, catHead);
    eye.scale.set(0.48, 1, 1);
    smoothMesh(new THREE.SphereGeometry(0.014, 8, 6), [0.278, 0.052, z - 0.012], 0xf8fbef, catHead);
  });
  smoothMesh(new THREE.SphereGeometry(0.035, 12, 8), [0.292, -0.045, 0], 0xc98284, catHead).scale.set(0.55, 0.72, 1);
  smoothMesh(new THREE.SphereGeometry(0.064, 12, 8), [0.248, -0.078, -0.055], 0xfffbf1, catHead).scale.set(0.72, 0.68, 1);
  smoothMesh(new THREE.SphereGeometry(0.064, 12, 8), [0.248, -0.078, 0.055], 0xfffbf1, catHead).scale.set(0.72, 0.68, 1);
  [-0.18, 0.18].forEach((z) => {
    const blush = smoothMesh(new THREE.CircleGeometry(0.048, 18), [0.275, -0.072, z], 0xe9a7a1, catHead);
    blush.rotation.y = Math.PI / 2;
  });
  const catPaws = new THREE.Group();
  cat.add(catPaws);
  smoothMesh(new THREE.SphereGeometry(0.13, 16, 10), [0.3, -0.27, -0.14], 0xf8f3e8, catPaws).scale.set(1.35, 0.75, 1);
  smoothMesh(new THREE.SphereGeometry(0.13, 16, 10), [0.3, -0.27, 0.14], 0xf8f3e8, catPaws).scale.set(1.35, 0.75, 1);
  const tail = new THREE.Group();
  tail.position.set(-0.4, 0.02, -0.05);
  cat.add(tail);
  smoothMesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.23, 0.18, -0.02),
        new THREE.Vector3(-0.36, 0.43, 0.01),
        new THREE.Vector3(-0.24, 0.68, 0.05),
      ]),
      18,
      0.072,
      10,
      false,
    ),
    [0, 0, 0],
    0xeee8dc,
    tail,
  );

  // Configurable, taller chibi rig. Small planes sit slightly proud of the face
  // and clothes to avoid z-fighting while preserving the crisp pixel silhouette.
  const look = {
    hairStyle: appearance?.hairStyle ?? "long",
    hair: appearance?.hairColor ?? 0xeee4c9,
    hairHighlight: appearance?.hairHighlight ?? 0xfffae9,
    hairShadow: 0xc8b99a,
    eye: appearance?.eyeColor ?? 0x3d89ad,
    skin: appearance?.skinColor ?? 0xedc5a6,
    primary: appearance?.outfitPrimary ?? palette.deepMint,
    secondary: appearance?.outfitSecondary ?? palette.creamShade,
    accent: appearance?.accentColor ?? palette.coral,
    neckwear: appearance?.neckwear ?? "scarf",
  };
  const character = new THREE.Group();
  scene.add(character);
  const figure = new THREE.Group();
  character.add(figure);
  const torso = new THREE.Group();
  torso.position.y = 1.55;
  figure.add(torso);
  const bodyMaterial = toon(look.primary);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.04, 0.5), bodyMaterial);
  body.castShadow = true;
  torso.add(body);
  box([0.84, 0.18, 0.54], [0, 0.42, 0], look.secondary, torso);
  box([0.92, 0.34, 0.58], [0, -0.43, 0], look.secondary, torso);
  box([0.98, 0.12, 0.6], [0, -0.58, 0], palette.darkestWood, torso);
  box([0.12, 0.62, 0.535], [0, 0.04, 0.02], look.accent, torso);
  box([0.14, 0.1, 0.57], [0, -0.22, 0.03], 0xd9b887, torso);
  box([0.21, 0.19, 0.07], [0, -0.22, 0.325], 0xd3b06f, torso);
  box([0.34, 0.12, 0.06], [-0.23, 0.27, 0.29], look.secondary, torso).rotation.z = -0.52;
  box([0.34, 0.12, 0.06], [0.23, 0.27, 0.29], look.secondary, torso).rotation.z = 0.52;
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.03;
  torso.add(headGroup);
  box([0.72, 0.72, 0.64], [0, 0, 0], look.skin, headGroup);
  box([0.82, 0.34, 0.7], [0, 0.3, -0.02], look.hair, headGroup);
  box([0.08, 0.34, 0.7], [-0.45, 0.3, -0.02], look.hairShadow, headGroup);
  box([0.08, 0.34, 0.7], [0.45, 0.3, -0.02], look.hairShadow, headGroup);
  box([0.82, 0.08, 0.7], [0, 0.51, -0.02], look.hairShadow, headGroup);
  box([0.16, 0.46, 0.11], [-0.29, 0.08, 0.34], look.hair, headGroup).rotation.z = -0.08;
  box([0.16, 0.42, 0.11], [-0.1, 0.14, 0.345], look.hairHighlight, headGroup).rotation.z = -0.16;
  box([0.16, 0.43, 0.11], [0.1, 0.13, 0.345], look.hair, headGroup).rotation.z = 0.13;
  box([0.14, 0.38, 0.11], [0.28, 0.08, 0.34], look.hairHighlight, headGroup).rotation.z = 0.08;
  box([0.16, 0.04, 0.045], [-0.16, 0.08, 0.35], 0xbba989, headGroup);
  box([0.16, 0.04, 0.045], [0.16, 0.08, 0.35], 0xbba989, headGroup);
  const leftEye = box([0.11, 0.14, 0.055], [-0.16, -0.015, 0.35], look.eye, headGroup);
  const rightEye = box([0.11, 0.14, 0.055], [0.16, -0.015, 0.35], look.eye, headGroup);
  box([0.035, 0.055, 0.025], [-0.14, 0.015, 0.385], 0xf8fbef, headGroup);
  box([0.035, 0.055, 0.025], [0.18, 0.015, 0.385], 0xf8fbef, headGroup);
  box([0.04, 0.035, 0.03], [0, -0.12, 0.37], 0xd69b83, headGroup);
  box([0.12, 0.035, 0.035], [0, -0.23, 0.37], 0xaf6469, headGroup);
  box([0.1, 0.055, 0.035], [-0.29, -0.12, 0.36], 0xe7a29a, headGroup);
  box([0.1, 0.055, 0.035], [0.29, -0.12, 0.36], 0xe7a29a, headGroup);

  const neckwear = new THREE.Group();
  neckwear.position.set(0, -0.44, 0);
  headGroup.add(neckwear);
  box([0.62, 0.15, 0.55], [0, 0, 0], look.accent, neckwear);
  if (look.neckwear === "scarf") {
    box([0.22, 0.22, 0.14], [0.22, -0.13, 0.28], 0x356c87, neckwear).rotation.z = 0.25;
    const scarfTail = box([0.2, 0.58, 0.12], [0.34, -0.38, -0.02], look.accent, neckwear);
    scarfTail.rotation.z = -0.24;
  } else {
    box([0.12, 0.14, 0.08], [0, -0.12, 0.3], 0xd8bb76, neckwear);
  }

  if (look.hairStyle === "ponytail") {
    const ponytail = new THREE.Group();
    ponytail.position.set(-0.36, 0.25, -0.34);
    headGroup.add(ponytail);
    box([0.42, 0.82, 0.42], [0, -0.17, 0], look.hair, ponytail);
    box([0.34, 0.6, 0.36], [-0.08, -0.67, 0], look.hairHighlight, ponytail).rotation.z = 0.12;
    box([0.24, 0.18, 0.46], [0.14, 0.2, 0], look.accent, ponytail);
  } else if (look.hairStyle === "long") {
    box([0.8, 1.08, 0.28], [0, -0.25, -0.34], look.hair, headGroup);
    box([0.08, 1.0, 0.28], [-0.44, -0.25, -0.34], look.hairShadow, headGroup);
    box([0.08, 1.0, 0.28], [0.44, -0.25, -0.34], look.hairShadow, headGroup);
    box([0.24, 0.9, 0.24], [-0.34, -0.34, -0.22], look.hairHighlight, headGroup).rotation.z = 0.06;
    box([0.24, 0.92, 0.24], [0.34, -0.34, -0.22], look.hair, headGroup).rotation.z = -0.06;
    box([0.18, 0.62, 0.18], [-0.32, -0.3, 0.23], look.hair, headGroup).rotation.z = 0.08;
    box([0.18, 0.64, 0.18], [0.32, -0.3, 0.23], look.hairHighlight, headGroup).rotation.z = -0.08;
  } else if (look.hairStyle === "bob") {
    box([0.86, 0.58, 0.7], [0, -0.12, -0.22], look.hair, headGroup);
  } else {
    box([0.72, 0.28, 0.74], [0, 0.18, -0.16], look.hair, headGroup);
  }

  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.5, 0.36, 0);
  rightArmPivot.position.set(0.5, 0.36, 0);
  torso.add(leftArmPivot, rightArmPivot);
  box([0.22, 0.76, 0.26], [0, -0.34, 0], look.primary, leftArmPivot);
  box([0.25, 0.16, 0.29], [0, -0.67, 0], look.secondary, leftArmPivot);
  box([0.2, 0.22, 0.22], [0, -0.86, 0], look.skin, leftArmPivot);
  box([0.22, 0.76, 0.26], [0, -0.34, 0], look.primary, rightArmPivot);
  box([0.25, 0.16, 0.29], [0, -0.67, 0], look.secondary, rightArmPivot);
  box([0.2, 0.22, 0.22], [0, -0.86, 0], look.skin, rightArmPivot);
  const legs = new THREE.Group();
  figure.add(legs);
  const leftLegPivot = new THREE.Group();
  const rightLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.21, 0.98, 0);
  rightLegPivot.position.set(0.21, 0.98, 0);
  legs.add(leftLegPivot, rightLegPivot);
  box([0.25, 0.72, 0.29], [0, -0.34, 0], 0x3f5662, leftLegPivot);
  box([0.3, 0.44, 0.34], [0, -0.7, 0], palette.darkestWood, leftLegPivot);
  box([0.34, 0.2, 0.52], [0, -0.9, 0.1], 0x3b3a38, leftLegPivot);
  box([0.25, 0.72, 0.29], [0, -0.34, 0], 0x3f5662, rightLegPivot);
  box([0.3, 0.44, 0.34], [0, -0.7, 0], palette.darkestWood, rightLegPivot);
  box([0.34, 0.2, 0.52], [0, -0.9, 0.1], 0x3b3a38, rightLegPivot);
  const sleepColor = new THREE.Color(0x8ca5aa);
  const dayColor = new THREE.Color(look.primary);

  // A dedicated under-the-quilt sleep pose avoids rotating the walking rig
  // through the mattress. Only the head and scarf edge remain above the covers.
  const sleepingFigure = new THREE.Group();
  sleepingFigure.position.set(-1.03, 1.48, -0.24);
  sleepingFigure.visible = false;
  bed.add(sleepingFigure);
  box([0.64, 0.28, 0.58], [0, 0, 0], look.skin, sleepingFigure);
  box([0.7, 0.2, 0.64], [-0.03, 0.17, -0.02], look.hair, sleepingFigure);
  box([0.18, 0.23, 0.12], [-0.23, 0.02, 0.3], look.hairHighlight, sleepingFigure);
  box([0.18, 0.23, 0.12], [0.22, 0.02, 0.3], look.hair, sleepingFigure);
  box([0.12, 0.025, 0.035], [-0.14, -0.02, 0.305], look.eye, sleepingFigure);
  box([0.12, 0.025, 0.035], [0.14, -0.02, 0.305], look.eye, sleepingFigure);
  box([0.34, 0.09, 0.58], [0.25, -0.19, 0], look.accent, sleepingFigure);

  const waypoints: Record<ResidenceActivity, THREE.Vector3> = {
    sleep: new THREE.Vector3(-2.68, 0.16, -1.28),
    work: new THREE.Vector3(2.72, 0.16, -1.45),
    read: new THREE.Vector3(-2.72, 0.16, 1.18),
    cat: new THREE.Vector3(0.02, 0.16, 1.48),
    idle: new THREE.Vector3(-0.25, 0.16, 0.08),
    away: new THREE.Vector3(-4.72, 0.16, 2.54),
  };
  character.position.copy(waypoints.idle);

  const skyColors = {
    day: new THREE.Color(0xb8dfe0),
    night: new THREE.Color(0x667e94),
    cloudy: new THREE.Color(0xb1c5c0),
    rain: new THREE.Color(0x789da5),
    storm: new THREE.Color(0x536c78),
    rainbow: new THREE.Color(0xc9ded2),
  };
  const startedAt = performance.now();
  const daytimeBackground = new THREE.Color(0xbfd9d1);
  const nighttimeBackground = new THREE.Color(0x738b91);
  let animationFrame = 0;
  const previousPosition = character.position.clone();
  type CatSpot = "floor" | "desk" | "bed";
  const catSpots: Record<CatSpot, { position: THREE.Vector3; rotation: number }> = {
    floor: { position: new THREE.Vector3(0.58, 0.52, 1.5), rotation: 0.05 },
    desk: { position: new THREE.Vector3(3.72, 1.64, -2.28), rotation: -Math.PI * 0.62 },
    bed: { position: new THREE.Vector3(-2.35, 1.68, -2.26), rotation: Math.PI * 0.18 },
  };
  const chooseCatSpot = (bucket: number): CatSpot => {
    const roll = hashString(`${characterName}:cat:${bucket}`) % 10;
    if (roll < 5) return "floor";
    if (roll < 8) return "desk";
    return "bed";
  };
  let catSpot = chooseCatSpot(Math.floor(Date.now() / 720_000));
  let catFrom = catSpots[catSpot].position.clone();
  let catMoveStartedAt = performance.now() - 2_000;
  cat.position.copy(catSpots[catSpot].position);

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    const pixelScale = width < 760 ? 0.76 : 0.9;
    renderer.setSize(Math.round(width * pixelScale), Math.round(height * pixelScale), false);
    const aspect = width / height;
    const viewHeight = width < 760 ? 10.3 : 8.7;
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const animate = () => {
    const elapsed = (performance.now() - startedAt) / 1000;
    const current = activityRef.current;
    const currentWeather = weatherRef.current;
    const night = nightRef.current;
    const target = waypoints[current];
    previousPosition.copy(character.position);
    character.position.lerp(target, reduceMotion ? 1 : 0.022);
    const distance = character.position.distanceTo(target);
    const walking = distance > 0.16;
    const movement = character.position.clone().sub(previousPosition);
    if (movement.lengthSq() > 0.000001) {
      const facing = Math.atan2(movement.x, movement.z);
      character.rotation.y = smooth(character.rotation.y, facing, 0.12);
    } else {
      const facingByState: Partial<Record<ResidenceActivity, number>> = {
        work: Math.PI,
        read: 0.35,
        cat: Math.PI / 2,
        idle: 0.28,
        sleep: Math.PI / 2,
        away: Math.PI,
      };
      character.rotation.y = smooth(character.rotation.y, facingByState[current] ?? 0, 0.08);
    }

    const sleeping = current === "sleep" && !walking;
    const working = current === "work" && !walking;
    const reading = current === "read" && !walking;
    const petting = current === "cat" && !walking;
    const away = current === "away" && !walking;
    const waving = performance.now() < waveUntil.current && !sleeping && !away;
    const walkCycle = Math.sin(elapsed * 8.2);

    figure.rotation.z = smooth(figure.rotation.z, 0, 0.07);
    figure.position.y = smooth(
      figure.position.y,
      working ? -0.36 : reading ? -0.42 : petting ? -0.14 : walking ? Math.abs(walkCycle) * 0.05 : Math.sin(elapsed * 2.1) * 0.025,
      0.12,
    );
    torso.rotation.x = smooth(torso.rotation.x, petting ? 0.38 : reading ? 0.12 : 0, 0.1);
    headGroup.rotation.x = smooth(headGroup.rotation.x, petting ? -0.25 : reading ? 0.22 : working ? 0.12 : 0, 0.1);
    leftLegPivot.rotation.x = smooth(leftLegPivot.rotation.x, walking ? walkCycle * 0.58 : working || reading ? -1.08 : 0, 0.18);
    rightLegPivot.rotation.x = smooth(rightLegPivot.rotation.x, walking ? -walkCycle * 0.58 : working || reading ? -1.08 : 0, 0.18);
    leftArmPivot.rotation.x = smooth(leftArmPivot.rotation.x, walking ? -walkCycle * 0.42 : working ? -1.22 + Math.sin(elapsed * 10) * 0.08 : reading ? -1.0 : petting ? -0.78 : 0, 0.15);
    rightArmPivot.rotation.x = smooth(rightArmPivot.rotation.x, walking ? walkCycle * 0.42 : working ? -1.22 - Math.sin(elapsed * 10) * 0.08 : reading ? -1.0 : petting ? -0.92 + Math.sin(elapsed * 4.2) * 0.18 : 0, 0.15);
    rightArmPivot.rotation.z = smooth(rightArmPivot.rotation.z, waving ? -1.75 + Math.sin(elapsed * 10) * 0.22 : petting ? -0.18 : 0, 0.18);
    leftArmPivot.rotation.z = smooth(leftArmPivot.rotation.z, reading ? 0.34 : 0, 0.12);
    bodyMaterial.color.lerp(sleeping ? sleepColor : dayColor, 0.07);
    leftEye.scale.y = smooth(leftEye.scale.y, 1, 0.16);
    rightEye.scale.y = smooth(rightEye.scale.y, 1, 0.16);
    figure.visible = !sleeping;
    sleepingFigure.visible = sleeping;

    heldBook.visible = reading;
    if (reading) {
      heldBook.position.set(character.position.x + 0.02, character.position.y + 1.14, character.position.z + 0.48);
      heldBook.rotation.y = character.rotation.y;
      heldBook.position.y += Math.sin(elapsed * 1.7) * 0.02;
    }
    blanket.position.y = smooth(blanket.position.y, sleeping ? 0.035 + Math.sin(elapsed * 1.25) * 0.014 : 0, 0.08);
    sleepingFigure.position.y = 1.48 + (sleeping ? Math.sin(elapsed * 1.25) * 0.012 : 0);
    pillow.rotation.z = sleeping ? Math.sin(elapsed * 0.8) * 0.008 : 0;
    secondPillow.rotation.z = sleeping ? -Math.sin(elapsed * 0.8) * 0.006 : 0;
    chair.position.z = smooth(chair.position.z, working ? -1.12 : -1.35, 0.06);
    laptopScreenMaterial.emissiveIntensity = smooth(
      laptopScreenMaterial.emissiveIntensity,
      working ? 0.95 + Math.sin(elapsed * 2.2) * 0.12 : 0.26,
      0.08,
    );
    deskLamp.rotation.z = smooth(deskLamp.rotation.z, working ? 0.04 : 0, 0.05);
    doorPivot.rotation.y = smooth(doorPivot.rotation.y, current === "away" ? -1.15 : 0, 0.055);
    character.visible = !away;

    const scheduledCatSpot = chooseCatSpot(Math.floor(Date.now() / 720_000));
    let desiredCatSpot: CatSpot = petting ? "floor" : scheduledCatSpot;
    if (working && desiredCatSpot === "desk") desiredCatSpot = "bed";
    if (sleeping && desiredCatSpot === "bed") desiredCatSpot = "desk";
    if (desiredCatSpot !== catSpot) {
      catFrom = cat.position.clone();
      catSpot = desiredCatSpot;
      catMoveStartedAt = performance.now();
    }
    const catMoveProgress = THREE.MathUtils.clamp((performance.now() - catMoveStartedAt) / 1_900, 0, 1);
    const catEase = 1 - Math.pow(1 - catMoveProgress, 3);
    cat.position.lerpVectors(catFrom, catSpots[catSpot].position, catEase);
    if (catMoveProgress < 1) cat.position.y += Math.sin(catMoveProgress * Math.PI) * 0.72;
    cat.rotation.y = smooth(cat.rotation.y, catSpots[catSpot].rotation, 0.08);
    const catLoafing = catSpot !== "floor" && catMoveProgress > 0.72;
    catBody.scale.y = smooth(catBody.scale.y, catLoafing ? 0.5 : 0.66, 0.1);
    catHaunch.scale.y = smooth(catHaunch.scale.y, catLoafing ? 0.72 : 0.9, 0.1);
    catHead.position.y = smooth(catHead.position.y, catLoafing ? 0.06 : 0.13, 0.1);
    catPaws.visible = !catLoafing;
    catHead.rotation.z = petting ? Math.sin(elapsed * 2.1) * 0.08 - 0.12 : Math.sin(elapsed * 0.8) * 0.04;
    tail.rotation.z = -0.95 + Math.sin(elapsed * (petting ? 3.2 : 1.7)) * 0.25;

    const raining = currentWeather === "rain" || currentWeather === "storm";
    sunGroup.visible = currentWeather === "clear" && !night;
    moonGroup.visible = currentWeather === "clear" && night;
    cloudGroup.visible = currentWeather === "cloudy" || raining || currentWeather === "rainbow";
    rainGroup.visible = raining;
    rainbowGroup.visible = currentWeather === "rainbow";
    lightningGroup.visible = currentWeather === "storm" && Math.sin(elapsed * 2.7) > 0.94;
    sunGroup.rotation.z = elapsed * 0.08;
    cloudGroup.position.x = -0.3 + Math.sin(elapsed * 0.16) * 0.16;
    rainGroup.children.forEach((drop) => {
      const speed = currentWeather === "storm" ? 1.45 : 0.88;
      drop.position.y = 0.98 - ((elapsed * speed + drop.userData.seedY + 2) % 2.0);
    });
    const skyTarget = currentWeather === "clear"
      ? night ? skyColors.night : skyColors.day
      : skyColors[currentWeather];
    (windowPane.material as THREE.MeshToonMaterial).color.lerp(skyTarget, 0.045);
    keyLight.intensity = smooth(keyLight.intensity, night ? 1.8 : raining ? 2.4 : 4.2, 0.025);
    backgroundColor.lerp(night ? nighttimeBackground : daytimeBackground, 0.02);

    controls.update();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  };
  animate();

  return () => {
    window.cancelAnimationFrame(animationFrame);
    observer.disconnect();
    controls.dispose();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
