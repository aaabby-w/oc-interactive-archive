"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type TypographyMode = "hero" | "heading" | "quote" | "meta" | "body" | "line";

type SplitRecord = {
  html: string;
  ariaLabel: string | null;
};

function splitCharacters(element: HTMLElement, originals: Map<HTMLElement, SplitRecord>) {
  const text = element.textContent ?? "";
  originals.set(element, {
    html: element.innerHTML,
    ariaLabel: element.getAttribute("aria-label"),
  });

  const fragment = document.createDocumentFragment();
  const characters: HTMLElement[] = [];

  Array.from(text).forEach((character) => {
    const frame = document.createElement("span");
    const glyph = document.createElement("span");
    frame.className = character.trim() ? "typo-char-frame" : "typo-char-frame typo-space";
    glyph.className = "typo-char";
    glyph.textContent = character.trim() ? character : "\u00a0";
    glyph.setAttribute("aria-hidden", "true");
    frame.setAttribute("aria-hidden", "true");
    frame.appendChild(glyph);
    fragment.appendChild(frame);
    characters.push(glyph);
  });

  element.setAttribute("aria-label", text.trim());
  element.replaceChildren(fragment);
  element.dataset.typoSplit = "true";
  return characters;
}

export function ScrollTypography() {
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = window.matchMedia("(max-width: 760px)").matches;
    const originals = new Map<HTMLElement, SplitRecord>();
    const detailListeners: Array<{ element: HTMLDetailsElement; listener: () => void }> = [];

    const context = gsap.context(() => {
      const setupElement = (element: HTMLElement) => {
        if (element.dataset.typoReady === "true") return;
        if (element.closest("details:not([open])")) return;

        const mode = (element.dataset.typo ?? "body") as TypographyMode;
        element.dataset.typoReady = "true";

        if (reduceMotion) {
          element.dataset.typoVisible = "true";
          return;
        }

        const scrollTrigger = {
          trigger: element,
          start: mode === "hero" ? "top 96%" : "top 88%",
          once: true,
        };

        if (mode === "body") {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: compact ? 14 : 24, clipPath: "inset(0 0 22% 0)" },
            {
              autoAlpha: 1,
              y: 0,
              clipPath: "inset(0 0 0% 0)",
              duration: compact ? 0.72 : 0.9,
              ease: "power3.out",
              scrollTrigger,
              onComplete: () => { element.dataset.typoVisible = "true"; },
            },
          );
          return;
        }

        if (mode === "line") {
          gsap.fromTo(
            element,
            { autoAlpha: 0, x: compact ? -10 : -22 },
            {
              autoAlpha: 1,
              x: 0,
              duration: compact ? 0.64 : 0.82,
              ease: "power3.out",
              scrollTrigger,
              onComplete: () => { element.dataset.typoVisible = "true"; },
            },
          );
          return;
        }

        const characters = splitCharacters(element, originals);
        const baseDuration = compact ? 0.72 : 0.95;

        if (mode === "hero") {
          gsap.fromTo(
            characters,
            {
              autoAlpha: 0,
              yPercent: 118,
              scaleY: 1.55,
              scaleX: 0.82,
              rotationZ: (index) => (index % 2 ? 2.5 : -2.5),
              transformOrigin: "50% 100%",
            },
            {
              autoAlpha: 1,
              yPercent: 0,
              scaleY: 1,
              scaleX: 1,
              rotationZ: 0,
              duration: baseDuration + 0.16,
              stagger: compact ? 0.035 : 0.052,
              ease: "expo.out",
              scrollTrigger,
              onComplete: () => { element.dataset.typoVisible = "true"; },
            },
          );
          return;
        }

        if (mode === "heading") {
          const center = (characters.length - 1) / 2;
          gsap.fromTo(
            characters,
            {
              autoAlpha: 0,
              xPercent: (index) => (index - center) * (compact ? 24 : 38),
              scale: 0.92,
            },
            {
              autoAlpha: 1,
              xPercent: 0,
              scale: 1,
              duration: baseDuration,
              stagger: compact ? 0.026 : 0.038,
              ease: "power4.out",
              scrollTrigger,
              onComplete: () => { element.dataset.typoVisible = "true"; },
            },
          );
          return;
        }

        if (mode === "quote") {
          gsap.set(element, { perspective: 900 });
          gsap.fromTo(
            characters,
            { autoAlpha: 0, rotationX: -78, yPercent: 48, z: -90, transformOrigin: "50% 100%" },
            {
              autoAlpha: 1,
              rotationX: 0,
              yPercent: 0,
              z: 0,
              duration: baseDuration,
              stagger: compact ? 0.018 : 0.026,
              ease: "power3.out",
              scrollTrigger,
              onComplete: () => { element.dataset.typoVisible = "true"; },
            },
          );
          return;
        }

        gsap.fromTo(
          characters,
          { autoAlpha: 0, yPercent: 72 },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: compact ? 0.52 : 0.64,
            stagger: compact ? 0.012 : 0.018,
            ease: "power2.out",
            scrollTrigger,
            onComplete: () => { element.dataset.typoVisible = "true"; },
          },
        );
      };

      const setupTypography = (root: Pick<Document, "querySelectorAll">) => {
        root.querySelectorAll<HTMLElement>("[data-typo]").forEach(setupElement);
      };

      setupTypography(document);

      document.querySelectorAll<HTMLDetailsElement>("details").forEach((details) => {
        const listener = () => {
          if (!details.open) return;
          window.requestAnimationFrame(() => {
            setupTypography(details);
            ScrollTrigger.refresh();
          });
        };
        details.addEventListener("toggle", listener);
        detailListeners.push({ element: details, listener });
      });

      window.requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      detailListeners.forEach(({ element, listener }) => element.removeEventListener("toggle", listener));
      context.revert();
      originals.forEach((record, element) => {
        element.innerHTML = record.html;
        if (record.ariaLabel === null) element.removeAttribute("aria-label");
        else element.setAttribute("aria-label", record.ariaLabel);
        delete element.dataset.typoSplit;
        delete element.dataset.typoReady;
        delete element.dataset.typoVisible;
      });
    };
  }, [pathname]);

  return null;
}
