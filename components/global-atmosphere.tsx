"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Switch } from "@/components/ui/switch";

type TiltPermission = "unknown" | "granted" | "denied" | "unsupported";

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function setMotion(x: number, y: number) {
  const root = document.documentElement;
  root.style.setProperty("--motion-x", `${x * 15}px`);
  root.style.setProperty("--motion-y", `${y * 12}px`);
  root.style.setProperty("--motion-x-soft", `${x * -6}px`);
  root.style.setProperty("--motion-y-soft", `${y * -5}px`);
  root.style.setProperty("--motion-rx", `${y * -1.25}deg`);
  root.style.setProperty("--motion-ry", `${x * 1.6}deg`);
}

export function GlobalAtmosphere() {
  const pathname = usePathname();
  const follower = useRef<HTMLDivElement>(null);
  const [spatialEnabled, setSpatialEnabled] = useState(true);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [tiltPermission, setTiltPermission] = useState<TiltPermission>("unknown");

  useEffect(() => {
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    setCoarsePointer(isCoarse);
    if (isCoarse) setSpatialEnabled(false);
  }, []);

  useEffect(() => {
    const cursor = follower.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      if (reduceMotion) return;

      gsap.utils.toArray<HTMLElement>("[data-global-parallax]").forEach((element) => {
        const amount = Number(element.dataset.globalParallax ?? 8);
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
              scrub: 0.9,
            },
          },
        );
      });
    }, document.body);

    let removePointerListeners = () => undefined;

    if (finePointer && !reduceMotion && cursor) {
      const moveX = gsap.quickTo(cursor, "x", { duration: 0.48, ease: "power3" });
      const moveY = gsap.quickTo(cursor, "y", { duration: 0.48, ease: "power3" });
      const interactive = document.querySelectorAll<HTMLElement>("a, button, canvas, [data-cursor-focus]");

      const onPointerMove = (event: PointerEvent) => {
        const normalizedX = event.clientX / window.innerWidth * 2 - 1;
        const normalizedY = event.clientY / window.innerHeight * 2 - 1;
        moveX(event.clientX);
        moveY(event.clientY);
        cursor.dataset.visible = "true";
        if (spatialEnabled) setMotion(normalizedX, normalizedY);
      };
      const onPointerLeave = () => {
        cursor.dataset.visible = "false";
        setMotion(0, 0);
      };
      const grow = () => cursor.dataset.active = "true";
      const shrink = () => cursor.dataset.active = "false";

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onPointerLeave);
      interactive.forEach((element) => {
        element.addEventListener("pointerenter", grow);
        element.addEventListener("pointerleave", shrink);
      });

      removePointerListeners = () => {
        window.removeEventListener("pointermove", onPointerMove);
        document.documentElement.removeEventListener("mouseleave", onPointerLeave);
        interactive.forEach((element) => {
          element.removeEventListener("pointerenter", grow);
          element.removeEventListener("pointerleave", shrink);
        });
      };
    }

    ScrollTrigger.refresh();
    return () => {
      removePointerListeners();
      context.revert();
      setMotion(0, 0);
    };
  }, [pathname, spatialEnabled]);

  useEffect(() => {
    if (!spatialEnabled || tiltPermission !== "granted") return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      const x = clamp((event.gamma ?? 0) / 24, -1, 1);
      const y = clamp(((event.beta ?? 45) - 45) / 32, -1, 1);
      setMotion(x, y);
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      setMotion(0, 0);
    };
  }, [spatialEnabled, tiltPermission]);

  const requestTilt = async () => {
    if (!("DeviceOrientationEvent" in window)) {
      setTiltPermission("unsupported");
      return false;
    }

    const OrientationEvent = window.DeviceOrientationEvent as OrientationEventConstructor;
    try {
      const permission = OrientationEvent.requestPermission
        ? await OrientationEvent.requestPermission()
        : "granted";
      setTiltPermission(permission === "granted" ? "granted" : "denied");
      return permission === "granted";
    } catch {
      setTiltPermission("denied");
      return false;
    }
  };

  const changeSpatialMode = async (next: boolean) => {
    if (!next) {
      setSpatialEnabled(false);
      setMotion(0, 0);
      return;
    }

    if (!coarsePointer || tiltPermission === "granted") {
      setSpatialEnabled(true);
      return;
    }

    if (await requestTilt()) setSpatialEnabled(true);
  };

  const unavailable = tiltPermission === "denied" || tiltPermission === "unsupported";
  const label = unavailable
    ? tiltPermission === "denied" ? "视差未授权" : "设备不支持"
    : spatialEnabled ? "视差开启" : "视差关闭";

  return (
    <>
      <div className="mouse-follower global-follower" ref={follower} aria-hidden="true">
        <span />
      </div>
      <div className="spatial-control" data-enabled={spatialEnabled} data-unavailable={unavailable}>
        <span className="spatial-lens" aria-hidden="true"><i /><i /><b /></span>
        <span className="spatial-copy"><b>{label}</b><small>DEPTH</small></span>
        <Switch
          className="spatial-switch"
          checked={spatialEnabled}
          onCheckedChange={changeSpatialMode}
          disabled={unavailable}
          aria-label={spatialEnabled ? "关闭页面视差" : "开启页面视差"}
        />
      </div>
    </>
  );
}
