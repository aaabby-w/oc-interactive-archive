"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteCopy } from "@/content/site";
import { projectToRobinsonPercent } from "@/lib/robinson-projection";

const cities = siteCopy.worldAtlas.cities.map((city) => ({
  ...city,
  ...projectToRobinsonPercent(city.latitude, city.longitude),
}));

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
  const mapStyle = {
    "--atlas-focus-x": `${active.x}%`,
    "--atlas-focus-y": `${active.y}%`,
    "--atlas-turn": `${((activeIndex % 3) - 1) * 0.7}deg`,
  } as CSSProperties;
  const coordinates = `${formatCoordinate(active.latitude, "N", "S")} · ${formatCoordinate(active.longitude, "E", "W")}`;
  const time = now ? formatLocalTime(active.timeZone, now) : "--:--:--";
  const visibleWeather: WeatherState = weather.cityCode === active.code
    ? weather
    : { cityCode: active.code, status: "loading" };

  return (
    <main className="world-atlas-page" id="main-content" tabIndex={-1}>
      <section className="world-atlas" aria-labelledby="world-atlas-title">
        <header className="world-atlas-copy" data-text-reveal>
          <p>{siteCopy.worldAtlas.eyebrow}</p>
          <h1 id="world-atlas-title">{siteCopy.worldAtlas.title}</h1>
          <span>{siteCopy.worldAtlas.intro}</span>
        </header>

        <div className="world-atlas-stage">
          <div className="world-atlas-viewport" aria-label={siteCopy.worldAtlas.mapLabel}>
            <div className="world-atlas-geo" style={mapStyle}>
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
                    onPointerEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => setActiveIndex(index)}
                  >
                    <span />
                    <small>{city.code}</small>
                  </button>
                ))}
              </div>
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
              onClick={() => setActiveIndex(index)}
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
