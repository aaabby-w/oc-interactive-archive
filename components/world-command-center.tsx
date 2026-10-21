"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { siteCopy } from "@/content/site";
import { WorldAtlas } from "@/components/world-atlas";

type WeatherReading = { temperature: number; weatherCode: number; windSpeed: number };
type WeatherState =
  | { cityCode: string; status: "loading" }
  | { cityCode: string; status: "error" }
  | { cityCode: string; status: "ready"; reading: WeatherReading };

type SceneController = {
  focus: (longitude: number) => void;
  overview: () => void;
};

type ThemeMode = "light" | "dark";

const cities = siteCopy.worldAtlas.cities;
const links = siteCopy.worldAtlas.links;
const weatherCache = new Map<string, WeatherReading>();
const CENTRAL_MERIDIAN = 11.25;
const TAU = Math.PI * 2;
const RADIUS = 6.4;
const SCREEN_HEIGHT = 4.2;
const INITIAL_CITY_INDEX = 8;

const weatherDescriptions: Record<number, { zh: string; en: string }> = {
  0: { zh: "晴朗", en: "CLEAR" },
  1: { zh: "大致晴朗", en: "MOSTLY CLEAR" },
  2: { zh: "局部多云", en: "PARTLY CLOUDY" },
  3: { zh: "阴天", en: "OVERCAST" },
  45: { zh: "有雾", en: "FOG" },
  48: { zh: "雾凇", en: "RIME FOG" },
  51: { zh: "小毛雨", en: "LIGHT DRIZZLE" },
  53: { zh: "毛雨", en: "DRIZZLE" },
  55: { zh: "较强毛雨", en: "DENSE DRIZZLE" },
  61: { zh: "小雨", en: "LIGHT RAIN" },
  63: { zh: "中雨", en: "RAIN" },
  65: { zh: "大雨", en: "HEAVY RAIN" },
  71: { zh: "小雪", en: "LIGHT SNOW" },
  73: { zh: "降雪", en: "SNOW" },
  75: { zh: "大雪", en: "HEAVY SNOW" },
  80: { zh: "阵雨", en: "RAIN SHOWERS" },
  81: { zh: "阵雨", en: "RAIN SHOWERS" },
  82: { zh: "强阵雨", en: "HEAVY SHOWERS" },
  85: { zh: "阵雪", en: "SNOW SHOWERS" },
  86: { zh: "强阵雪", en: "HEAVY SNOW SHOWERS" },
  95: { zh: "雷暴", en: "THUNDERSTORM" },
  96: { zh: "雷暴伴冰雹", en: "THUNDERSTORM / HAIL" },
  99: { zh: "强雷暴伴冰雹", en: "SEVERE STORM / HAIL" },
};

function describeWeather(code: number) {
  return weatherDescriptions[code] ?? { zh: "天气记录中", en: "CONDITIONS RECORDED" };
}

