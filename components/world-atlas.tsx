"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteCopy } from "@/content/site";

const regions = siteCopy.worldAtlas.regions;

export function WorldAtlas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = regions[activeIndex];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <main className="world-atlas-page">
      <section className="world-atlas" aria-labelledby="world-atlas-title">
        <header className="world-atlas-copy" data-text-reveal>
          <p>{siteCopy.worldAtlas.eyebrow}</p>
          <h1 id="world-atlas-title">{siteCopy.worldAtlas.title}</h1>
          <span>{siteCopy.worldAtlas.intro}</span>
        </header>

        <div className="world-atlas-stage" aria-label={siteCopy.worldAtlas.mapLabel}>
          <div className="world-atlas-geo">
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
            <svg className="world-atlas-route-overlay" viewBox="0 0 100 50.72" aria-hidden="true">
              <path d="M22 19C31 11 41 24 51 18S69 12 81 33" />
            </svg>

            <div className="world-atlas-points">
              {regions.map((region, index) => (
                <button
                  className={index === activeIndex ? "is-active" : ""}
                  key={region.code}
                  type="button"
                  style={{ left: `${region.x}%`, top: `${region.y}%` }}
                  aria-label={`${region.name} · ${region.code}`}
                  aria-pressed={index === activeIndex}
                  onPointerEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                >
                  <span />
                  <small>{region.code}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="world-atlas-active" aria-live="polite">
            <span>{active.code}</span>
            <strong>{active.name}</strong>
            <small>{active.en}</small>
          </div>

          <p className="world-atlas-hint">{siteCopy.worldAtlas.hint}</p>
        </div>

        <footer className="world-atlas-footer">
          <span>{siteCopy.worldAtlas.footer}</span>
          <Link href="/"><i aria-hidden="true">←</i>{siteCopy.common.back}</Link>
        </footer>
      </section>
    </main>
  );
}
