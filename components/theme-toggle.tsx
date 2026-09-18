"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { siteCopy } from "@/content/site";

export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [switching, setSwitching] = useState(false);
  const switchingTimer = useRef<number | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
      className="theme-toggle"
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? siteCopy.theme.toLight : siteCopy.theme.toDark}
      aria-pressed={isDark}
      title={isDark ? siteCopy.theme.toLight : siteCopy.theme.toDark}
      data-state={isDark ? "dark" : "light"}
      data-switching={switching}
      onClick={toggleTheme}
      disabled={!mounted}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <Sun className="theme-icon theme-sun" />
        <Moon className="theme-icon theme-moon" />
        <span className="theme-toggle-orb" />
      </span>
    </Button>
  );
}
