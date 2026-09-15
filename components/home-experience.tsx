"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { siteCopy } from "@/content/site";

const heroImage = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/hero-conservatory-placeholder.png`;

type HomeExperienceProps = {
  characterNameZh: string;
  characterNameEn?: string;
};

export function HomeExperience({
  characterNameZh,
  characterNameEn,
}: HomeExperienceProps) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      if (!reduceMotion) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".art-hero",
              start: "top top",
              end: "+=125%",
              scrub: 0.9,
              pin: true,
              anticipatePin: 1,
            },
          })
          .to(".hero-art-image", { scale: 1.15, yPercent: 5, ease: "none" }, 0)
          .to(".hero-art-haze", { opacity: 0.18, ease: "none" }, 0)
          .to(".hero-title-line", { yPercent: -36, opacity: 0, stagger: 0.06, ease: "none" }, 0.08)
          .to(".hero-caption", { y: -50, opacity: 0, ease: "none" }, 0.12)
          .to(".scroll-cue", { opacity: 0, y: 24, ease: "none" }, 0);

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(
            element,
            { y: 80, opacity: 0, clipPath: "inset(0 0 100% 0)" },
            {
              y: 0,
              opacity: 1,
              clipPath: "inset(0 0 0% 0)",
              duration: 1.25,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 84%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
          const amount = Number(element.dataset.parallax ?? 12);
          gsap.fromTo(
            element,
            { yPercent: -amount },
            {
              yPercent: amount,
              ease: "none",
              scrollTrigger: {
                trigger: element.closest("section") ?? element,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            },
          );
        });
      }
    }, container);

    return () => {
      context.revert();
    };
  }, []);

  return (
    <div className="home-experience" ref={root}>
      <section className="art-hero" aria-labelledby="home-title">
        <div className="hero-art" data-tilt-depth="1" aria-hidden="true">
          <Image
            className="hero-art-image"
            src={heroImage}
            alt=""
            fill
            sizes="100vw"
            priority
          />
          <div className="hero-art-haze" />
        </div>

        <div className="hero-title" data-cursor-focus>
          <p className="hero-kicker">{siteCopy.home.classification}</p>
          <h1 id="home-title">
            <span className="hero-title-line">{siteCopy.identity.zh}</span>
            <strong className="hero-title-line">{siteCopy.identity.en}</strong>
          </h1>
        </div>

        <div className="hero-caption">
          <span>{siteCopy.home.imagePlaceholder}</span>
          <small>{siteCopy.home.imagePlaceholderEn}</small>
        </div>

        <div className="hero-folio" aria-hidden="true">
          <span>NO. 001</span>
          <i />
          <span>MMXXVI</span>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span>{siteCopy.home.scroll}</span>
          <i />
        </div>
      </section>

      <section className="story-section character-chapter">
        <div className="chapter-watermark" data-parallax="10" aria-hidden="true">
          01
        </div>
        <div className="chapter-art-window" data-reveal>
          <Image
            src={heroImage}
            alt=""
            fill
            sizes="(max-width: 760px) 88vw, 52vw"
          />
          <span className="chapter-art-label">{siteCopy.home.futureCharacterArt}</span>
        </div>
        <div className="chapter-copy" data-reveal>
          <p className="section-index">01 / FEATURED CHARACTER</p>
          <h2>{characterNameZh}</h2>
          <p className="chapter-en">{characterNameEn}</p>
          <p>{siteCopy.home.featuredIntro}</p>
          <Link className="text-link" href="/characters/character-01">
            {siteCopy.common.openRecord}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="story-section world-chapter">
        <div className="world-orbit" data-parallax="18" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="world-copy" data-reveal>
          <p className="section-index">02 / WORLD & ARCHIVE</p>
          <h2>{siteCopy.home.worldTitle}</h2>
          <p>{siteCopy.home.worldIntro}</p>
        </div>
        <nav className="chapter-links" aria-label={siteCopy.home.explore} data-reveal>
          {siteCopy.home.portals.map((portal, index) => (
            <Link key={portal.href} href={portal.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{portal.zh}</b>
              <small>{portal.en}</small>
              <i aria-hidden="true">↗</i>
            </Link>
          ))}
        </nav>
      </section>

      <footer className="home-footer">
        <span>{siteCopy.identity.zh}</span>
        <small>{siteCopy.home.footerState}</small>
        <Link href="#home-title">{siteCopy.home.backToTop} ↑</Link>
      </footer>
    </div>
  );
}