function formatLocalTime(timeZone: string, now: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`;
}

function normalizedLongitude(longitude: number) {
  return ((longitude - CENTRAL_MERIDIAN + 540) % 360) - 180;
}

function longitudeAngle(longitude: number) {
  return (normalizedLongitude(longitude) / 180) * Math.PI;
}

function surfacePoint(longitude: number, latitude: number, radius = RADIUS) {
  const angle = longitudeAngle(longitude);
  return new THREE.Vector3(
    radius * Math.sin(angle),
    (latitude / 90) * (SCREEN_HEIGHT / 2),
    -radius * Math.cos(angle),
  );
}

function makeRingGeometry(radius: number, height: number, segments = 256) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments;
    const angle = (u - 0.5) * TAU;
    const x = radius * Math.sin(angle);
    const z = -radius * Math.cos(angle);
    positions.push(x, height / 2, z, x, -height / 2, z);
    // Three.js textures use a bottom-left UV origin; SVG maps use a top-left origin.
    uvs.push(u, 1, u, 0);
    if (index < segments) {
      const top = index * 2;
      indices.push(top, top + 1, top + 2, top + 2, top + 1, top + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeGridTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.setLineDash([10, 12]);
  for (let longitude = 0; longitude <= 24; longitude += 1) {
    const x = (longitude / 24) * canvas.width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let latitude = 1; latitude < 12; latitude += 1) {
    const y = (latitude / 12) * canvas.height;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.setLineDash([]);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, canvas.height / 2);
  context.lineTo(canvas.width, canvas.height / 2);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function nearestTurn(angle: number, current: number) {
  return angle + Math.round((current - angle) / TAU) * TAU;
}

function WorldRingScene({
  activeIndex,
  onSelect,
  onReady,
  onUnavailable,
  controllerRef,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
  onReady: () => void;
  onUnavailable: () => void;
  controllerRef: MutableRefObject<SceneController | null>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const stageElement = stageRef.current;
    const canvasElement = canvasRef.current;
    if (!stageElement || !canvasElement) return;
    const stage: HTMLDivElement = stageElement;
    const canvas: HTMLCanvasElement = canvasElement;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onUnavailable();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 30);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    const ring = new THREE.Group();
    scene.add(ring);

    const geometry = makeRingGeometry(RADIUS, SCREEN_HEIGHT);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const mapMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const map = new THREE.Mesh(geometry, mapMaterial);
    ring.add(map);

    const gridTextures: Record<ThemeMode, THREE.CanvasTexture | null> = {
      light: makeGridTexture("rgba(54, 92, 82, .17)"),
      dark: makeGridTexture("rgba(188, 229, 215, .17)"),
    };
    const gridMaterial = new THREE.MeshBasicMaterial({
      map: gridTextures.light,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const grid = new THREE.Mesh(makeRingGeometry(RADIUS - 0.045, SCREEN_HEIGHT), gridMaterial);
    ring.add(grid);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xa4c8bb,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    const cityByCode = new Map(cities.map((city) => [city.code, city]));
    for (const [fromCode, toCode] of links) {
      const from = cityByCode.get(fromCode);
      const to = cityByCode.get(toCode);
      if (!from || !to) continue;
      const fromLongitude = normalizedLongitude(from.longitude);
      let toLongitude = normalizedLongitude(to.longitude);
      let delta = toLongitude - fromLongitude;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      toLongitude = fromLongitude + delta;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 24; step += 1) {
        const progress = step / 24;
        const longitude = fromLongitude + (toLongitude - fromLongitude) * progress;
        const latitude = from.latitude + (to.latitude - from.latitude) * progress + Math.sin(progress * Math.PI) * 3.2;
        const angle = (longitude / 180) * Math.PI;
        points.push(new THREE.Vector3(
          (RADIUS - 0.1) * Math.sin(angle),
          (latitude / 90) * (SCREEN_HEIGHT / 2),
          -(RADIUS - 0.1) * Math.cos(angle),
        ));
      }
      ring.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }

    const mapTextures: Partial<Record<ThemeMode, THREE.Texture>> = {};
    const currentTheme = (): ThemeMode => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const applyTheme = () => {
      const theme = currentTheme();
      const texture = mapTextures[theme] ?? mapTextures.light ?? mapTextures.dark;
      if (texture) mapMaterial.map = texture;
      mapMaterial.opacity = theme === "dark" ? 0.82 : 0.9;
      mapMaterial.needsUpdate = true;
      gridMaterial.map = gridTextures[theme];
      gridMaterial.opacity = theme === "dark" ? 0.58 : 0.64;
      gridMaterial.needsUpdate = true;
      lineMaterial.color.set(theme === "dark" ? 0x86b4a5 : 0x5d8f80);
      lineMaterial.opacity = theme === "dark" ? 0.38 : 0.34;
      renderFrame();
    };
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const textureLoader = new THREE.TextureLoader();
    Promise.all(([
      ["light", `${basePath}/maps/world-equirectangular-light.svg`],
      ["dark", `${basePath}/maps/world-equirectangular-dark.svg`],
    ] satisfies Array<[ThemeMode, string]>).map(async ([theme, source]) => {
      const texture = await textureLoader.loadAsync(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      mapTextures[theme] = texture;
    })).then(() => {
      applyTheme();
      onReady();
    }).catch(onUnavailable);

    const nodePositions = cities.map((city) => surfacePoint(city.longitude, city.latitude, RADIUS - 0.16));
    let rotation = longitudeAngle(cities[INITIAL_CITY_INDEX].longitude);
    let targetRotation = rotation;
    let velocity = 0;
    let fov = 52;
    let targetFov = 52;
    let frame = 0;
    let lastFrame = performance.now();
    let dragging = false;
    let pointerId = -1;
    let previousX = 0;
    let previousTime = 0;
    let pointerVelocity = 0;

    function resize() {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderFrame();
    }

    function projectNodes() {
      const rect = stage.getBoundingClientRect();
      ring.updateMatrixWorld(true);
      nodePositions.forEach((position, index) => {
        const button = nodeRefs.current[index];
        if (!button) return;
        const world = position.clone().applyMatrix4(ring.matrixWorld);
        const visible = world.z < -0.35;
        const projected = world.clone().project(camera);
        const inFrame = visible && Math.abs(projected.x) < 1.08 && Math.abs(projected.y) < 1.12;
        const x = (projected.x * 0.5 + 0.5) * rect.width;
        const y = (-projected.y * 0.5 + 0.5) * rect.height;
        const depth = Math.max(0.66, Math.min(1.08, -world.z / RADIUS));
        button.style.setProperty("--node-x", `${x.toFixed(1)}px`);
        button.style.setProperty("--node-y", `${y.toFixed(1)}px`);
        button.style.setProperty("--node-scale", depth.toFixed(3));
        button.style.opacity = inFrame ? String(Math.min(1, 0.42 + depth * 0.58)) : "0";
        button.style.pointerEvents = inFrame ? "auto" : "none";
      });
    }

    function renderFrame() {
      ring.rotation.y = rotation;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      projectNodes();
    }

    function ensureFrame() {
      if (frame) return;
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function tick(now: number) {
      frame = 0;
      const elapsed = Math.min(48, Math.max(1, now - lastFrame));
      lastFrame = now;
      const rotationEase = 1 - Math.exp(-elapsed / 150);
      const fovEase = 1 - Math.exp(-elapsed / 220);
      rotation += (targetRotation - rotation) * rotationEase;
      velocity *= Math.pow(0.84, elapsed / 16.67);
      if (!dragging) {
        rotation += velocity * elapsed;
        targetRotation += velocity * elapsed;
      }
      fov += (targetFov - fov) * fovEase;
      renderFrame();
      if (Math.abs(targetRotation - rotation) > 0.0002 || Math.abs(velocity) > 0.00001 || Math.abs(targetFov - fov) > 0.02) {
        ensureFrame();
      }
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      targetRotation += delta * 0.00145;
      velocity = delta * 0.000012;
      targetFov = 58;
      ensureFrame();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-command-ui]")) return;
      dragging = true;
      pointerId = event.pointerId;
      previousX = event.clientX;
      previousTime = performance.now();
      pointerVelocity = 0;
      velocity = 0;
      stage.setPointerCapture(pointerId);
      stage.dataset.dragging = "true";
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging || event.pointerId !== pointerId) return;
      const now = performance.now();
      const deltaX = event.clientX - previousX;
      const elapsed = Math.max(8, now - previousTime);
      targetRotation += deltaX * 0.0042;
      rotation = targetRotation;
      pointerVelocity = (deltaX * 0.0042) / elapsed;
      previousX = event.clientX;
      previousTime = now;
      targetFov = 58;
      renderFrame();
    }

    function onPointerEnd(event: PointerEvent) {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      delete stage.dataset.dragging;
      if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
      velocity = pointerVelocity;
      targetRotation += pointerVelocity * 180;
      ensureFrame();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        targetRotation += event.key === "ArrowLeft" ? -0.24 : 0.24;
        targetFov = 58;
        ensureFrame();
      }
      if (event.key === "Home" || event.key === "0") {
        event.preventDefault();
        targetFov = 58;
        targetRotation = nearestTurn(0, rotation);
        ensureFrame();
      }
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerEnd);
    stage.addEventListener("pointercancel", onPointerEnd);
    stage.addEventListener("keydown", onKeyDown);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    controllerRef.current = {
      focus(longitude) {
        targetRotation = nearestTurn(longitudeAngle(longitude), rotation);
        targetFov = 45;
        velocity = 0;
        ensureFrame();
      },
      overview() {
        targetFov = 58;
        ensureFrame();
      },
    };

    resize();
    renderFrame();

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerEnd);
      stage.removeEventListener("pointercancel", onPointerEnd);
      stage.removeEventListener("keydown", onKeyDown);
      controllerRef.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) object.geometry.dispose();
      });
      Object.values(mapTextures).forEach((texture) => texture?.dispose());
      mapMaterial.dispose();
      Object.values(gridTextures).forEach((texture) => texture?.dispose());
      gridMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, [controllerRef, onReady, onUnavailable]);

  return (
    <div
      className="command-ring-stage"
      ref={stageRef}
      role="group"
      tabIndex={0}
      aria-label={siteCopy.worldAtlas.mapLabel}
      aria-keyshortcuts="ArrowLeft ArrowRight Home 0"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="command-ring-nodes" data-command-ui>
        {cities.map((city, index) => (
          <button
            key={city.code}
            ref={(node) => { nodeRefs.current[index] = node; }}
            type="button"
            className={`${index === activeIndex ? "is-active" : ""} ${city.radar ? "has-radar" : ""}`}
            aria-label={`${city.name}，${city.country}`}
            aria-current={index === activeIndex ? "location" : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(index);
            }}
          >
            <span aria-hidden="true" />
            <small>{city.code}<b>{city.name}</b></small>
          </button>
        ))}
      </div>
      <div className="command-ring-shade" aria-hidden="true" />
      <div className="command-ring-reticle" aria-hidden="true"><span /><i /></div>
    </div>
  );
}

export function WorldCommandCenter() {
  const [mode, setMode] = useState<"ring" | "flat">("ring");
  const [activeIndex, setActiveIndex] = useState(INITIAL_CITY_INDEX);
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherState>({ cityCode: "", status: "loading" });
  const controllerRef = useRef<SceneController | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const active = cities[activeIndex];

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canvas = document.createElement("canvas");
    const webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    queueMicrotask(() => setMode(reduced.matches || !webgl ? "flat" : "ring"));
  }, []);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const cached = weatherCache.get(active.code);
    if (cached) {
      queueMicrotask(() => setWeather({ cityCode: active.code, status: "ready", reading: cached }));
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(active.latitude),
      longitude: String(active.longitude),
      current: "temperature_2m,weather_code,wind_speed_10m",
      timezone: "auto",
      forecast_days: "1",
    });
    void fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
        return response.json() as Promise<{ current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number } }>;
      })
      .then(({ current }) => {
        if (typeof current?.temperature_2m !== "number" || typeof current.weather_code !== "number" || typeof current.wind_speed_10m !== "number") {
          throw new Error("Weather response is incomplete");
        }
        const reading = { temperature: current.temperature_2m, weatherCode: current.weather_code, windSpeed: current.wind_speed_10m };
        weatherCache.set(active.code, reading);
        setWeather({ cityCode: active.code, status: "ready", reading });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeather({ cityCode: active.code, status: "error" });
      });
    return () => controller.abort();
  }, [active]);

  const selectCity = useCallback((index: number) => {
    setActiveIndex(index);
    controllerRef.current?.focus(cities[index].longitude);
  }, []);

  const handleReady = useCallback(() => setMode("ring"), []);
  const handleUnavailable = useCallback(() => setMode("flat"), []);

  const visibleWeather = weather.cityCode === active.code ? weather : { cityCode: active.code, status: "loading" as const };
  const coordinates = `${formatCoordinate(active.latitude, "N", "S")} · ${formatCoordinate(active.longitude, "E", "W")}`;
  const time = now ? formatLocalTime(active.timeZone, now) : "--:--:--";
  const nodeCounter = useMemo(() => `${String(activeIndex + 1).padStart(2, "0")} / ${cities.length}`, [activeIndex]);

  const moveHud = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const element = screenRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    element.style.setProperty("--room-x", x.toFixed(3));
    element.style.setProperty("--room-y", y.toFixed(3));
    element.style.setProperty("--hud-x", `${(x * 10).toFixed(2)}px`);
    element.style.setProperty("--hud-y", `${(y * 7).toFixed(2)}px`);
    element.style.setProperty("--hud-far-x", `${(x * 4).toFixed(2)}px`);
    element.style.setProperty("--hud-far-y", `${(y * 3).toFixed(2)}px`);
    element.style.setProperty("--hud-opposite-x", `${(x * -4.5).toFixed(2)}px`);
    element.style.setProperty("--hud-opposite-y", `${(y * -3.2).toFixed(2)}px`);
    element.style.setProperty("--hud-rx", `${(-y * 1.4).toFixed(2)}deg`);
    element.style.setProperty("--hud-ry", `${(x * 1.8).toFixed(2)}deg`);
    element.style.setProperty("--light-x", `${((x + 1) / 2 * 100).toFixed(1)}%`);
    element.style.setProperty("--light-y", `${((y + 1) / 2 * 100).toFixed(1)}%`);
  }, []);

  const resetHud = useCallback(() => {
    const element = screenRef.current;
    if (!element) return;
    element.style.setProperty("--room-x", "0");
    element.style.setProperty("--room-y", "0");
    element.style.setProperty("--hud-x", "0px");
    element.style.setProperty("--hud-y", "0px");
    element.style.setProperty("--hud-far-x", "0px");
    element.style.setProperty("--hud-far-y", "0px");
    element.style.setProperty("--hud-opposite-x", "0px");
    element.style.setProperty("--hud-opposite-y", "0px");
    element.style.setProperty("--hud-rx", "0deg");
    element.style.setProperty("--hud-ry", "0deg");
    element.style.setProperty("--light-x", "50%");
    element.style.setProperty("--light-y", "42%");
  }, []);

  if (mode === "flat") return <WorldAtlas />;

  return (
    <main className="world-command-page" id="main-content" tabIndex={-1}>
      <section className="world-command" aria-labelledby="world-command-title">
        <header className="world-command-copy">
          <p>{siteCopy.worldAtlas.eyebrow}</p>
          <h1 id="world-command-title">{siteCopy.worldAtlas.title}</h1>
          <span>{siteCopy.worldAtlas.intro}</span>
        </header>

        <div className="world-command-screen" ref={screenRef} onPointerMove={moveHud} onPointerLeave={resetHud}>
          <WorldRingScene
            activeIndex={activeIndex}
            onSelect={selectCity}
            onReady={handleReady}
            onUnavailable={handleUnavailable}
            controllerRef={controllerRef}
          />

          <div className="world-command-status command-hud" data-command-ui aria-hidden="true">
            <span>{siteCopy.worldAtlas.ringMode}</span>
            <b>{nodeCounter}</b>
          </div>

          <div className="command-room-telemetry command-hud" data-command-ui aria-hidden="true">
            <span>ROUTE FIELD / LIVE</span>
            <svg viewBox="0 0 148 76" role="presentation">
              <path d="M8 55 34 22 65 47 91 15 139 38 112 66 65 47 34 64Z" />
              <g><circle cx="8" cy="55" r="2" /><circle cx="34" cy="22" r="2" /><circle cx="34" cy="64" r="2" /><circle cx="65" cy="47" r="3" /><circle cx="91" cy="15" r="2" /><circle cx="112" cy="66" r="2" /><circle cx="139" cy="38" r="2" /></g>
            </svg>
            <small>{coordinates}<b>LINKS · {links.length}</b></small>
          </div>

          <aside className="command-city-panel command-hud" data-command-ui data-city={active.code} aria-labelledby="command-city-name">
            <header>
              <span>{active.code} · CITY NODE</span>
              <strong id="command-city-name">{active.name}</strong>
              <small>{active.en} / {active.countryEn}</small>
            </header>
            <dl>
              <div><dt>{siteCopy.worldAtlas.localTime}</dt><dd className="command-city-time">{time}</dd></div>
              <div>
                <dt>{siteCopy.worldAtlas.weather}</dt>
                <dd>
                  {visibleWeather.status === "loading" && siteCopy.worldAtlas.weatherLoading}
                  {visibleWeather.status === "error" && siteCopy.worldAtlas.weatherUnavailable}
                  {visibleWeather.status === "ready" && <>{describeWeather(visibleWeather.reading.weatherCode).zh}<small>{describeWeather(visibleWeather.reading.weatherCode).en}</small></>}
                </dd>
              </div>
              <div><dt>{siteCopy.worldAtlas.temperature}</dt><dd>{visibleWeather.status === "ready" ? `${Math.round(visibleWeather.reading.temperature)}°C` : "—"}</dd></div>
              <div><dt>{siteCopy.worldAtlas.wind}</dt><dd>{visibleWeather.status === "ready" ? `${Math.round(visibleWeather.reading.windSpeed)} km/h` : "—"}</dd></div>
              <div className="command-city-coordinates"><dt>{siteCopy.worldAtlas.coordinates}</dt><dd>{coordinates}</dd></div>
            </dl>
            <div className="command-city-record">
              <span>{siteCopy.worldAtlas.record}</span>
              <p>{active.record}</p>
            </div>
            <footer>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{siteCopy.worldAtlas.weatherSource}</a>
              <button type="button" onClick={() => controllerRef.current?.overview()}>{siteCopy.worldAtlas.overview}</button>
            </footer>
          </aside>

          <p className="world-command-hint command-hud" data-command-ui>{siteCopy.worldAtlas.hint}</p>
          <p className="sr-only" aria-live="polite">已选择{active.name}，{active.country}</p>
        </div>

        <nav className="world-command-node-rail" data-command-ui aria-label="城市节点索引">
          {cities.map((city, index) => (
            <button
              type="button"
              key={city.code}
              className={index === activeIndex ? "is-active" : ""}
              aria-current={index === activeIndex ? "location" : undefined}
              onClick={() => selectCity(index)}
            >
              <span>{city.code}</span><small>{city.name}</small>
            </button>
          ))}
        </nav>

        <footer className="world-command-footer">
          <span>{siteCopy.worldAtlas.footer}</span>
          <Link href="/"><i aria-hidden="true">←</i>{siteCopy.common.back}</Link>
        </footer>
      </section>
    </main>
  );
}
