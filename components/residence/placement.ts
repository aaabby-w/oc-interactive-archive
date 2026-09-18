import * as THREE from "three";

/** Measure the actual upward-facing furniture surface at a world-space point. */
export function surfaceAt(object: THREE.Object3D, x: number, z: number, ceiling = 10) {
  object.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, ceiling, z), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObject(object, true).find((candidate) => {
    if (!candidate.face) return false;
    const normal = candidate.face.normal.clone().transformDirection(candidate.object.matrixWorld);
    return normal.y > 0.75;
  });
  return hit?.point.y;
}

/** Assets are normalized to a zero-height base before this contact placement. */
export function restOn(prop: THREE.Object3D, support: THREE.Object3D, ceiling = 10) {
  const height = surfaceAt(support, prop.position.x, prop.position.z, ceiling);
  if (height === undefined) throw new Error(`Missing support below ${prop.name}`);
  prop.position.y = height + 0.002;
  prop.updateWorldMatrix(true, true);
  return height;
}
