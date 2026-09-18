import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ResidenceActivity } from "@/content/characters/types";
import type { ResidenceWeather } from "@/lib/residence-weather";
import { createWindowWeather } from "./window-weather";
import { createCompanionCat, type CatAnchors, type CatSpot } from "./companion-cat";
import { restOn, surfaceAt } from "./placement";

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
  tilt?: number;
};
const palette = {
  background: 0x223642, grid: 0x46606b, cream: 0xfff4db,
  warmWhite: 0xfffbef, peach: 0xf3bd79, peachDeep: 0xd79055,
  coral: 0xeb786d, mint: 0x79b9a7, blue: 0x79aeba,
  wood: 0xa96845, charcoal: 0x34464c, leaf: 0x5b8d62,
};
function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}
function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.LineSegments)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

export function mountLowPolyResidenceScene({
  container, characterName, assetBasePath, activityRef, weatherRef, nightRef, waveUntil,
}: SceneOptions) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);
  const camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, 0.1, 80);
  camera.position.set(11.5, 10.5, 14.5);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", `${characterName}的低多边形居所与双色猫，可拖动查看；天气在窗内变化。`);
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.enableRotate = !reduceMotion;
  controls.minZoom = 0.78;
  controls.maxZoom = 2.4;
  controls.minPolarAngle = 0.06;
  controls.maxPolarAngle = Math.PI - 0.06;
  controls.target.set(0, 1.2, 0);

  const hemisphere = new THREE.HemisphereLight(0xfff4e0, 0x566c74, 2.1);
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight(0xffebd3, 3.1);
  keyLight.position.set(-7, 11, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.normalBias = 0.015;
  Object.assign(keyLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
  scene.add(keyLight);
  const deskLight = new THREE.PointLight(0xffce91, 0.25, 7, 2);
  deskLight.position.set(2.6, 2.2, -3.05);
  scene.add(deskLight);
  const greetingLight = new THREE.PointLight(0x8ed9c2, 0, 8, 2);
  greetingLight.position.set(0.2, 3.4, -3.4);
  scene.add(greetingLight);
  const box = (size: [number, number, number], position: [number, number, number], color: number, parent: THREE.Object3D = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const grid = new THREE.GridHelper(34, 34, palette.grid, palette.grid);
  grid.position.y = -0.47;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.3;
  scene.add(grid);
  box([12.2, 0.38, 8.8], [0, -0.24, 0], palette.peachDeep);
  box([11.85, 0.18, 8.45], [0, 0.04, 0], palette.peach);
  box([11.85, 4.9, 0.2], [0, 2.5, -4.12], palette.cream);
  box([0.2, 4.9, 5.2], [-5.92, 2.5, -1.52], palette.cream);
  box([0.2, 4.9, 1.12], [-5.92, 2.5, 3.66], palette.cream);
  box([0.2, 2.0, 1.9], [-5.92, 3.94, 2.15], palette.cream);
  box([11.92, 0.16, 0.26], [0, 0.9, -4], palette.wood);
  box([0.26, 0.16, 5.2], [-5.8, 0.9, -1.52], palette.wood);
  box([0.26, 0.16, 1.12], [-5.8, 0.9, 3.66], palette.wood);

  const windowGroup = new THREE.Group();
  windowGroup.name = "Window";
  windowGroup.position.set(0.65, 2.92, -3.99);
  scene.add(windowGroup);
  box([4.7, 2.55, 0.11], [0, 0, 0], palette.charcoal, windowGroup);
  const weatherWindow = createWindowWeather();
  windowGroup.add(weatherWindow.pane);
  box([0.09, 2.25, 0.18], [0, 0, 0.2], palette.warmWhite, windowGroup);
  box([4.38, 0.09, 0.18], [0, 0, 0.2], palette.warmWhite, windowGroup);
  box([5, 0.18, 0.42], [0, -1.34, 0.28], palette.wood, windowGroup);

  let disposed = false;
  const loads: Promise<void>[] = [];
  const modelColor = (materialName: string, asset: string) => {
    const name = materialName.toLowerCase();
    if (name.includes("plant")) return palette.leaf;
    if (name.includes("carpetwhite") || asset === "pillow") return palette.warmWhite;
    if (name.includes("carpetdarker")) return 0x659c8f;
    if (name.includes("carpet")) return asset === "rugRectangle" || asset === "bedSingle" ? palette.mint : palette.coral;
    if (name.includes("wooddark")) return palette.charcoal;
    if (name.includes("wood")) return asset === "bookcaseOpen" ? palette.wood : palette.peachDeep;
    if (name.includes("lamp")) return 0xffce6f;
    if (name.includes("metaldark")) return palette.charcoal;
    if (name.includes("metalmedium")) return palette.blue;
    if (name.includes("metal")) return palette.warmWhite;
    return palette.cream;
  };
  const loadAsset = ({ name, position, size, rotation = 0, tilt = 0 }: AssetSpec) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(...position);
    pivot.rotation.y = rotation;
    scene.add(pivot);
    const promise = new OBJLoader().loadAsync(`${assetBasePath}/models/kenney-furniture/${name}.obj`).then((object) => {
      if (disposed) { disposeObject(object); return; }
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const originals = Array.isArray(child.material) ? child.material : [child.material];
        const replacements = originals.map((original) => new THREE.MeshStandardMaterial({
          color: modelColor(original.name, name), roughness: 0.8, flatShading: true,
        }));
        originals.forEach((entry) => entry.dispose());
        child.material = replacements.length === 1 ? replacements[0] : replacements;
        child.castShadow = child.receiveShadow = true;
      });
      // Apply orientation before normalizing the base, so the pillow lies flat.
      object.rotation.x = tilt;
      object.updateMatrixWorld(true);
      const dimensions = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
      object.scale.setScalar(size / Math.max(dimensions.x, dimensions.y, dimensions.z));
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3());
      object.position.set(-center.x, -bounds.min.y, -center.z);
      pivot.add(object);
    });
    loads.push(promise);
    return pivot;
  };

  // Headboard against the back wall. Keep the left entrance and aisle clear.
  const bed = loadAsset({ name: "bedSingle", position: [-3.25, 0.14, -2.1], size: 3.45, rotation: Math.PI });
  const pillow = loadAsset({ name: "pillow", position: [-3.25, 0, -3.1], size: 1.03, rotation: Math.PI, tilt: -Math.PI / 2 });
  const desk = loadAsset({ name: "desk", position: [3.65, 0.14, -2.9], size: 2.8, rotation: Math.PI });
  const chair = loadAsset({ name: "chairDesk", position: [3.2, 0.14, -1.45], size: 1.25, rotation: Math.PI });
  const laptop = loadAsset({ name: "laptop", position: [3.35, 0, -3.12], size: 0.72, rotation: Math.PI });
  const lamp = loadAsset({ name: "lampRoundTable", position: [2.6, 0, -3.13], size: 0.66, rotation: Math.PI });
  const shelf = loadAsset({ name: "bookcaseOpen", position: [-5.2, 0.14, -2.8], size: 2.9, rotation: Math.PI / 2 });
  const books = loadAsset({ name: "books", position: [-5.12, 0, -2.8], size: 0.58, rotation: Math.PI / 2 });
  const sofa = loadAsset({ name: "loungeSofa", position: [0.5, 0.14, 3.15], size: 3.3 });
  const rug = loadAsset({ name: "rugRectangle", position: [0.5, 0.14, 1.3], size: 4.1 });
  const table = loadAsset({ name: "tableCoffee", position: [0.5, 0.17, 1.2], size: 1.95 });
  const radio = loadAsset({ name: "radio", position: [0.95, 0, 1.22], size: 0.49, rotation: Math.PI });
  loadAsset({ name: "pottedPlant", position: [4.95, 0.14, 2.7], size: 1.42 });
  loadAsset({ name: "doorwayOpen", position: [-5.82, 0.14, 2.15], size: 2.95, rotation: Math.PI / 2 });
  const readingBook = new THREE.Group();
  readingBook.name = "ReadingBook";
  readingBook.position.set(-0.08, 0, 1.12);
  scene.add(readingBook);
  box([0.57, 0.025, 0.45], [0, 0.018, 0], 0xfaf3db, readingBook);
  box([0.018, 0.03, 0.45], [0, 0.032, 0], 0xd6c4a9, readingBook);
  readingBook.rotation.y = -0.15;
  readingBook.visible = false;

  let cat: Awaited<ReturnType<typeof createCompanionCat>> | null = null;
  let roomReady = false;
  const anchors: CatAnchors = {
    floor: new THREE.Vector3(1.55, 0.14, -0.65),
    desk: new THREE.Vector3(4.45, 0, -2.85),
    bed: new THREE.Vector3(-3.25, 0, -1.5),
    sofa: new THREE.Vector3(0.7, 0, 3.04),
  };
  void Promise.all(loads).then(async () => {
    if (disposed) return;
    scene.updateMatrixWorld(true);
    restOn(pillow, bed);
    restOn(laptop, desk);
    restOn(lamp, desk);
    restOn(table, rug);
    restOn(radio, table);
    restOn(books, shelf, 1.6);
    restOn(readingBook, table);
    for (const [name, support] of [["bed", bed], ["desk", desk], ["sofa", sofa]] as const) {
      const anchor = anchors[name];
      const height = surfaceAt(support, anchor.x, anchor.z);
      if (height === undefined) throw new Error(`Missing cat anchor: ${name}`);
      anchor.y = height + 0.003;
    }
    const result = await createCompanionCat(`${assetBasePath}/models/residence-cat/companion-cat.glb`, anchors);
    if (disposed) { result.dispose(); return; }
    cat = result;
    scene.add(cat.root);
    roomReady = true;
    container.dataset.sceneReady = "true";
  }).catch((error) => {
    if (!disposed) { container.dataset.sceneReady = "error"; console.error("Residence assets failed to load", error); }
  });

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(5, Math.max(window.devicePixelRatio || 1, 1080 / width)));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const viewHeight = Math.max(9.8, 14.3 / aspect);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  let animationFrame = 0;
  const start = performance.now();
  let previous = start;
  let visible = true;
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  intersection.observe(container);
  const animate = () => {
    animationFrame = window.requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    if (!visible || document.hidden) return;
    const elapsed = (now - start) / 1000;
    const activity = activityRef.current;
    const night = nightRef.current;
    const weather = weatherRef.current;
    const greeting = now < waveUntil.current;
    const ease = 1 - Math.exp(-delta * 3);
    chair.position.z = THREE.MathUtils.lerp(chair.position.z, activity === "work" ? -1.67 : -1.45, ease);
    readingBook.visible = roomReady && activity === "read";
    deskLight.intensity = THREE.MathUtils.lerp(deskLight.intensity, activity === "work" ? 2.25 : night ? 0.7 : 0.2, ease);
    greetingLight.intensity = THREE.MathUtils.lerp(greetingLight.intensity, greeting ? 1.5 : 0, ease);
    keyLight.intensity = THREE.MathUtils.lerp(keyLight.intensity, night ? 1.65 : weather === "storm" ? 2.0 : 3.1, ease);
    hemisphere.intensity = THREE.MathUtils.lerp(hemisphere.intensity, night ? 1.5 : 2.1, ease);
    const roll = hashString(`${characterName}:cat:${Math.floor(Date.now() / 720_000)}`) % 12;
    let spot: CatSpot = roll < 5 ? "floor" : roll < 8 ? "sofa" : roll < 10 ? "desk" : "bed";
    if (activity === "cat") spot = "floor";
    if (activity === "work" && spot === "desk") spot = "sofa";
    cat?.update(delta, spot, greeting, reduceMotion);
    weatherWindow.update(weather, night, reduceMotion ? 0 : elapsed);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
  return () => {
    disposed = true;
    delete container.dataset.sceneReady;
    window.cancelAnimationFrame(animationFrame);
    observer.disconnect();
    intersection.disconnect();
    controls.dispose();
    cat?.dispose();
    weatherWindow.dispose();
    disposeObject(scene);
    renderer.dispose();
    renderer.domElement.remove();
  };
}
