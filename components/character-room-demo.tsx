"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  CharacterResidence,
  ResidenceActivity,
  ResidenceProp,
} from "@/content/characters/types";
import { siteCopy } from "@/content/site";
import {
  chooseResidenceActivity,
  chooseResidenceReply,
} from "@/lib/residence-state";

type AmbientAudio = {
  context: AudioContext;
  master: GainNode;
  interval: number;
  oscillators: OscillatorNode[];
};

const residenceProps: ResidenceProp[] = ["camera", "books", "journal", "tea", "flowers"];

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function CharacterRoomDemo({
  characterName,
  residence,
}: {
  characterName: string;
  residence?: CharacterResidence;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const activityRef = useRef<ResidenceActivity>("idle");
  const waveUntil = useRef(0);
  const ambientAudio = useRef<AmbientAudio | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ResidenceActivity>("idle");
  const [musicOn, setMusicOn] = useState(false);
  const [reply, setReply] = useState<string>(siteCopy.residence.defaultReply);

  useEffect(() => {
    const selectNextActivity = () => {
      const next = chooseResidenceActivity(new Date().getHours(), activityRef.current);
      activityRef.current = next;
      setActivity(next);
    };

    setClock(new Date());
    selectNextActivity();
    const clockTimer = window.setInterval(() => setClock(new Date()), 30_000);
    const activityTimer = window.setInterval(selectNextActivity, 14_000);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(activityTimer);
    };
  }, []);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbecbc2);
    scene.fog = new THREE.Fog(0xbecbc2, 10, 22);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(8.8, 6.6, 10.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", `${characterName}的低模室内生活场景，可拖动视角查看。`);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 18;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.25, -0.3);

    scene.add(new THREE.HemisphereLight(0xf3f0dd, 0x5b7064, 2.2));
    const sun = new THREE.DirectionalLight(0xfff1ce, 3.4);
    sun.position.set(-4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    const matte = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.02 });
    const addBox = (
      size: [number, number, number],
      position: [number, number, number],
      color: number,
      parent: THREE.Object3D = scene,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), matte(color));
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), matte(0xd9ded3));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    addBox([12, 4.8, 0.14], [0, 2.4, -4.45], 0xe6e7dc);
    addBox([0.14, 4.8, 9], [-6, 2.4, 0], 0xdce2d8);

    const windowFrame = new THREE.Group();
    windowFrame.position.set(1.6, 2.7, -4.34);
    scene.add(windowFrame);
    addBox([4.1, 2.45, 0.06], [0, 0, 0], 0xa9c4ba, windowFrame);
    addBox([3.72, 2.08, 0.08], [0, 0, 0.02], 0xdcece9, windowFrame);
    addBox([0.08, 2.2, 0.12], [0, 0, 0.08], 0x718f83, windowFrame);
    addBox([3.85, 0.08, 0.12], [0, 0, 0.08], 0x718f83, windowFrame);

    addBox([3.5, 0.45, 2.05], [-3.65, 0.35, -2.55], 0x879f94);
    addBox([3.3, 0.3, 1.88], [-3.65, 0.72, -2.55], 0xe7e3d3);
    addBox([0.95, 0.2, 0.58], [-4.55, 0.96, -2.78], 0xf2efe4);
    addBox([3.5, 1.05, 0.14], [-3.65, 1.0, -3.5], 0x6f887d);

    addBox([3.05, 0.14, 1.2], [2.45, 1.25, -2.72], 0x806f5d);
    addBox([0.13, 1.25, 0.13], [1.15, 0.62, -2.28], 0x6d5e50);
    addBox([0.13, 1.25, 0.13], [3.75, 0.62, -2.28], 0x6d5e50);
    addBox([0.13, 1.25, 0.13], [1.15, 0.62, -3.16], 0x6d5e50);
    addBox([0.13, 1.25, 0.13], [3.75, 0.62, -3.16], 0x6d5e50);
    addBox([0.72, 0.46, 0.08], [2.45, 1.64, -2.9], 0x27322f).rotation.x = -0.16;
    addBox([0.62, 0.08, 0.45], [2.45, 1.42, -2.65], 0x4f625b);

    addBox([1.75, 3.1, 0.55], [-4.85, 1.55, 0.62], 0x758b80);
    for (let shelf = 0; shelf < 3; shelf += 1) {
      addBox([1.5, 0.08, 0.52], [-4.85, 0.62 + shelf * 0.86, 0.62], 0xc8d0c6);
      for (let book = 0; book < 5; book += 1) {
        addBox(
          [0.16, 0.48 + (book % 2) * 0.12, 0.33],
          [-5.42 + book * 0.28, 0.92 + shelf * 0.86, 0.59],
          [0x708e82, 0xc6a98b, 0x9a7e6b][(book + shelf) % 3],
        );
      }
    }

    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.15, 40), matte(0x9db7ac));
    rug.rotation.x = -Math.PI / 2;
    rug.scale.y = 0.66;
    rug.position.set(0.4, 0.012, 0.35);
    rug.receiveShadow = true;
    scene.add(rug);

    addBox([0.85, 2.25, 0.12], [5.58, 1.13, -1.45], 0x6d8379);
    const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), matte(0xd1ae70));
    doorKnob.position.set(5.48, 1.12, -1.31);
    scene.add(doorKnob);

    const foregroundTable = addBox([11.8, 0.42, 1.7], [0, 0.42, 3.55], 0xa98261);
    foregroundTable.receiveShadow = true;
    const configuredProps = residence?.representativeItems?.length
      ? residence.representativeItems
      : [...residenceProps].sort(() => Math.random() - 0.5).slice(0, 3);
    const propPositions = [-3.15, 0, 3.15];

    configuredProps.slice(0, 3).forEach((prop, index) => {
      const x = propPositions[index];
      if (prop === "camera") {
        addBox([1.18, 0.72, 0.52], [x, 0.95, 3.35], 0x403d38);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.32, 20), matte(0x1f2422));
        lens.position.set(x, 0.95, 3.04);
        lens.rotation.x = Math.PI / 2;
        lens.castShadow = true;
        scene.add(lens);
      }
      if (prop === "books") {
        addBox([1.75, 0.22, 0.92], [x, 0.77, 3.5], 0x718c80).rotation.y = -0.08;
        addBox([1.55, 0.2, 0.82], [x + 0.12, 0.99, 3.48], 0xc9a981).rotation.y = 0.08;
      }
      if (prop === "journal") {
        const journal = addBox([1.48, 0.16, 1.05], [x, 0.73, 3.42], 0x485b52);
        journal.rotation.y = -0.22;
        addBox([0.06, 0.04, 0.78], [x, 0.84, 3.38], 0xc9aa72).rotation.y = -0.22;
      }
      if (prop === "tea") {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.62, 18), matte(0xe7dfcf));
        cup.position.set(x, 1.0, 3.42);
        cup.castShadow = true;
        scene.add(cup);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 18, Math.PI * 1.55), matte(0xe7dfcf));
        handle.position.set(x + 0.34, 1.03, 3.42);
        handle.rotation.y = Math.PI / 2;
        scene.add(handle);
      }
      if (prop === "flowers") {
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.72, 16), matte(0xbca184));
        vase.position.set(x, 0.99, 3.48);
        vase.castShadow = true;
        scene.add(vase);
        for (let stem = -1; stem <= 1; stem += 1) {
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8 + Math.abs(stem) * 0.1, 7), matte(0x6d8878));
          stalk.position.set(x + stem * 0.13, 1.63, 3.48);
          stalk.rotation.z = stem * 0.16;
          scene.add(stalk);
          const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 7), matte(stem === 0 ? 0xd5b28f : 0xe4d1b9));
          bloom.position.set(x + stem * 0.2, 2.03 + Math.abs(stem) * 0.08, 3.48);
          scene.add(bloom);
        }
      }
    });

    const plant = new THREE.Group();
    plant.position.set(-4.8, 0, 3.1);
    scene.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.65, 16), matte(0xa8876c));
    pot.position.y = 0.32;
    pot.castShadow = true;
    plant.add(pot);
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), matte(0x658875));
      const angle = leaf / 5 * Math.PI * 2;
      mesh.scale.set(0.55, 1.4, 0.45);
      mesh.position.set(Math.cos(angle) * 0.28, 0.92 + (leaf % 2) * 0.2, Math.sin(angle) * 0.28);
      mesh.rotation.z = Math.cos(angle) * 0.5;
      mesh.castShadow = true;
      plant.add(mesh);
    }

    const cat = new THREE.Group();
    cat.position.set(1.15, 0.24, 1.25);
    scene.add(cat);
    const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), matte(0x6b665f));
    catBody.scale.set(1.25, 0.75, 0.72);
    catBody.castShadow = true;
    cat.add(catBody);
    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), matte(0x76716a));
    catHead.position.set(0.4, 0.16, 0);
    catHead.castShadow = true;
    cat.add(catHead);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.8, 10), matte(0x6b665f));
    tail.position.set(-0.47, 0.25, 0);
    tail.rotation.z = -0.95;
    cat.add(tail);

    const character = new THREE.Group();
    scene.add(character);
    const figure = new THREE.Group();
    character.add(figure);
    const legs = new THREE.Group();
    figure.add(legs);
    addBox([0.24, 0.86, 0.28], [-0.17, 0.43, 0], 0x405c54, legs);
    addBox([0.24, 0.86, 0.28], [0.17, 0.43, 0], 0x405c54, legs);
    const bodyMaterial = matte(0x809f92);
    const dayOutfit = new THREE.Color(0x809f92);
    const sleepOutfit = new THREE.Color(0x9eabb3);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 6, 12), bodyMaterial);
    body.position.y = 1.22;
    body.castShadow = true;
    figure.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 20, 16), matte(0xd9bda5));
    head.position.y = 2.08;
    head.castShadow = true;
    figure.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), matte(0x3b3936));
    hair.position.set(0, 2.19, -0.02);
    hair.rotation.x = -0.18;
    hair.castShadow = true;
    figure.add(hair);
    const leftArm = addBox([0.18, 0.8, 0.22], [-0.54, 1.35, 0], 0x809f92, figure);
    const rightArm = addBox([0.18, 0.8, 0.22], [0.54, 1.35, 0], 0x809f92, figure);
    leftArm.geometry.translate(0, -0.3, 0);
    rightArm.geometry.translate(0, -0.3, 0);

    const waypoints: Record<ResidenceActivity, THREE.Vector3> = {
      sleep: new THREE.Vector3(-3.65, 0.86, -2.48),
      work: new THREE.Vector3(2.45, 0, -1.85),
      read: new THREE.Vector3(-3.9, 0, 0.55),
      cat: new THREE.Vector3(0.55, 0, 1.15),
      idle: new THREE.Vector3(-0.45, 0, 0.15),
      away: new THREE.Vector3(5.2, 0, -0.95),
    };

    character.position.copy(waypoints.idle);
    const startedAt = performance.now();
    let animationFrame = 0;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const current = activityRef.current;
      const targetPosition = waypoints[current];
      character.position.lerp(targetPosition, reduceMotion ? 1 : 0.018);
      character.visible = current !== "away" || character.position.distanceTo(targetPosition) > 0.28;

      const sleeping = current === "sleep";
      figure.rotation.z = THREE.MathUtils.lerp(figure.rotation.z, sleeping ? -Math.PI / 2 : 0, 0.045);
      figure.position.y = sleeping ? 0.34 : Math.sin(elapsed * 2.2) * 0.025;
      legs.visible = !sleeping;
      bodyMaterial.color.lerp(sleeping ? sleepOutfit : dayOutfit, 0.06);

      const waving = performance.now() < waveUntil.current;
      rightArm.rotation.z = THREE.MathUtils.lerp(
        rightArm.rotation.z,
        waving ? -1.8 + Math.sin(elapsed * 10) * 0.28 : 0,
        0.16,
      );
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, current === "work" ? 0.7 : 0, 0.08);
      cat.position.x = 1.15 + Math.sin(elapsed * 0.34) * 0.28;
      tail.rotation.z = -0.95 + Math.sin(elapsed * 2.4) * 0.22;
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
  }, [characterName, residence]);

  useEffect(() => () => {
    const audio = ambientAudio.current;
    if (!audio) return;
    window.clearInterval(audio.interval);
    audio.oscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* already stopped */ }
    });
    void audio.context.close();
  }, []);

  const stopAmbient = () => {
    const audio = ambientAudio.current;
    if (!audio) return;
    window.clearInterval(audio.interval);
    const now = audio.context.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setValueAtTime(audio.master.gain.value, now);
    audio.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    window.setTimeout(() => {
      audio.oscillators.forEach((oscillator) => {
        try { oscillator.stop(); } catch { /* already stopped */ }
      });
      void audio.context.close();
    }, 560);
    ambientAudio.current = null;
    setMusicOn(false);
  };

  const startAmbient = async () => {
    try {
      const context = new AudioContext();
      await context.resume();
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 1.4);
      master.connect(context.destination);

      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 920;
      filter.Q.value = 0.6;
      filter.connect(master);

      const oscillators = [174.61, 220, 261.63].map((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 1 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index * 3 - 3;
        gain.gain.value = index === 1 ? 0.12 : 0.08;
        oscillator.connect(gain).connect(filter);
        oscillator.start();
        return oscillator;
      });

      const notes = [349.23, 392, 440, 523.25, 587.33];
      const playChime = () => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
        oscillator.connect(gain).connect(filter);
        oscillator.start(now);
        oscillator.stop(now + 2.7);
      };
      playChime();
      const interval = window.setInterval(playChime, 3_600);
      ambientAudio.current = { context, master, interval, oscillators };
      setMusicOn(true);
    } catch {
      setReply(siteCopy.residence.audioUnavailable);
    }
  };

  const toggleAmbient = () => {
    if (musicOn) stopAmbient();
    else void startAmbient();
  };

  const greet = () => {
    const replies = {
      ...siteCopy.residence.replies,
      ...residence?.greetingReplies,
    } as Record<ResidenceActivity, readonly string[]>;
    if (activity !== "sleep" && activity !== "away") {
      waveUntil.current = performance.now() + 2_600;
    }
    setReply(chooseResidenceReply(activity, replies));
  };

  const activityDisplay = siteCopy.residence.activities[activity];

  return (
    <section className="residence-section" aria-labelledby="residence-title">
      <div className="residence-intro" data-global-parallax="5">
        <p className="section-index">{siteCopy.residence.eyebrow}</p>
        <h2 id="residence-title">{siteCopy.residence.title}</h2>
        <p>{siteCopy.residence.intro}</p>
      </div>

      <div className="residence-board">
        <span className="board-pin board-pin-a" aria-hidden="true" />
        <span className="board-pin board-pin-b" aria-hidden="true" />
        <span className="board-pin board-pin-c" aria-hidden="true" />

        <div className="residence-window">
          <div className="residence-canvas" ref={mount} data-cursor-focus />
          <div className="window-glare" aria-hidden="true" />
          <div className="residence-view-hint" aria-hidden="true">{siteCopy.residence.watchHint}</div>
        </div>

        <button
          className="residence-music"
          type="button"
          onClick={toggleAmbient}
          aria-pressed={musicOn}
          aria-label={musicOn ? siteCopy.residence.ambientOff : siteCopy.residence.ambientOn}
        >
          <span className="music-bars" aria-hidden="true"><i /><i /><i /></span>
          <span>{musicOn ? siteCopy.residence.ambientOff : siteCopy.residence.ambientOn}</span>
          <small>{siteCopy.residence.ambientEn}</small>
        </button>

        <div className="residence-status-note">
          <span className="residence-mood" data-activity={activity} aria-hidden="true">
            {activityDisplay.mood}
          </span>
          <div>
            <span>{clock ? formatTime(clock) : "--:--"} · {activityDisplay.zh}</span>
            <small>{activityDisplay.en}</small>
          </div>
        </div>

        <div className="residence-dialogue">
          <p aria-live="polite">{reply}</p>
          <button className="residence-greet" type="button" onClick={greet}>
            <span aria-hidden="true">⌁</span>
            <span>{siteCopy.residence.greet}<small>{siteCopy.residence.greetEn}</small></span>
          </button>
        </div>

        <span className="board-caption" aria-hidden="true">OBSERVATION WINDOW · 001</span>
      </div>
    </section>
  );
}
