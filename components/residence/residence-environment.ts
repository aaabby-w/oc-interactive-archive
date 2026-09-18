import * as THREE from "three";
import type { ResidenceWeather } from "@/lib/residence-weather";

type Disposable = THREE.BufferGeometry | THREE.Material;

const daySky = new THREE.Color(0xbfd8d0);
const nightSky = new THREE.Color(0x20333c);
const rainSky = new THREE.Color(0x82989a);
const dayGround = new THREE.Color(0x9caf8f);
const nightGround = new THREE.Color(0x4c6561);

/**
 * A scene-wide exterior rather than a picture behind the window. The terrain
 * continues beneath the room, while hills, trees, clouds and weather occupy
 * real depth bands and share the room's directional light and shadows.
 */
export function createResidenceEnvironment(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "Residence_ExteriorEnvironment";
  scene.add(root);
  const resources = new Set<Disposable>();

  const material = (color: number, options: THREE.MeshStandardMaterialParameters = {}) => {
    const entry = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });
    resources.add(entry);
    return entry;
  };
  const mesh = <T extends THREE.BufferGeometry>(
    geometry: T,
    surface: THREE.Material,
    position: [number, number, number],
    parent: THREE.Object3D = root,
  ) => {
    resources.add(geometry);
    const object = new THREE.Mesh(geometry, surface);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };

  const groundMaterial = material(dayGround.getHex(), { roughness: 0.96 });
  const ground = mesh(new THREE.PlaneGeometry(70, 70), groundMaterial, [0, -0.055, -5]);
  ground.name = "Exterior_GroundAndUndersideScreen";
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  const hillMaterials = [
    material(0x94aa91, { flatShading: true }),
    material(0x799680, { flatShading: true }),
    material(0x648277, { flatShading: true }),
  ];
  const hillSpecs: Array<[number, number, number, number, number, number]> = [
    [-10, 0.35, -14.5, 8.8, 2.4, 2.5],
    [-3.8, 0.65, -15.8, 7.1, 3.0, 2.3],
    [3.2, 0.48, -15.1, 8.4, 2.6, 2.6],
    [10.4, 0.3, -14.8, 7.8, 2.2, 2.4],
  ];
  hillSpecs.forEach(([x, y, z, sx, sy, sz], index) => {
    const hill = mesh(new THREE.IcosahedronGeometry(1, 2), hillMaterials[index % hillMaterials.length], [x, y, z]);
    hill.name = `Exterior_Hill_${index + 1}`;
    hill.scale.set(sx, sy, sz);
  });

  const trunkMaterial = material(0x70634f, { roughness: 0.95 });
  const leafMaterial = material(0x607e67, { flatShading: true });
  const trees: THREE.Group[] = [];
  const treeSpecs: Array<[number, number, number, number]> = [
    [-7.5, -8.2, 1.2, 1.05],
    [-4.9, -9.8, 1.7, 0.8],
    [5.7, -9.5, 1.45, 0.94],
    [8.8, -8.4, 1.8, 0.72],
  ];
  treeSpecs.forEach(([x, z, height, scale], index) => {
    const tree = new THREE.Group();
    tree.name = `Exterior_Tree_${index + 1}`;
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    root.add(tree);
    const trunk = mesh(new THREE.CylinderGeometry(0.11, 0.17, height, 8), trunkMaterial, [0, height / 2, 0], tree);
    trunk.castShadow = true;
    const crown = mesh(new THREE.IcosahedronGeometry(1, 1), leafMaterial, [0, height + 0.42, 0], tree);
    crown.scale.set(0.72, 0.92, 0.72);
    trees.push(tree);
  });

  const cloudMaterial = material(0xf4f0df, { transparent: true, opacity: 0.72, depthWrite: false });
  const cloudOrigins = [
    new THREE.Vector3(-5.7, 6.4, -13.2),
    new THREE.Vector3(1.7, 7.15, -15.0),
    new THREE.Vector3(7.1, 5.8, -12.8),
  ];
  const clouds = cloudOrigins.map((position, index) => {
    const cloud = new THREE.Group();
    cloud.name = `Exterior_Cloud_${index + 1}`;
    cloud.position.copy(position);
    root.add(cloud);
    [[-0.7, 0, 0, 0.72], [0, 0.18, 0, 0.95], [0.82, -0.02, 0, 0.66]].forEach(([x, y, z, scale]) => {
      const puff = mesh(new THREE.SphereGeometry(0.8, 16, 10), cloudMaterial, [x, y, z], cloud);
      puff.scale.set(scale, scale * 0.62, scale);
      puff.castShadow = true;
      puff.receiveShadow = false;
    });
    return cloud;
  });

  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xf9df9a, toneMapped: false });
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xdfe9e2, toneMapped: false });
  resources.add(sunMaterial); resources.add(moonMaterial);
  const sun = mesh(new THREE.SphereGeometry(0.48, 24, 16), sunMaterial, [5.4, 7.8, -16.2]);
  sun.name = "Exterior_Sun"; sun.castShadow = false; sun.receiveShadow = false;
  const moon = mesh(new THREE.SphereGeometry(0.4, 24, 16), moonMaterial, [5.6, 7.6, -16.1]);
  moon.name = "Exterior_Moon"; moon.castShadow = false; moon.receiveShadow = false;

  const rainbow = new THREE.Group();
  rainbow.name = "Exterior_Rainbow";
  rainbow.position.set(-0.8, 1.0, -15.2);
  root.add(rainbow);
  [0xd6a0a3, 0xe4be8e, 0xc6d09a, 0x84b8b5, 0x9ea7c4].forEach((color, index) => {
    const arcMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, toneMapped: false });
    resources.add(arcMaterial);
    const arc = mesh(new THREE.TorusGeometry(4.3 - index * 0.13, 0.055, 6, 70, Math.PI), arcMaterial, [0, 0, 0], rainbow);
    arc.castShadow = false;
    arc.receiveShadow = false;
  });

  const rainCount = 96;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainSeeds = Array.from({ length: rainCount }, (_, index) => ({
    x: ((index * 71) % 211) / 211 * 20 - 10,
    y: ((index * 47) % 193) / 193 * 8 + 0.5,
    z: -5 - ((index * 61) % 173) / 173 * 10,
    speed: 2.8 + (index % 7) * 0.24,
  }));
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  resources.add(rainGeometry);
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0xdcece8, transparent: true, opacity: 0.34, depthWrite: false });
  resources.add(rainMaterial);
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.name = "Exterior_RainVolume";
  rain.frustumCulled = false;
  root.add(rain);

  const fog = new THREE.FogExp2(daySky.getHex(), 0.022);
  scene.fog = fog;

  const updateRain = (time: number, storm: boolean) => {
    rainSeeds.forEach((seed, index) => {
      const y = ((seed.y - time * seed.speed) % 8.5 + 8.5) % 8.5 + 0.15;
      const x = seed.x + Math.sin(time * 0.32 + index) * (storm ? 0.32 : 0.12);
      const offset = index * 6;
      rainPositions[offset] = x;
      rainPositions[offset + 1] = y;
      rainPositions[offset + 2] = seed.z;
      rainPositions[offset + 3] = x - (storm ? 0.16 : 0.08);
      rainPositions[offset + 4] = y - (storm ? 0.6 : 0.42);
      rainPositions[offset + 5] = seed.z;
    });
    rainGeometry.attributes.position.needsUpdate = true;
  };

  let lastNight = false;
  let lastWeather: ResidenceWeather = "clear";
  const update = (weather: ResidenceWeather, night: boolean, time: number, reduceMotion: boolean) => {
    const raining = weather === "rain" || weather === "storm";
    const sky = night ? nightSky : raining ? rainSky : daySky;
    scene.background = sky;
    fog.color.copy(sky);
    fog.density = raining ? 0.032 : night ? 0.027 : 0.022;
    groundMaterial.color.copy(night ? nightGround : dayGround);
    hillMaterials.forEach((entry, index) => {
      const color = night ? [0x49625f, 0x3f5957, 0x354d4d][index] : raining ? [0x81948b, 0x72877f, 0x617970][index] : [0x94aa91, 0x799680, 0x648277][index];
      entry.color.setHex(color);
    });
    leafMaterial.color.setHex(night ? 0x3f5d52 : raining ? 0x587668 : 0x607e67);
    sun.visible = !night && !raining;
    moon.visible = night && !raining;
    rainbow.visible = weather === "rainbow" && !night;
    rain.visible = raining;
    rainMaterial.opacity = weather === "storm" ? 0.46 : 0.3;
    cloudMaterial.opacity = raining ? 0.9 : night ? 0.46 : 0.68;
    clouds.forEach((cloud, index) => {
      cloud.position.x = cloudOrigins[index].x + (reduceMotion ? 0 : Math.sin(time * 0.11 + index * 2.1) * 0.22);
    });
    if (raining && !reduceMotion) updateRain(time, weather === "storm");
    if (night !== lastNight || weather !== lastWeather) {
      root.updateMatrixWorld(true);
      lastNight = night;
      lastWeather = weather;
    }
  };

  update("clear", false, 0, true);
  return {
    root,
    update,
    dispose: () => {
      scene.remove(root);
      if (scene.fog === fog) scene.fog = null;
      resources.forEach((entry) => entry.dispose());
    },
  };
}
