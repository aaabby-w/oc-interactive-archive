import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ResidenceActivity } from "@/content/characters/types";
import type { ResidenceWeather } from "@/lib/residence-weather";

type MutableValue<T> = { current: T };

type SceneOptions = {
  container: HTMLDivElement;
  characterName: string;
  assetBasePath: string;
  activityRef: MutableValue<ResidenceActivity>;
  weatherRef: MutableValue<ResidenceWeather>;
  nightRef: MutableValue<boolean>;
  waveUntil: MutableValue<number>;
};

type AssetSpec = {
  name: string;
  position: [number, number, number];
  size: number;
  rotation?: number;
};

const palette = {
  background: 0x223642,
  grid: 0x46606b,
  cream: 0xfff4db,
  warmWhite: 0xfffbef,
  peach: 0xf3bd79,
  peachDeep: 0xd79055,
  coral: 0xeb786d,
  mint: 0x79b9a7,
  mintDeep: 0x477d76,
  blue: 0x79aeba,
  wood: 0xa96845,
  charcoal: 0x34464c,
  leaf: 0x5b8d62,
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

export function mountLowPolyResidenceScene({
  container,
  characterName,
  assetBasePath,
  activityRef,
  weatherRef,
  nightRef,
  waveUntil,
}: SceneOptions) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const backgroundColor = new THREE.Color(palette.background);
  scene.background = backgroundColor;
  scene.fog = new THREE.Fog(palette.background, 18, 35);

  const camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, 0.1, 80);
  camera.position.set(11.5, 9.5, 13.5);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    `${characterName}的等距低多边形居所；房间会随状态、时间与天气发生变化，可拖动查看。`,
  );
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.enableRotate = !reduceMotion;
  controls.minZoom = 0.78;
  controls.maxZoom = 1.7;
  controls.minPolarAngle = 0.06;
  controls.maxPolarAngle = Math.PI - 0.06;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.target.set(-0.15, 1.15, -0.15);

  const hemisphere = new THREE.HemisphereLight(0xfff1ce, 0x314954, 2.25);
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight(0xffe4b7, 4.4);
  keyLight.position.set(-7, 11, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.camera.left = -9;
  keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -9;
  scene.add(keyLight);

  const deskLight = new THREE.PointLight(0xffb968, 0.25, 7, 2);
  deskLight.position.set(2.65, 2.25, -2.45);
  scene.add(deskLight);
  const greetingLight = new THREE.PointLight(0x8ed9c2, 0, 8, 2);
  greetingLight.position.set(0.2, 3.4, -3.4);
  scene.add(greetingLight);

  const material = (color: number, roughness = 0.76) => new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    flatShading: true,
  });
  const box = (
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const lowSphere = (
    radius: number,
    position: [number, number, number],
    color: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 7), material(color));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const grid = new THREE.GridHelper(34, 34, palette.grid, palette.grid);
  grid.position.y = -0.47;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.33;
  scene.add(grid);

  // Clean dollhouse shell: solid contact planes and rounded visual hierarchy.
  box([12.2, 0.38, 8.8], [0, -0.24, 0], palette.peachDeep);
  box([11.85, 0.18, 8.45], [0, 0.04, 0], palette.peach);
  box([11.85, 4.9, 0.2], [0, 2.5, -4.12], palette.cream);
  box([0.2, 4.9, 5.2], [-5.92, 2.5, -1.52], palette.cream);
  box([0.2, 4.9, 1.12], [-5.92, 2.5, 3.66], palette.cream);
  box([0.2, 2.0, 1.9], [-5.92, 3.94, 2.15], palette.cream);
  box([11.92, 0.16, 0.26], [0, 0.9, -4], palette.wood);
  box([0.26, 0.16, 5.2], [-5.8, 0.9, -1.52], palette.wood);
  box([0.26, 0.16, 1.12], [-5.8, 0.9, 3.66], palette.wood);

  // Large weather window.
  const windowGroup = new THREE.Group();
  windowGroup.position.set(0.65, 2.92, -3.99);
  scene.add(windowGroup);
  box([4.7, 2.55, 0.11], [0, 0, 0], palette.charcoal, windowGroup);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: palette.blue,
    emissive: 0x29444d,
    emissiveIntensity: 0.28,
    roughness: 0.38,
  });
  const windowPane = new THREE.Mesh(new THREE.BoxGeometry(4.34, 2.2, 0.08), windowMaterial);
  windowPane.position.z = 0.08;
  windowGroup.add(windowPane);
  box([0.09, 2.25, 0.15], [0, 0, 0.15], palette.warmWhite, windowGroup);
  box([4.38, 0.09, 0.15], [0, 0, 0.15], palette.warmWhite, windowGroup);
  box([5, 0.18, 0.42], [0, -1.34, 0.28], palette.wood, windowGroup);

  const weatherScene = new THREE.Group();
  weatherScene.position.z = 0.22;
  windowGroup.add(weatherScene);
  const sunGroup = new THREE.Group();
  sunGroup.position.set(1.45, 0.48, 0);
  weatherScene.add(sunGroup);
  const sun = lowSphere(0.34, [0, 0, 0], 0xffcf61, sunGroup);
  sun.material = new THREE.MeshStandardMaterial({ color: 0xffcf61, emissive: 0xf0a83d, emissiveIntensity: 0.55 });
  const moonGroup = new THREE.Group();
  moonGroup.position.set(1.4, 0.5, 0);
  weatherScene.add(moonGroup);
  lowSphere(0.34, [0, 0, 0], 0xffedb5, moonGroup);
  const moonMask = lowSphere(0.29, [0.15, 0.08, 0.08], 0x5b7482, moonGroup);
  moonMask.castShadow = false;
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(-0.42, 0.38, 0.05);
  weatherScene.add(cloudGroup);
  [[-0.56, 0, 0.36], [0, 0.12, 0.5], [0.58, -0.02, 0.34]].forEach(([x, y, radius]) => {
    const cloud = lowSphere(radius, [x, y, 0], palette.warmWhite, cloudGroup);
    cloud.scale.y = 0.65;
    cloud.castShadow = false;
  });
  const rainGroup = new THREE.Group();
  weatherScene.add(rainGroup);
  for (let drop = 0; drop < 30; drop += 1) {
    const streak = box([0.025, 0.24, 0.025], [0, 0, 0], 0x78bad1, rainGroup);
    streak.castShadow = false;
    streak.userData.seedX = -2 + (drop * 0.79 % 4);
    streak.userData.seedY = -1.05 + (drop * 0.47 % 2.1);
    streak.position.x = streak.userData.seedX;
    streak.position.y = streak.userData.seedY;
    streak.rotation.z = -0.18;
  }
  const rainbowGroup = new THREE.Group();
  rainbowGroup.position.set(0.45, -0.48, 0.1);
  weatherScene.add(rainbowGroup);
  [0xe77b78, 0xf0c968, 0x74bd91, 0x7ca3cf].forEach((color, index) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.9 - index * 0.12, 0.035, 6, 28, Math.PI),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.68, emissive: color, emissiveIntensity: 0.12 }),
    );
    arc.rotation.z = Math.PI;
    rainbowGroup.add(arc);
  });

  const modelRoot = `${assetBasePath}/models/kenney-furniture/`;
  const loadedRoots: THREE.Group[] = [];
  let disposed = false;

  const modelMaterialColor = (materialName: string, assetName: string) => {
    const name = materialName.toLowerCase();
    if (name.includes("plant")) return palette.leaf;
    if (name.includes("carpetwhite")) return palette.warmWhite;
    if (name.includes("carpetdarker")) return 0xc85f57;
    if (name.includes("carpet")) return assetName === "rugRectangle" ? palette.mint : palette.coral;
    if (name.includes("wooddark")) return palette.charcoal;
    if (name.includes("wood")) return assetName === "bookcaseOpen" ? palette.wood : palette.peachDeep;
    if (name.includes("lamp")) return 0xffce6f;
    if (name.includes("metaldark")) return palette.charcoal;
    if (name.includes("metalmedium")) return palette.blue;
    if (name.includes("metal")) return palette.warmWhite;
    return palette.cream;
  };

  const loadAsset = ({ name, position, size, rotation = 0 }: AssetSpec) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(...position);
    pivot.rotation.y = rotation;
    scene.add(pivot);
    loadedRoots.push(pivot);

    const loader = new OBJLoader();
    loader.load(`${modelRoot}${name}.obj`, (object) => {
      if (disposed) return;
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const originals = Array.isArray(child.material) ? child.material : [child.material];
        const replacements = originals.map((original) => new THREE.MeshStandardMaterial({
          color: modelMaterialColor(original.name, name),
          roughness: 0.72,
          metalness: original.name.toLowerCase().includes("metal") ? 0.08 : 0.015,
          flatShading: true,
        }));
        originals.forEach((entry) => entry.dispose());
        child.material = replacements.length === 1 ? replacements[0] : replacements;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      const bounds = new THREE.Box3().setFromObject(object);
      const dimensions = bounds.getSize(new THREE.Vector3());
      const uniformScale = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
      object.scale.setScalar(uniformScale);
      object.updateMatrixWorld(true);
      const fittedBounds = new THREE.Box3().setFromObject(object);
      const center = fittedBounds.getCenter(new THREE.Vector3());
      object.position.set(-center.x, -fittedBounds.min.y, -center.z);
      pivot.add(object);
    });
    return pivot;
  };

  // Only the models used in this room are bundled; the original pixel furniture
  // and character rig are intentionally absent.
  const bed = loadAsset({ name: "bedSingle", position: [-3.65, 0.14, -2.55], size: 3.7, rotation: Math.PI / 2 });
  loadAsset({ name: "pillow", position: [-4.35, 1.18, -2.5], size: 0.78, rotation: Math.PI / 2 });
  const desk = loadAsset({ name: "desk", position: [3.25, 0.14, -2.7], size: 2.8, rotation: Math.PI });
  const deskChair = loadAsset({ name: "chairDesk", position: [3.05, 0.14, -1.35], size: 1.25, rotation: Math.PI });
  loadAsset({ name: "laptop", position: [3.22, 1.48, -2.72], size: 0.72, rotation: Math.PI });
  loadAsset({ name: "lampRoundTable", position: [2.25, 1.46, -2.74], size: 0.66, rotation: Math.PI });
  loadAsset({ name: "bookcaseOpen", position: [-5.18, 0.14, 0.05], size: 2.95, rotation: Math.PI / 2 });
  loadAsset({ name: "books", position: [-4.92, 1.42, 0.12], size: 0.58, rotation: Math.PI / 2 });
  loadAsset({ name: "loungeSofa", position: [-2.35, 0.14, 1.62], size: 2.45, rotation: 0.08 });
  loadAsset({ name: "rugRectangle", position: [-1.35, 0.145, 1.72], size: 3.7, rotation: Math.PI / 2 });
  loadAsset({ name: "tableCoffee", position: [-0.1, 0.14, 1.82], size: 1.45, rotation: Math.PI / 2 });
  loadAsset({ name: "radio", position: [-0.08, 0.78, 1.82], size: 0.58, rotation: -Math.PI / 2 });
  loadAsset({ name: "pottedPlant", position: [4.62, 0.14, 2.68], size: 1.42, rotation: -0.15 });
  loadAsset({ name: "doorwayOpen", position: [-5.82, 0.14, 2.15], size: 2.95, rotation: Math.PI / 2 });

  // A small open book gives state feedback without reintroducing a person rig.
  const readingBook = new THREE.Group();
  readingBook.position.set(-1.08, 0.82, 1.54);
  scene.add(readingBook);
  const leftPage = box([0.5, 0.035, 0.62], [-0.26, 0, 0], palette.warmWhite, readingBook);
  const rightPage = box([0.5, 0.035, 0.62], [0.26, 0, 0], palette.warmWhite, readingBook);
  leftPage.rotation.z = -0.08;
  rightPage.rotation.z = 0.08;
  readingBook.rotation.y = -0.22;

  // Friendly low-poly white cat, deliberately separate from the deleted OC rig.
  const cat = new THREE.Group();
  scene.add(cat);
  const catBody = lowSphere(0.42, [0, 0, 0], 0xf8f3e7, cat);
  catBody.scale.set(1.18, 0.72, 0.72);
  const catHead = new THREE.Group();
  catHead.position.set(0.42, 0.2, 0);
  cat.add(catHead);
  const catFace = lowSphere(0.29, [0, 0, 0], 0xfffbef, catHead);
  catFace.scale.set(0.95, 1, 1);
  [-0.16, 0.16].forEach((z) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 5), material(0xf8f3e7));
    ear.position.set(-0.04, 0.27, z);
    ear.rotation.z = z < 0 ? -0.12 : 0.12;
    ear.castShadow = true;
    catHead.add(ear);
    const eye = lowSphere(0.042, [0.255, 0.04, z * 0.66], 0x42606d, catHead);
    eye.scale.set(0.46, 1, 1);
    const blush = lowSphere(0.05, [0.25, -0.09, z], 0xe9a8a3, catHead);
    blush.scale.set(0.22, 0.7, 1);
  });
  lowSphere(0.035, [0.28, -0.035, 0], 0xc68082, catHead).scale.set(0.5, 0.8, 1);
  const tail = new THREE.Group();
  tail.position.set(-0.4, 0.04, 0);
  cat.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.26, 0.2, 0.02),
    new THREE.Vector3(-0.33, 0.5, 0.04),
    new THREE.Vector3(-0.15, 0.73, 0.02),
  ]);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.07, 6, false), material(0xf3eee2));
  tailMesh.castShadow = true;
  tail.add(tailMesh);

  type CatSpot = "floor" | "desk" | "bed" | "sofa";
  const catSpots: Record<CatSpot, { position: THREE.Vector3; rotation: number }> = {
    floor: { position: new THREE.Vector3(0.9, 0.55, 0.55), rotation: -0.35 },
    desk: { position: new THREE.Vector3(3.75, 1.64, -2.6), rotation: -Math.PI * 0.62 },
    bed: { position: new THREE.Vector3(-3.25, 1.5, -2.45), rotation: Math.PI * 0.2 },
    sofa: { position: new THREE.Vector3(-2.25, 1.16, 1.55), rotation: 0.1 },
  };
  const chooseCatSpot = (bucket: number): CatSpot => {
    const roll = hashString(`${characterName}:cat:${bucket}`) % 12;
    if (roll < 5) return "floor";
    if (roll < 8) return "sofa";
    if (roll < 10) return "desk";
    return "bed";
  };
  let catSpot = chooseCatSpot(Math.floor(Date.now() / 720_000));
  let catFrom = catSpots[catSpot].position.clone();
  let catMoveStartedAt = performance.now() - 2_000;
  cat.position.copy(catSpots[catSpot].position);

  const skyColors = {
    day: new THREE.Color(0x84bcc9),
    night: new THREE.Color(0x496579),
    cloudy: new THREE.Color(0x9db6b5),
    rain: new THREE.Color(0x668e9b),
    storm: new THREE.Color(0x425d6c),
    rainbow: new THREE.Color(0xaed3c5),
  };
  const daytimeBackground = new THREE.Color(palette.background);
  const nighttimeBackground = new THREE.Color(0x192a35);
  const startedAt = performance.now();
  let animationFrame = 0;

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    // Guarantee a roughly 1080px-wide drawing buffer while capping extreme DPR.
    const pixelRatio = Math.min(5, Math.max(window.devicePixelRatio || 1, 1080 / width));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const viewHeight = width < 760 ? 9.8 : 8.45;
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
    const greeting = performance.now() < waveUntil.current;

    const working = current === "work";
    const reading = current === "read";
    const sleeping = current === "sleep";
    const away = current === "away";
    const petting = current === "cat";

    deskChair.position.z = smooth(deskChair.position.z, working ? -1.7 : -1.35, 0.05);
    desk.rotation.y = smooth(desk.rotation.y, Math.PI, 0.08);
    bed.position.y = smooth(bed.position.y, sleeping ? 0.16 + Math.sin(elapsed * 1.2) * 0.012 : 0.14, 0.06);
    readingBook.visible = reading;
    readingBook.position.y = 0.82 + Math.sin(elapsed * 1.6) * 0.018;
    deskLight.intensity = smooth(deskLight.intensity, working ? 2.25 : night && !away ? 0.7 : 0.2, 0.04);
    greetingLight.intensity = greeting ? 2.2 + Math.sin(elapsed * 10) * 0.6 : smooth(greetingLight.intensity, 0, 0.12);
    keyLight.intensity = smooth(keyLight.intensity, away ? 1.15 : night ? 2.0 : currentWeather === "storm" ? 2.2 : 4.4, 0.025);
    hemisphere.intensity = smooth(hemisphere.intensity, away ? 1.15 : night ? 1.45 : 2.25, 0.025);

    let desiredCatSpot = petting ? "floor" as CatSpot : chooseCatSpot(Math.floor(Date.now() / 720_000));
    if (working && desiredCatSpot === "desk") desiredCatSpot = "sofa";
    if (sleeping && desiredCatSpot === "bed") desiredCatSpot = "sofa";
    if (desiredCatSpot !== catSpot) {
      catFrom = cat.position.clone();
      catSpot = desiredCatSpot;
      catMoveStartedAt = performance.now();
    }
    const catMoveProgress = THREE.MathUtils.clamp((performance.now() - catMoveStartedAt) / 1_900, 0, 1);
    const catEase = 1 - Math.pow(1 - catMoveProgress, 3);
    cat.position.lerpVectors(catFrom, catSpots[catSpot].position, catEase);
    if (catMoveProgress < 1) cat.position.y += Math.sin(catMoveProgress * Math.PI) * 0.74;
    cat.rotation.y = smooth(cat.rotation.y, catSpots[catSpot].rotation, 0.08);
    catHead.rotation.z = greeting || petting ? Math.sin(elapsed * 2.8) * 0.1 - 0.12 : Math.sin(elapsed * 0.8) * 0.035;
    tail.rotation.z = -0.95 + Math.sin(elapsed * (petting ? 3.2 : 1.6)) * 0.24;

    const raining = currentWeather === "rain" || currentWeather === "storm";
    sunGroup.visible = currentWeather === "clear" && !night;
    moonGroup.visible = currentWeather === "clear" && night;
    cloudGroup.visible = currentWeather === "cloudy" || raining || currentWeather === "rainbow";
    rainGroup.visible = raining;
    rainbowGroup.visible = currentWeather === "rainbow";
    sunGroup.rotation.z = elapsed * 0.06;
    cloudGroup.position.x = -0.42 + Math.sin(elapsed * 0.16) * 0.18;
    rainGroup.children.forEach((drop) => {
      const speed = currentWeather === "storm" ? 1.5 : 0.9;
      drop.position.y = 1.03 - ((elapsed * speed + drop.userData.seedY + 2.1) % 2.15);
    });
    const skyTarget = currentWeather === "clear"
      ? night ? skyColors.night : skyColors.day
      : skyColors[currentWeather];
    windowMaterial.color.lerp(skyTarget, 0.045);
    windowMaterial.emissiveIntensity = smooth(windowMaterial.emissiveIntensity, night ? 0.12 : 0.28, 0.04);
    backgroundColor.lerp(night ? nighttimeBackground : daytimeBackground, 0.02);

    controls.update();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  };
  animate();

  return () => {
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    observer.disconnect();
    controls.dispose();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((entry) => entry.dispose());
    });
    loadedRoots.length = 0;
    renderer.dispose();
    renderer.domElement.remove();
  };
}
