import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { restOn, surfaceAt } from '../components/residence/placement.ts';

// Read the actual room declarations, so this audit measures shipped OBJ assets
// at the shipped transforms rather than testing a second set of invented boxes.
const source = fs.readFileSync(new URL('../components/residence/lowpoly-residence-scene.ts', import.meta.url), 'utf8');
const environmentSource = fs.readFileSync(new URL('../components/residence/residence-environment.ts', import.meta.url), 'utf8');
const objects = {};
for (const match of source.matchAll(/loadAsset\((\{ name: "[^\n]+?\})\)/g)) {
  const spec = Function(`"use strict"; return (${match[1]});`)();
  const object = new OBJLoader().parse(fs.readFileSync(new URL(`../public/models/kenney-furniture/${spec.name}.obj`, import.meta.url), 'utf8'));
  object.rotation.x = spec.tilt || 0;
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  object.scale.setScalar(spec.size / Math.max(size.x, size.y, size.z));
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.set(-center.x, -bounds.min.y, -center.z);
  const pivot = new THREE.Group(); pivot.name = spec.name;
  pivot.position.set(...spec.position); pivot.rotation.y = spec.rotation || 0;
  pivot.add(object); pivot.updateMatrixWorld(true); objects[spec.name] = pivot;
}
for (const [prop, support, ceiling] of [
  ['laptop','desk'], ['lampRoundTable','desk'],
  ['tableCoffee','rugRectangle'], ['radio','tableCoffee'], ['books','bookcaseOpen',1.6],
]) {
  const height = restOn(objects[prop], objects[support], ceiling);
  const bounds = new THREE.Box3().setFromObject(objects[prop]);
  assert(Math.abs(bounds.min.y-height-.002)<1e-5, `${prop} contact gap`);
  console.log(`${prop} rests on ${support}: bottom=${bounds.min.y.toFixed(4)} surface=${height.toFixed(4)}`);
}
// The headboard is the highest part of the bed; it must be behind the mattress.
const bed = objects.bedSingle;
const bedBounds = new THREE.Box3().setFromObject(bed);
let headZ = 0, count = 0;
bed.traverse(mesh => {
  if (!mesh.isMesh) return;
  for (let i=0;i<mesh.geometry.attributes.position.count;i++) {
    const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
    if (v.y>bedBounds.max.y-.01) { headZ+=v.z; count++; }
  }
});
assert(headZ/count < bed.position.z-1, 'Headboard must face the rear wall');
const entrance = new THREE.Box3(new THREE.Vector3(-5.7,.15,1.3),new THREE.Vector3(-2.3,2.5,3));
for (const name of ['bedSingle','bookcaseOpen','loungeSofa','rugRectangle','tableCoffee']) {
  assert(!entrance.intersectsBox(new THREE.Box3().setFromObject(objects[name])), `${name} blocks entrance`);
}
for (const [name,x,z] of [['bedSingle',-3.25,-1.5],['desk',4.45,-2.85],['loungeSofa',.7,3.04]]) {
  assert(surfaceAt(objects[name],x,z)!==undefined, `Cat has no support on ${name}`);
}
console.log('PASS: measured prop contact, rear-facing headboard, clear entrance, cat support surfaces');

assert(!objects.pillow, 'Do not duplicate the pillow already included in bedSingle');
const walls = new THREE.Group();
const wallSource=source.slice(source.indexOf('// Real opening:'),source.indexOf('const windowGroup'));
for (const match of wallSource.matchAll(/box\((\[[^\]]+\]), (\[[^\]]+\]), palette\./g)) {
  const size=JSON.parse(match[1]), position=JSON.parse(match[2]);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  mesh.position.set(...position); walls.add(mesh);
}
walls.updateMatrixWorld(true);
const cast=(from,to)=>new THREE.Raycaster(new THREE.Vector3(...from),new THREE.Vector3(...to)).intersectObject(walls,true);
assert(cast([.65,2.92,-6],[0,0,1]).length===0,'Window opening blocked by a wall');
assert(cast([0,4,1.12],[-1,0,0]).length>0,'Gap remains above door at lintel join');
console.log('PASS: single integrated pillow, open window aperture, continuous door lintel');

const maxPolar = Number(source.match(/controls\.maxPolarAngle = ([0-9.]+);/)?.[1]);
assert(Number.isFinite(maxPolar) && maxPolar < Math.PI / 2, 'Camera can rotate below the residence ground plane');
assert.match(environmentSource, /Exterior_GroundAndUndersideScreen/, 'Scene-wide ground screen is missing');
assert.doesNotMatch(source, /createWindowWeather|Window_RecessedWeather/, 'Flat window weather card is still mounted');
console.log(`PASS: camera remains above ground (max polar ${maxPolar}) and weather uses the 3D exterior`);
