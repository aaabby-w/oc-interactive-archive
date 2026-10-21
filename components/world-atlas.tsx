"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteCopy } from "@/content/site";
import {
  ATLAS_FOCUS_ZOOM,
  AtlasCamera,
  viewForPoint,
  viewToTransform,
} from "@/lib/atlas-camera";
import { projectToRobinsonPercent } from "@/lib/robinson-projection";

const cities = siteCopy.worldAtlas.cities.map((city) => ({
  ...city,
  ...projectToRobinsonPercent(city.latitude, city.longitude),
}));

// Rendered on the server too, so the first paint already frames the first city.
const INITIAL_VIEW = viewForPoint(cities[0].x / 100, cities[0].y / 100, ATLAS_FOCUS_ZOOM);
const INITIAL_GEO_STYLE = {
  transform: viewToTransform(INITIAL_VIEW),
  "--atlas-k": INITIAL_VIEW.k.toFixed(4),
} as CSSProperties;

/** Pointer must rest on a node this long before the card follows it. */
const HOVER_INTENT_MS = 140;
const BUTTON_ZOOM_STEP = 1.7;

type WeatherReading = {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
};

type WeatherState =
  | { cityCode: string; status: "loading" }
  | { cityCode: string; status: "ready"; reading: WeatherReading }
  | { cityCode: string; status: "error" };

const weatherCache = new Map<string, WeatherReading>();

