"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: readonly [number, number, number];
  ring?: boolean;
};

const trailPalette = [
  [111, 168, 145],
  [145, 190, 180],
  [219, 184, 128],
  [188, 160, 196],
] as const;

const scrambleGlyphs = "未命名档案角色世界图像记录／·01ARCHIVE";

export function GlobalAtmosphere() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const cleanup: Array<() => void> = [];

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.18 },
    );

    document.querySelectorAll<HTMLElement>("[data-text-reveal]").forEach((element) => {
      if (reduceMotion) element.dataset.visible = "true";
      else revealObserver.observe(element);
    });
    cleanup.push(() => revealObserver.disconnect());

    const scramble = (element: HTMLElement) => {
      if (reduceMotion || element.dataset.scrambling === "true") return;
      const original = element.dataset.originalText ?? element.textContent ?? "";
      element.dataset.originalText = original;
      element.dataset.scrambling = "true";
      let frameIndex = 0;
      const total = Math.max(12, original.length * 2);
      const timer = window.setInterval(() => {
        const revealed = Math.floor((frameIndex / total) * original.length);
        element.textContent = [...original]
          .map((character, index) => {
            if (/\s/.test(character) || index < revealed) return character;
            return scrambleGlyphs[Math.floor(Math.random() * scrambleGlyphs.length)];
          })
          .join("");
        frameIndex += 1;
        if (frameIndex > total) {
          window.clearInterval(timer);
          element.textContent = original;
          element.dataset.scrambling = "false";
        }
      }, 32);
    };

    const scrambleTargets = document.querySelectorAll<HTMLElement>("[data-scramble]");
    const scrambleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          scramble(entry.target as HTMLElement);
          scrambleObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.55 },
    );
    scrambleTargets.forEach((element) => {
      scrambleObserver.observe(element);
      const onEnter = () => scramble(element);
      element.addEventListener("pointerenter", onEnter);
      cleanup.push(() => element.removeEventListener("pointerenter", onEnter));
    });
    cleanup.push(() => scrambleObserver.disconnect());

    if (!finePointer || reduceMotion) return () => cleanup.forEach((fn) => fn());

    const magneticTargets = document.querySelectorAll<HTMLElement>(
      "[data-magnetic], .site-nav a, .theme-toggle, .text-link, .archive-gateway-link",
    );
    magneticTargets.forEach((element) => {
      element.classList.add("magnetic-target");
      const onMove = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.setProperty("--magnetic-x", `${x * 9}px`);
        element.style.setProperty("--magnetic-y", `${y * 7}px`);
      };
      const onLeave = () => {
        element.style.setProperty("--magnetic-x", "0px");
        element.style.setProperty("--magnetic-y", "0px");
      };
      element.addEventListener("pointermove", onMove);
      element.addEventListener("pointerleave", onLeave);
      cleanup.push(() => {
        element.classList.remove("magnetic-target");
        element.removeEventListener("pointermove", onMove);
        element.removeEventListener("pointerleave", onLeave);
      });
    });

    const tiltTargets = document.querySelectorAll<HTMLElement>("[data-tilt-card]");
    tiltTargets.forEach((element) => {
      element.classList.add("tilt-card");
      const onMove = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.setProperty("--tilt-rx", `${y * -4}deg`);
        element.style.setProperty("--tilt-ry", `${x * 5}deg`);
        element.style.setProperty("--tilt-glow-x", `${(x + 0.5) * 100}%`);
        element.style.setProperty("--tilt-glow-y", `${(y + 0.5) * 100}%`);
      };
      const onLeave = () => {
        element.style.setProperty("--tilt-rx", "0deg");
        element.style.setProperty("--tilt-ry", "0deg");
      };
      element.addEventListener("pointermove", onMove);
      element.addEventListener("pointerleave", onLeave);
      cleanup.push(() => {
        element.classList.remove("tilt-card");
        element.removeEventListener("pointermove", onMove);
        element.removeEventListener("pointerleave", onLeave);
      });
    });

    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!canvas || !cursor) return () => cleanup.forEach((fn) => fn());
    const context = canvas.getContext("2d");
    if (!context) return () => cleanup.forEach((fn) => fn());
    const drawingContext = context;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let lastX = -100;
    let lastY = -100;
    let lastSpawn = 0;
    const particles: Particle[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const requestFrame = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(draw);
    };

    const spawn = (x: number, y: number, count = 2, burst = false) => {
      for (let index = 0; index < count; index += 1) {
        const angle = burst ? Math.random() * Math.PI * 2 : Math.PI * (0.55 + Math.random() * 0.9);
        const speed = burst ? 0.8 + Math.random() * 2.2 : 0.16 + Math.random() * 0.55;
        particles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + (burst ? 0 : 0.15),
          life: 1,
          decay: burst ? 0.022 + Math.random() * 0.015 : 0.035 + Math.random() * 0.022,
          size: burst ? 1.4 + Math.random() * 2.1 : 0.8 + Math.random() * 1.5,
          color: trailPalette[Math.floor(Math.random() * trailPalette.length)],
        });
      }
      if (burst) {
        particles.push({ x, y, vx: 0, vy: 0, life: 1, decay: 0.035, size: 4, color: trailPalette[0], ring: true });
      }
      if (particles.length > 96) particles.splice(0, particles.length - 96);
      requestFrame();
    };

    function draw() {
      animationFrame = 0;
      drawingContext.clearRect(0, 0, width, height);
      drawingContext.globalCompositeOperation = "lighter";
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 + 0.012;
        particle.life -= particle.decay;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        const [red, green, blue] = particle.color;
        drawingContext.beginPath();
        if (particle.ring) {
          drawingContext.arc(particle.x, particle.y, particle.size + (1 - particle.life) * 24, 0, Math.PI * 2);
          drawingContext.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${particle.life * 0.34})`;
          drawingContext.lineWidth = 1;
          drawingContext.stroke();
        } else {
          drawingContext.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
          drawingContext.fillStyle = `rgba(${red}, ${green}, ${blue}, ${particle.life * 0.58})`;
          drawingContext.shadowColor = `rgba(${red}, ${green}, ${blue}, ${particle.life * 0.45})`;
          drawingContext.shadowBlur = 9;
          drawingContext.fill();
          drawingContext.shadowBlur = 0;
        }
      }
      if (particles.length) requestFrame();
    }

    resize();
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(cursor, "x", { duration: 0.22, ease: "power3.out" });
    const moveY = gsap.quickTo(cursor, "y", { duration: 0.22, ease: "power3.out" });
    const interactive = document.querySelectorAll<HTMLElement>("a, button, canvas, [data-cursor-focus]");
    const grow = () => { cursor.dataset.active = "true"; };
    const shrink = () => { cursor.dataset.active = "false"; };
    interactive.forEach((element) => {
      element.addEventListener("pointerenter", grow);
      element.addEventListener("pointerleave", shrink);
    });

    const onMove = (event: PointerEvent) => {
      moveX(event.clientX);
      moveY(event.clientY);
      cursor.dataset.visible = "true";
      const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      if (distance > 7 && event.timeStamp - lastSpawn > 15) {
        spawn(event.clientX, event.clientY, distance > 24 ? 2 : 1);
        lastX = event.clientX;
        lastY = event.clientY;
        lastSpawn = event.timeStamp;
      }
    };
    const onDown = (event: PointerEvent) => spawn(event.clientX, event.clientY, 15, true);
    const onLeave = () => { cursor.dataset.visible = "false"; };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    cleanup.push(() => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      interactive.forEach((element) => {
        element.removeEventListener("pointerenter", grow);
        element.removeEventListener("pointerleave", shrink);
      });
      window.cancelAnimationFrame(animationFrame);
      drawingContext.clearRect(0, 0, width, height);
    });

    return () => cleanup.forEach((fn) => fn());
  }, [pathname]);

  return (
    <>
      <canvas className="particle-trail-canvas" ref={canvasRef} aria-hidden="true" />
      <div className="cursor-core" ref={cursorRef} aria-hidden="true" />
    </>
  );
}
