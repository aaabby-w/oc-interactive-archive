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

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
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
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minAzimuthAngle = -Math.PI * 0.29;
  controls.maxAzimuthAngle = Math.PI * 0.08;
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
  box([0.18, 4.9, 8.15], [-5.67, 2.48, 0], 0xe5dfcc);
  box([11.5, 0.18, 0.24], [0, 1.03, -3.94], palette.paleWood);
  box([0.24, 0.18, 8.18], [-5.53, 1.03, 0], palette.paleWood);
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

  // Bed: striped textile, carved frame, pillow and a blanket that reacts to sleep.
  const bed = new THREE.Group();
  bed.position.set(-3.55, 0, -2.48);
  scene.add(bed);
  box([3.45, 0.34, 2.0], [0, 0.38, 0], palette.darkestWood, bed);
  box([3.2, 0.28, 1.82], [0, 0.68, 0], palette.cream, bed);
  box([3.28, 1.18, 0.18], [0, 1.05, -0.93], palette.wood, bed);
  for (let slat = -1.25; slat <= 1.25; slat += 0.5) {
    box([0.18, 0.8, 0.08], [slat, 1.12, -0.82], palette.paleWood, bed);
  }
  const pillow = box([0.92, 0.22, 0.68], [-1.03, 0.91, -0.36], 0xf4eedf, bed);
  const blanket = new THREE.Group();
  bed.add(blanket);
  box([1.92, 0.2, 1.7], [0.48, 0.9, 0], palette.mint, blanket);
  for (let stripe = -0.28; stripe <= 1.2; stripe += 0.5) {
    box([0.18, 0.025, 1.72], [stripe, 1.015, 0], palette.cream, blanket);
  }

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
  readingChair.position.set(-3.45, 0, 0.94);
  readingChair.rotation.y = 0.34;
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
  notice.position.set(-5.54, 2.68, 2.55);
  notice.rotation.y = Math.PI / 2;
  scene.add(notice);
  box([1.5, 1.4, 0.08], [0, 0, 0], palette.paleWood, notice);
  [[-0.35, 0.3, palette.cream], [0.3, 0.34, 0xd9b9a0], [-0.2, -0.28, 0xadc6b0], [0.38, -0.2, 0xe2d398]].forEach(([x, y, color]) => {
    box([0.5, 0.38, 0.025], [x, y, 0.06], color, notice);
  });
  const plant = new THREE.Group();
  plant.position.set(-4.72, 0, 3.13);
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
  const doorPivot = new THREE.Group();
  doorPivot.position.set(4.55, 0, -3.91);
  scene.add(doorPivot);
  const door = box([1.42, 2.72, 0.18], [0.71, 1.36, 0], palette.deepMint, doorPivot);
  for (let panelY = 0.72; panelY < 2.2; panelY += 0.72) {
    box([1.02, 0.5, 0.06], [0.71, panelY, 0.12], 0x6f9188, doorPivot);
  }
  cylinder(0.08, 0.08, 0.09, [1.18, 1.34, 0.16], 0xd8bd7c, doorPivot).rotation.x = Math.PI / 2;
  door.userData.isDoor = true;

  // A small articulated cat for the petting interaction.
  const cat = new THREE.Group();
  cat.position.set(0.9, 0.31, 1.5);
  scene.add(cat);
  box([0.8, 0.38, 0.46], [0, 0, 0], 0x706a60, cat);
  const catHead = new THREE.Group();
  catHead.position.set(0.49, 0.18, 0);
  cat.add(catHead);
  box([0.42, 0.43, 0.42], [0, 0, 0], 0x81796d, catHead);
  box([0.14, 0.22, 0.12], [-0.13, 0.29, 0], 0x81796d, catHead).rotation.z = -0.3;
  box([0.14, 0.22, 0.12], [0.13, 0.29, 0], 0x81796d, catHead).rotation.z = 0.3;
  box([0.06, 0.06, 0.035], [-0.11, 0.05, 0.23], palette.ink, catHead);
  box([0.06, 0.06, 0.035], [0.11, 0.05, 0.23], palette.ink, catHead);
  const tail = new THREE.Group();
  tail.position.set(-0.44, 0.05, 0);
  cat.add(tail);
  const tailMesh = box([0.1, 0.78, 0.1], [0, 0.34, 0], 0x706a60, tail);
  tailMesh.rotation.z = -0.6;

  // Configurable chibi: layered hair, clothing, joints and readable face.
  const look = {
    hairStyle: appearance?.hairStyle ?? "ponytail",
    hair: appearance?.hairColor ?? 0x9a6048,
    hairHighlight: appearance?.hairHighlight ?? 0xc77c55,
    skin: appearance?.skinColor ?? 0xedc5a6,
    primary: appearance?.outfitPrimary ?? palette.deepMint,
    secondary: appearance?.outfitSecondary ?? palette.creamShade,
    accent: appearance?.accentColor ?? palette.coral,
  };
  const character = new THREE.Group();
  scene.add(character);
  const figure = new THREE.Group();
  character.add(figure);
  const torso = new THREE.Group();
  torso.position.y = 1.35;
  figure.add(torso);
  const bodyMaterial = toon(look.primary);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.54), bodyMaterial);
  body.castShadow = true;
  torso.add(body);
  box([1.05, 0.2, 0.62], [0, -0.2, 0], look.secondary, torso);
  box([0.9, 0.16, 0.64], [0, -0.48, 0], palette.darkestWood, torso);
  box([0.16, 0.2, 0.66], [0, -0.1, 0.03], look.accent, torso);
  box([0.72, 0.17, 0.6], [0, 0.48, 0], look.secondary, torso);
  const scarfTail = box([0.24, 0.68, 0.12], [0.36, 0.12, -0.35], look.accent, torso);
  scarfTail.rotation.z = -0.22;
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.0;
  torso.add(headGroup);
  box([0.78, 0.74, 0.7], [0, 0, 0], look.skin, headGroup);
  box([0.88, 0.36, 0.76], [0, 0.29, -0.02], look.hair, headGroup);
  box([0.22, 0.48, 0.13], [-0.31, 0.06, 0.34], look.hair, headGroup);
  box([0.18, 0.4, 0.13], [0.02, 0.13, 0.35], look.hairHighlight, headGroup).rotation.z = -0.16;
  box([0.2, 0.42, 0.13], [0.27, 0.11, 0.34], look.hair, headGroup).rotation.z = 0.14;
  const leftEye = box([0.09, 0.12, 0.055], [-0.16, -0.02, 0.37], palette.ink, headGroup);
  const rightEye = box([0.09, 0.12, 0.055], [0.16, -0.02, 0.37], palette.ink, headGroup);
  box([0.14, 0.045, 0.04], [0, -0.22, 0.37], 0xa65e57, headGroup);
  if (look.hairStyle === "ponytail") {
    const ponytail = new THREE.Group();
    ponytail.position.set(-0.36, 0.25, -0.34);
    headGroup.add(ponytail);
    box([0.42, 0.82, 0.42], [0, -0.17, 0], look.hair, ponytail);
    box([0.34, 0.6, 0.36], [-0.08, -0.67, 0], look.hairHighlight, ponytail).rotation.z = 0.12;
    box([0.24, 0.18, 0.46], [0.14, 0.2, 0], look.accent, ponytail);
  } else if (look.hairStyle === "bob") {
    box([0.86, 0.58, 0.7], [0, -0.12, -0.22], look.hair, headGroup);
  } else {
    box([0.72, 0.28, 0.74], [0, 0.18, -0.16], look.hair, headGroup);
  }

  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.57, 0.35, 0);
  rightArmPivot.position.set(0.57, 0.35, 0);
  torso.add(leftArmPivot, rightArmPivot);
  box([0.24, 0.72, 0.28], [0, -0.32, 0], look.primary, leftArmPivot);
  box([0.22, 0.22, 0.24], [0, -0.73, 0], look.skin, leftArmPivot);
  box([0.24, 0.72, 0.28], [0, -0.32, 0], look.primary, rightArmPivot);
  box([0.22, 0.22, 0.24], [0, -0.73, 0], look.skin, rightArmPivot);
  const legs = new THREE.Group();
  figure.add(legs);
  const leftLegPivot = new THREE.Group();
  const rightLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.23, 0.84, 0);
  rightLegPivot.position.set(0.23, 0.84, 0);
  legs.add(leftLegPivot, rightLegPivot);
  box([0.28, 0.78, 0.32], [0, -0.37, 0], 0x455a58, leftLegPivot);
  box([0.34, 0.24, 0.52], [0, -0.77, 0.1], palette.darkestWood, leftLegPivot);
  box([0.28, 0.78, 0.32], [0, -0.37, 0], 0x455a58, rightLegPivot);
  box([0.34, 0.24, 0.52], [0, -0.77, 0.1], palette.darkestWood, rightLegPivot);
  const sleepColor = new THREE.Color(0x8ca5aa);
  const dayColor = new THREE.Color(look.primary);

  const waypoints: Record<ResidenceActivity, THREE.Vector3> = {
    sleep: new THREE.Vector3(-3.72, 0.82, -2.35),
    work: new THREE.Vector3(2.72, 0.03, -1.45),
    read: new THREE.Vector3(-3.45, 0.03, 0.98),
    cat: new THREE.Vector3(0.08, 0.03, 1.48),
    idle: new THREE.Vector3(-0.25, 0.03, 0.08),
    away: new THREE.Vector3(4.85, 0.03, -3.2),
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

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    const pixelScale = width < 760 ? 0.52 : 0.68;
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

    figure.rotation.z = smooth(figure.rotation.z, sleeping ? -Math.PI / 2 : 0, 0.07);
    figure.position.y = smooth(
      figure.position.y,
      sleeping ? 0.28 : working || reading ? -0.34 : petting ? -0.2 : walking ? Math.abs(walkCycle) * 0.05 : Math.sin(elapsed * 2.1) * 0.025,
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
    leftEye.scale.y = smooth(leftEye.scale.y, sleeping ? 0.18 : 1, 0.16);
    rightEye.scale.y = smooth(rightEye.scale.y, sleeping ? 0.18 : 1, 0.16);

    heldBook.visible = reading;
    if (reading) {
      heldBook.position.set(character.position.x + 0.02, character.position.y + 1.14, character.position.z + 0.48);
      heldBook.rotation.y = character.rotation.y;
      heldBook.position.y += Math.sin(elapsed * 1.7) * 0.02;
    }
    blanket.position.y = smooth(blanket.position.y, sleeping ? 0.14 : 0, 0.08);
    pillow.rotation.z = sleeping ? Math.sin(elapsed * 1.2) * 0.015 : 0;
    chair.position.z = smooth(chair.position.z, working ? -1.12 : -1.35, 0.06);
    laptopScreenMaterial.emissiveIntensity = smooth(
      laptopScreenMaterial.emissiveIntensity,
      working ? 0.95 + Math.sin(elapsed * 2.2) * 0.12 : 0.26,
      0.08,
    );
    deskLamp.rotation.z = smooth(deskLamp.rotation.z, working ? 0.04 : 0, 0.05);
    doorPivot.rotation.y = smooth(doorPivot.rotation.y, current === "away" ? -1.15 : 0, 0.055);
    character.visible = !away;

    cat.position.x = smooth(cat.position.x, petting ? 0.54 : 0.9 + Math.sin(elapsed * 0.28) * 0.2, 0.04);
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
