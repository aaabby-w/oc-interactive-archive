"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  CharacterResidence,
  ResidenceActivity,
} from "@/content/characters/types";
import { siteCopy } from "@/content/site";
import {
  chooseResidenceReply,
  getResidenceActivityAt,
} from "@/lib/residence-state";
import {
  createResidenceWeather,
  getWeatherSceneKey,
  restoreResidenceWeather,
  type ResidenceWeather,
} from "@/lib/residence-weather";

type RainLayer = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type AmbientAudio = {
  context: AudioContext;
  master: GainNode;
  track: HTMLAudioElement;
  onEnded: () => void;
  rain: RainLayer | null;
};

const musicTracks = ["/audio/overworld.mp3", "/audio/calm-loop.mp3"];

function stopRainLayer(audio: AmbientAudio) {
  if (!audio.rain) return;
  const rain = audio.rain;
  const now = audio.context.currentTime;
  rain.gain.gain.cancelScheduledValues(now);
  rain.gain.gain.setValueAtTime(rain.gain.gain.value, now);
  rain.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  window.setTimeout(() => {
    try { rain.source.stop(); } catch { /* already stopped */ }
  }, 500);
  audio.rain = null;
}

function startRainLayer(audio: AmbientAudio, storm = false) {
  if (audio.rain) {
    const now = audio.context.currentTime;
    audio.rain.gain.gain.cancelScheduledValues(now);
    audio.rain.gain.gain.linearRampToValueAtTime(storm ? 0.12 : 0.075, now + 0.4);
    return;
  }

  const seconds = 2;
  const buffer = audio.context.createBuffer(1, audio.context.sampleRate * seconds, audio.context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  const source = audio.context.createBufferSource();
  const filter = audio.context.createBiquadFilter();
  const gain = audio.context.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = storm ? 980 : 1280;
  filter.Q.value = 0.35;
  gain.gain.value = 0.0001;
  source.connect(filter).connect(gain).connect(audio.master);
  source.start();
  gain.gain.exponentialRampToValueAtTime(storm ? 0.12 : 0.075, audio.context.currentTime + 1.2);
  audio.rain = { source, gain };
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function CharacterRoomDemo({
  characterId,
  characterName,
  residence,
}: {
  characterId: string;
  characterName: string;
  residence?: CharacterResidence;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const mount = useRef<HTMLDivElement>(null);
  const activityRef = useRef<ResidenceActivity>("idle");
  const weatherRef = useRef<ResidenceWeather>("clear");
  const nightRef = useRef(false);
  const waveUntil = useRef(0);
  const ambientAudio = useRef<AmbientAudio | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ResidenceActivity>("idle");
  const [weather, setWeather] = useState<ResidenceWeather>("clear");
  const [musicOn, setMusicOn] = useState(false);
  const [reply, setReply] = useState<string>(siteCopy.residence.defaultReply);

  useEffect(() => {
    const syncResidence = () => {
      const now = new Date();
      const next = getResidenceActivityAt(now, characterId);
      setClock(now);
      nightRef.current = now.getHours() < 6 || now.getHours() >= 19;
      activityRef.current = next;
      setActivity(next);
    };

    syncResidence();
    const clockTimer = window.setInterval(syncResidence, 30_000);
    return () => {
      window.clearInterval(clockTimer);
    };
  }, [characterId]);

  useEffect(() => {
    const storageKey = `oc-residence-weather:${characterId}`;
    const syncWeather = () => {
      const now = Date.now();
      let stored: ReturnType<typeof restoreResidenceWeather> = null;
      try {
        stored = restoreResidenceWeather(window.localStorage.getItem(storageKey), now);
      } catch {
        stored = null;
      }
      const next = stored ?? createResidenceWeather(now);
      if (!stored) {
        try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
      }
      weatherRef.current = next.kind;
      setWeather(next.kind);
    };

    syncWeather();
    const weatherTimer = window.setInterval(syncWeather, 30_000);
    return () => window.clearInterval(weatherTimer);
  }, [characterId]);

  useEffect(() => {
    weatherRef.current = weather;
    const audio = ambientAudio.current;
    if (!audio) return;
    if (weather === "rain" || weather === "storm") startRainLayer(audio, weather === "storm");
    else stopRainLayer(audio);
  }, [weather]);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe1d7);
    scene.fog = new THREE.Fog(0xcfe1d7, 11, 24);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(8.8, 6.6, 10.8);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(1);
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

    const matte = (color: number) => new THREE.MeshToonMaterial({ color });
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
    const windowPane = addBox([3.72, 2.08, 0.08], [0, 0, 0.02], 0xdcece9, windowFrame);
    addBox([0.08, 2.2, 0.12], [0, 0, 0.08], 0x718f83, windowFrame);
    addBox([3.85, 0.08, 0.12], [0, 0, 0.08], 0x718f83, windowFrame);

    const weatherScene = new THREE.Group();
    weatherScene.position.z = 0.13;
    windowFrame.add(weatherScene);

    const sunGroup = new THREE.Group();
    sunGroup.position.set(1.22, 0.48, 0);
    weatherScene.add(sunGroup);
    addBox([0.34, 0.34, 0.04], [0, 0, 0], 0xffd88c, sunGroup);
    [[0, 0.34], [0, -0.34], [0.34, 0], [-0.34, 0]].forEach(([x, y]) => {
      addBox([0.08, 0.16, 0.035], [x, y, 0], 0xffd88c, sunGroup);
    });

    const moonGroup = new THREE.Group();
    moonGroup.position.set(1.2, 0.48, 0);
    weatherScene.add(moonGroup);
    addBox([0.38, 0.38, 0.04], [0, 0, 0], 0xf5edc8, moonGroup);
    addBox([0.25, 0.3, 0.055], [0.13, 0.08, 0.01], 0x738ea0, moonGroup);

    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(-0.2, 0.38, 0.04);
    weatherScene.add(cloudGroup);
    [[-0.46, 0, 0.62, 0.25], [0, 0.08, 0.86, 0.36], [0.5, -0.02, 0.54, 0.24]].forEach(([x, y, width, height]) => {
      addBox([width, height, 0.05], [x, y, 0], 0xe9eee6, cloudGroup);
    });

    const rainGroup = new THREE.Group();
    rainGroup.position.z = 0.05;
    weatherScene.add(rainGroup);
    for (let drop = 0; drop < 24; drop += 1) {
      const streak = addBox([0.025, 0.22, 0.025], [0, 0, 0], 0x8cb7c4, rainGroup);
      streak.userData.seedX = -1.7 + (drop * 0.73 % 3.4);
      streak.userData.seedY = -0.92 + (drop * 0.43 % 1.84);
      streak.position.x = streak.userData.seedX;
      streak.position.y = streak.userData.seedY;
      streak.rotation.z = -0.18;
    }

    const lightningGroup = new THREE.Group();
    lightningGroup.position.set(0.62, 0.12, 0.09);
    weatherScene.add(lightningGroup);
    const boltA = addBox([0.1, 0.62, 0.05], [0, 0.18, 0], 0xffedb1, lightningGroup);
    boltA.rotation.z = -0.35;
    const boltB = addBox([0.1, 0.54, 0.05], [-0.12, -0.28, 0], 0xffedb1, lightningGroup);
    boltB.rotation.z = 0.42;

    const rainbowGroup = new THREE.Group();
    rainbowGroup.position.set(0.28, -0.42, 0.08);
    weatherScene.add(rainbowGroup);
    [0xdba6a2, 0xe4c890, 0x91b9a9, 0xa8aecb].forEach((color, index) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(0.75 - index * 0.11, 0.035, 4, 18, Math.PI),
        new THREE.MeshToonMaterial({ color, transparent: true, opacity: 0.54 }),
      );
      arc.rotation.z = Math.PI;
      arc.position.y = index * -0.025;
      rainbowGroup.add(arc);
    });

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

    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.15, 16), matte(0x9db7ac));
    rug.rotation.x = -Math.PI / 2;
    rug.scale.y = 0.66;
    rug.position.set(0.4, 0.012, 0.35);
    rug.receiveShadow = true;
    scene.add(rug);

    addBox([0.85, 2.25, 0.12], [5.58, 1.13, -1.45], 0x6d8379);
    const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), matte(0xd1ae70));
    doorKnob.position.set(5.48, 1.12, -1.31);
    scene.add(doorKnob);

    const plant = new THREE.Group();
    plant.position.set(-4.8, 0, 3.1);
    scene.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.65, 8), matte(0xa8876c));
    pot.position.y = 0.32;
    pot.castShadow = true;
    plant.add(pot);
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.58, 0.2), matte(0x658875));
      const angle = leaf / 5 * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 0.28, 0.92 + (leaf % 2) * 0.2, Math.sin(angle) * 0.28);
      mesh.rotation.z = Math.cos(angle) * 0.5;
      mesh.castShadow = true;
      plant.add(mesh);
    }

    const cat = new THREE.Group();
    cat.position.set(1.15, 0.24, 1.25);
    scene.add(cat);
    addBox([0.72, 0.34, 0.4], [0, 0, 0], 0x6b665f, cat);
    addBox([0.38, 0.4, 0.38], [0.45, 0.18, 0], 0x76716a, cat);
    addBox([0.11, 0.2, 0.1], [0.34, 0.47, -0.1], 0x76716a, cat).rotation.z = -0.32;
    addBox([0.11, 0.2, 0.1], [0.55, 0.47, -0.1], 0x76716a, cat).rotation.z = 0.32;
    const tail = addBox([0.08, 0.72, 0.08], [-0.47, 0.25, 0], 0x6b665f, cat);
    tail.rotation.z = -0.95;

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
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.16, 0.5), bodyMaterial);
    body.position.y = 1.22;
    body.castShadow = true;
    figure.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.68, 0.62), matte(0xd9bda5));
    head.position.y = 2.08;
    head.castShadow = true;
    figure.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.36, 0.68), matte(0x3b3936));
    hair.position.set(0, 2.36, -0.02);
    hair.castShadow = true;
    figure.add(hair);
    addBox([0.14, 0.14, 0.06], [-0.16, 2.1, 0.33], 0x354841, figure);
    addBox([0.14, 0.14, 0.06], [0.16, 2.1, 0.33], 0x354841, figure);
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
    const skyColors = {
      day: new THREE.Color(0xbfe1dc),
      night: new THREE.Color(0x6f8698),
      cloudy: new THREE.Color(0xb7c8c3),
      rain: new THREE.Color(0x8ba8ae),
      storm: new THREE.Color(0x60747e),
      rainbow: new THREE.Color(0xd3dfd1),
    };
    let animationFrame = 0;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      const pixelScale = width < 760 ? 0.48 : 0.62;
      renderer.setSize(Math.round(width * pixelScale), Math.round(height * pixelScale), false);
      camera.aspect = width / height;
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

      const raining = currentWeather === "rain" || currentWeather === "storm";
      sunGroup.visible = currentWeather === "clear" && !night;
      moonGroup.visible = currentWeather === "clear" && night;
      cloudGroup.visible = currentWeather === "cloudy" || raining || currentWeather === "rainbow";
      rainGroup.visible = raining;
      rainbowGroup.visible = currentWeather === "rainbow";
      lightningGroup.visible = currentWeather === "storm" && Math.sin(elapsed * 2.7) > 0.94;
      sunGroup.rotation.z = elapsed * 0.08;
      cloudGroup.position.x = -0.2 + Math.sin(elapsed * 0.16) * 0.16;
      rainGroup.children.forEach((drop) => {
        const speed = currentWeather === "storm" ? 1.45 : 0.88;
        drop.position.y = 0.94 - ((elapsed * speed + drop.userData.seedY + 2) % 1.9);
      });

      const skyTarget = currentWeather === "clear"
        ? night ? skyColors.night : skyColors.day
        : skyColors[currentWeather];
      windowPane.material.color.lerp(skyTarget, 0.045);
      sun.intensity = THREE.MathUtils.lerp(sun.intensity, night ? 1.7 : raining ? 2.1 : 3.4, 0.025);
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
  }, [characterName]);

  useEffect(() => () => {
    const audio = ambientAudio.current;
    if (!audio) return;
    audio.track.removeEventListener("ended", audio.onEnded);
    audio.track.pause();
    if (audio.rain) {
      try { audio.rain.source.stop(); } catch { /* already stopped */ }
    }
    void audio.context.close();
    ambientAudio.current = null;
  }, []);

  const stopAmbient = () => {
    const audio = ambientAudio.current;
    if (!audio) return;
    audio.track.removeEventListener("ended", audio.onEnded);
    stopRainLayer(audio);
    const now = audio.context.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setValueAtTime(audio.master.gain.value, now);
    audio.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    window.setTimeout(() => {
      audio.track.pause();
      audio.track.removeAttribute("src");
      audio.track.load();
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
      master.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 1.4);
      master.connect(context.destination);

      const sources = musicTracks.map((path) => `${basePath}${path}`);
      const track = new Audio();
      track.preload = "auto";
      let trackIndex = Math.floor(Math.random() * sources.length);
      const playTrack = () => {
        track.src = sources[trackIndex];
        trackIndex = (trackIndex + 1) % sources.length;
        void track.play().catch(() => setReply(siteCopy.residence.audioUnavailable));
      };
      const onEnded = () => playTrack();
      track.addEventListener("ended", onEnded);
      context.createMediaElementSource(track).connect(master);

      const audio: AmbientAudio = { context, master, track, onEnded, rain: null };
      ambientAudio.current = audio;
      if (weatherRef.current === "rain" || weatherRef.current === "storm") {
        startRainLayer(audio, weatherRef.current === "storm");
      }
      track.src = sources[trackIndex];
      trackIndex = (trackIndex + 1) % sources.length;
      await track.play();
      setMusicOn(true);
    } catch {
      const audio = ambientAudio.current;
      if (audio) {
        audio.track.pause();
        void audio.context.close();
        ambientAudio.current = null;
      }
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
  const weatherSceneKey = clock ? getWeatherSceneKey(weather, clock) : "clear-day";
  const weatherDisplay = siteCopy.residence.weather[weatherSceneKey];

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
          <div className="residence-weather-badge" data-weather={weatherSceneKey}>
            <span aria-hidden="true"><i /><i /><i /></span>
            <div><b>{weatherDisplay.zh}</b><small>{weatherDisplay.en}</small></div>
          </div>
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
