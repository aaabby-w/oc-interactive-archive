"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { siteCopy } from "@/content/site";

export function ThemeToggle() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [switching, setSwitching] = useState(false);
  const switchingTimer = useRef<number | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const renderedDark = mounted && isDark;
  const isDossier = /^\/characters\/[^/]+\/archive\/?$/.test(pathname);
  const actionLabel = isDossier
    ? (renderedDark ? siteCopy.theme.lightOn : siteCopy.theme.lightOff)
    : (renderedDark ? siteCopy.theme.toLight : siteCopy.theme.toDark);

  useEffect(() => {
    return () => {
      if (switchingTimer.current !== null) {
        window.clearTimeout(switchingTimer.current);
      }
    };
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    root.classList.add("theme-changing");
    setSwitching(true);
    setTheme(isDark ? "light" : "dark");
    if (switchingTimer.current !== null) {
      window.clearTimeout(switchingTimer.current);
    }
    switchingTimer.current = window.setTimeout(() => {
      root.classList.remove("theme-changing");
      setSwitching(false);
      switchingTimer.current = null;
    }, 680);
  }

  return (
    <Button
      className={`theme-toggle${isDossier ? " theme-toggle--lamp" : ""}`}
      type="button"
      variant="ghost"
      size="icon"
      aria-label={actionLabel}
      aria-pressed={renderedDark}
      title={actionLabel}
      data-state={renderedDark ? "dark" : "light"}
      data-switching={switching}
      onClick={toggleTheme}
      disabled={!mounted}
    >
      {isDossier ? (
        <span className="theme-toggle-label" aria-hidden="true">
          <strong>{renderedDark ? siteCopy.theme.lightOn : siteCopy.theme.lightOff}</strong>
          <small>{renderedDark ? siteCopy.theme.lightOnEn : siteCopy.theme.lightOffEn}</small>
        </span>
      ) : null}
      <span className="theme-toggle-track" aria-hidden="true">
        <Sun className="theme-icon theme-sun" />
        <Moon className="theme-icon theme-moon" />
        <span className="theme-toggle-orb" />
      </span>
    </Button>
  );
}