const weatherDescriptions: Record<number, { zh: string; en: string }> = {
  0: { zh: "晴朗", en: "CLEAR" },
  1: { zh: "大致晴朗", en: "MAINLY CLEAR" },
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
  77: { zh: "米雪", en: "SNOW GRAINS" },
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

export function WorldAtlas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherState>({ cityCode: "", status: "loading" });
  const active = cities[activeIndex];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const viewportRef = useRef<HTMLDivElement>(null);
  const geoRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<AtlasCamera | null>(null);
  const hoverTimer = useRef(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const geo = geoRef.current;
    if (!viewport || !geo) return;
    const camera = new AtlasCamera(viewport, geo, INITIAL_VIEW);
    cameraRef.current = camera;
    return () => {
      camera.destroy();
      cameraRef.current = null;
      window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const flyToCity = useCallback((index: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const city = cities[index];
    // Keep a deeper zoom the visitor chose; never fly out to something shallower than the focus level.
    camera.flyTo(city.x / 100, city.y / 100, Math.max(ATLAS_FOCUS_ZOOM, camera.zoom));
  }, []);

  const selectCity = useCallback((index: number) => {
    setActiveIndex(index);
    flyToCity(index);
  }, [flyToCity]);

  const previewCity = useCallback((index: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setActiveIndex(index), HOVER_INTENT_MS);
  }, []);

  const cancelPreview = useCallback(() => window.clearTimeout(hoverTimer.current), []);

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
        return response.json() as Promise<{
          current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
        }>;
      })
      .then(({ current }) => {
        if (
          typeof current?.temperature_2m !== "number"
          || typeof current.weather_code !== "number"
          || typeof current.wind_speed_10m !== "number"
        ) throw new Error("Weather response is incomplete");
        const reading = {
          temperature: current.temperature_2m,
          weatherCode: current.weather_code,
          windSpeed: current.wind_speed_10m,
        };
        weatherCache.set(active.code, reading);
        setWeather({ cityCode: active.code, status: "ready", reading });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeather({ cityCode: active.code, status: "error" });
      });

    return () => controller.abort();
  }, [active]);

  const routePath = useMemo(
    () => cities.map((city, index) => `${index === 0 ? "M" : "L"}${city.x} ${city.y}`).join(" "),
    [],
  );
  const coordinates = `${formatCoordinate(active.latitude, "N", "S")} · ${formatCoordinate(active.longitude, "E", "W")}`;
  const time = now ? formatLocalTime(active.timeZone, now) : "--:--:--";
  const visibleWeather: WeatherState = weather.cityCode === active.code
    ? weather
    : { cityCode: active.code, status: "loading" };

  return (
    <main className="world-atlas-page" id="main-content" tabIndex={-1}>
      <section className="world-atlas" aria-labelledby="world-atlas-title">
        <header className="world-atlas-copy" data-text-reveal>
          <p data-typo="meta">{siteCopy.worldAtlas.eyebrow}</p>
          <h1 id="world-atlas-title" data-typo="hero">{siteCopy.worldAtlas.title}</h1>
          <span data-typo="body">{siteCopy.worldAtlas.intro}</span>
        </header>

        <div className="world-atlas-stage">
          <div
            className="world-atlas-viewport"
            ref={viewportRef}
            role="group"
            tabIndex={0}
            aria-label={siteCopy.worldAtlas.mapLabel}
            aria-keyshortcuts="+ - 0 ArrowUp ArrowDown ArrowLeft ArrowRight"
          >
            <div className="world-atlas-geo" ref={geoRef} style={INITIAL_GEO_STYLE}>
              <Image
                className="world-atlas-map"
                src={`${basePath}/maps/world-robinson.svg`}
                alt=""
                fill
                priority
                unoptimized
                draggable={false}
                sizes="100vw"
              />
              <svg className="world-atlas-route-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d={routePath} />
              </svg>

              <div className="world-atlas-points">
                {cities.map((city, index) => (
                  <button
                    className={index === activeIndex ? "is-active" : ""}
                    key={city.code}
                    type="button"
                    style={{ left: `${city.x}%`, top: `${city.y}%` }}
                    aria-label={`${city.name}，${city.country}`}
                    aria-current={index === activeIndex ? "location" : undefined}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") previewCity(index);
                    }}
                    onPointerLeave={cancelPreview}
                    onFocus={(event) => {
                      setActiveIndex(index);
                      // Pointer clicks fly from onClick; only keyboard focus should move the camera here.
                      if (event.currentTarget.matches(":focus-visible")) flyToCity(index);
                    }}
                    onClick={() => selectCity(index)}
                  >
                    <span />
                    <small>{city.code}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="world-atlas-controls" data-atlas-ignore role="group" aria-label={siteCopy.worldAtlas.controls.label}>
              <button type="button" aria-label={siteCopy.worldAtlas.controls.zoomIn} onClick={() => cameraRef.current?.zoomBy(BUTTON_ZOOM_STEP)}>＋</button>
              <button type="button" aria-label={siteCopy.worldAtlas.controls.zoomOut} onClick={() => cameraRef.current?.zoomBy(1 / BUTTON_ZOOM_STEP)}>－</button>
              <button type="button" aria-label={siteCopy.worldAtlas.controls.world} onClick={() => cameraRef.current?.showWorld()}>{siteCopy.worldAtlas.controls.worldShort}</button>
            </div>
          </div>

          <aside className="world-city-card" aria-labelledby="world-city-name">
            <header>
              <span>{active.code} · CITY NODE</span>
              <strong id="world-city-name">{active.name}</strong>
              <small>{active.en} / {active.countryEn}</small>
            </header>
            <dl>
              <div><dt>{siteCopy.worldAtlas.localTime}</dt><dd className="world-city-time">{time}</dd></div>
              <div>
                <dt>{siteCopy.worldAtlas.weather}</dt>
                <dd>
                  {visibleWeather.status === "loading" && siteCopy.worldAtlas.weatherLoading}
                  {visibleWeather.status === "error" && siteCopy.worldAtlas.weatherUnavailable}
                  {visibleWeather.status === "ready" && (
                    <>{describeWeather(visibleWeather.reading.weatherCode).zh}<small>{describeWeather(visibleWeather.reading.weatherCode).en}</small></>
                  )}
                </dd>
              </div>
              <div><dt>{siteCopy.worldAtlas.temperature}</dt><dd>{visibleWeather.status === "ready" ? `${Math.round(visibleWeather.reading.temperature)}°C` : "—"}</dd></div>
              <div><dt>{siteCopy.worldAtlas.wind}</dt><dd>{visibleWeather.status === "ready" ? `${Math.round(visibleWeather.reading.windSpeed)} km/h` : "—"}</dd></div>
              <div className="world-city-coordinates"><dt>{siteCopy.worldAtlas.coordinates}</dt><dd>{coordinates}</dd></div>
            </dl>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{siteCopy.worldAtlas.weatherSource}</a>
          </aside>

          <p className="world-atlas-hint">{siteCopy.worldAtlas.hint}</p>
          <p className="sr-only" aria-live="polite">已选择{active.name}，{active.country}</p>
        </div>

        <div className="world-city-index" aria-label="城市节点索引">
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
        </div>

        <footer className="world-atlas-footer">
          <span>{siteCopy.worldAtlas.footer}</span>
          <Link href="/"><i aria-hidden="true">←</i>{siteCopy.common.back}</Link>
        </footer>
      </section>
    </main>
  );
}
