import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type CatSpot = "floor" | "desk" | "bed" | "sofa";
export type CatAnchors = Record<CatSpot, THREE.Vector3>;
type Step = { point: THREE.Vector3; jump: boolean };

// Floor routes lead around the reading area and chair, then jump onto furniture.
const approaches: Record<CatSpot, [number, number][]> = {
  floor: [],
  bed: [[-1.45, -0.65], [-1.7, -1.5]],
  desk: [[4.45, -0.5], [4.45, -1.55]],
  sofa: [[3.6, -0.65], [3.6, 3.1], [2.7, 3.1]],
};

export async function createCompanionCat(url: string, anchors: CatAnchors) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = new THREE.Group();
  root.name = "Companion_OriginalBicolorCat";
  root.add(gltf.scene);
  gltf.scene.scale.setScalar(0.62);
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      // The mesh deforms beyond its bind-pose bounds during its original clips.
      object.frustumCulled = false;
    }
  });
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const actions = new Map(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
  let currentAction = "";
  const play = (name: string) => {
    if (name === currentAction) return;
    actions.get(currentAction)?.fadeOut(0.24);
    const action = actions.get(name);
    action?.reset().fadeIn(0.24).play();
    currentAction = name;
  };
  let spot: CatSpot = "floor";
  let destination: CatSpot = "floor";
  let pending: Step[] = [];
  const from = anchors.floor.clone();
  let step: Step | null = null;
  let progress = 0;
  let duration = 1;
  root.position.copy(anchors.floor);
  root.rotation.y = 0.5;
  play("Idle");

  const requestSpot = (next: CatSpot) => {
    if (next === destination || step || pending.length) return;
    destination = next;
    const exit = approaches[spot];
    if (exit.length) {
      const [x, z] = exit[exit.length - 1];
      pending.push({ point: new THREE.Vector3(x, 0.14, z), jump: true });
      for (const [x, z] of exit.slice(0, -1).reverse()) pending.push({ point: new THREE.Vector3(x, 0.14, z), jump: false });
      pending.push({ point: anchors.floor.clone(), jump: false });
    }
    for (const [x, z] of approaches[next]) pending.push({ point: new THREE.Vector3(x, 0.14, z), jump: false });
    if (next !== "floor") pending.push({ point: anchors[next].clone(), jump: true });
    if (!pending.length) spot = next;
  };
  const update = (delta: number, next: CatSpot, greeting: boolean, reduced: boolean) => {
    if (reduced) {
      root.position.copy(anchors[next]);
      spot = destination = next;
      step = null;
      pending = [];
      play("Idle");
      mixer.update(0);
      return;
    }
    requestSpot(next);
    if (!step && pending.length) {
      step = pending.shift()!;
      from.copy(root.position);
      progress = 0;
      duration = step.jump ? 1.35 : Math.max(0.45, from.distanceTo(step.point) / 0.7);
    }
    if (step) {
      progress = Math.min(1, progress + delta / duration);
      const t = progress;
      if (step.jump) {
        // Clear the edge before descending: do not linearly cut through furniture.
        const horizontal = t * t * (3 - 2 * t);
        root.position.lerpVectors(from, step.point, horizontal);
        const top = Math.max(from.y, step.point.y) + 0.95;
        root.position.y = t < 0.5
          ? THREE.MathUtils.lerp(from.y, top, Math.sin(t * Math.PI))
          : THREE.MathUtils.lerp(step.point.y, top, Math.sin(t * Math.PI));
        play("Jump");
        const action = actions.get("Jump");
        if (action) { action.paused = true; action.time = t * action.getClip().duration; }
      } else {
        root.position.lerpVectors(from, step.point, t);
        play("Walk");
      }
      const targetAngle = Math.atan2(step.point.x - from.x, step.point.z - from.z);
      const turn = Math.atan2(Math.sin(targetAngle - root.rotation.y), Math.cos(targetAngle - root.rotation.y));
      root.rotation.y += turn * Math.min(1, delta * 9);
      if (t >= 1) {
        root.position.copy(step.point);
        step = null;
        if (!pending.length) spot = destination;
      }
    } else {
      play(greeting ? "Greet" : spot === "floor" ? "Idle" : "Rest");
      // Lounge lengthwise across the seat, keeping the tail away from its back.
      const targetAngle = spot === "sofa" ? -Math.PI / 2 : 0.35;
      const turn = Math.atan2(Math.sin(targetAngle - root.rotation.y), Math.cos(targetAngle - root.rotation.y));
      root.rotation.y += turn * Math.min(1, delta * 2);
    }
    mixer.update(delta);
  };
  return {
    root,
    update,
    dispose: () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(gltf.scene);
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          if (material instanceof THREE.MeshStandardMaterial && material.map) textures.add(material.map);
        }
      });
      materials.forEach((entry) => entry.dispose());
      textures.forEach((entry) => entry.dispose());
      root.removeFromParent();
    },
  };
}
