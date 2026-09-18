"use client";

import { useState } from "react";
import Link from "next/link";
import { siteCopy } from "@/content/site";

const regions = siteCopy.worldAtlas.regions;

export function WorldAtlas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = regions[activeIndex];

  return (
    <main className="world-atlas-page">
      <section className="world-atlas" aria-labelledby="world-atlas-title">
        <header className="world-atlas-copy" data-text-reveal>
          <p>{siteCopy.worldAtlas.eyebrow}</p>
          <h1 id="world-atlas-title">{siteCopy.worldAtlas.title}</h1>
          <span>{siteCopy.worldAtlas.intro}</span>
        </header>

        <div className="world-atlas-stage" aria-label={siteCopy.worldAtlas.mapLabel}>
          <div className="world-atlas-drift" aria-hidden="true">
            <svg viewBox="0 0 1200 660" role="presentation">
              <defs>
                <linearGradient id="atlas-land" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity=".88" />
                  <stop offset="1" stopColor="currentColor" stopOpacity=".58" />
                </linearGradient>
                <filter id="atlas-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="18" stdDeviation="20" floodOpacity=".09" />
                </filter>
              </defs>
              <g className="atlas-land" fill="url(#atlas-land)" filter="url(#atlas-soft-shadow)">
                <path d="M100 252C116 187 188 139 262 146c54 5 77 36 125 35 68-1 98-66 169-73 76-8 111 55 169 79 48 19 98 4 152 26 49 20 91 63 87 108-4 43-49 65-69 103-27 50-3 112-44 143-38 28-87-9-135 1-53 11-77 72-132 78-49 5-77-37-121-55-58-24-120-5-171-39-39-26-43-69-78-99-38-34-89-51-108-96-15-37-15-76-6-109Z" />
                <path d="M886 118c31-27 82-26 111 1 20 18 21 48 44 65 24 18 62 12 82 35 22 25 5 65-23 82-34 21-80 17-110-8-24-20-28-51-52-70-27-22-67-25-77-58-6-19 8-35 25-47Z" />
                <path d="M152 497c32-22 79-22 107 5 24 23 21 60 2 85-23 31-65 45-100 32-31-12-51-46-42-77 5-18 18-34 33-45Z" />
                <path d="M993 459c30-19 71-12 91 17 18 26 10 64-14 84-27 22-69 24-95 1-25-22-27-65-5-89 7-7 15-10 23-13Z" />
              </g>
              <g className="atlas-contours" fill="none" stroke="currentColor">
                <path d="M134 264c95-58 165-35 245-38 96-3 132-81 229-69 65 8 106 65 174 72 59 6 110 10 143 59" />
                <path d="M121 319c86-34 153-7 232-16 97-11 153-77 247-61 75 13 121 79 205 69 45-6 87-2 119 27" />
                <path d="M154 391c83-7 133 32 219 14 78-16 125-83 213-69 86 14 140 94 230 56 31-13 60-14 90-3" />
                <path d="M222 470c61 0 104 22 162 12 75-14 119-64 194-51 62 11 108 62 172 54" />
              </g>
              <g className="atlas-route" fill="none" stroke="currentColor">
                <path d="M238 329C360 246 445 365 565 283s206 23 307 58" />
              </g>
            </svg>
          </div>

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
