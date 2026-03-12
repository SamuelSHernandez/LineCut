"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

const subscribe = () => () => {};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => "system" as Theme);
  const [, forceUpdate] = useState(0);

  const applyTheme = useCallback((t: Theme) => {
    const resolved = getResolvedTheme(t);
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (t: Theme) => {
      localStorage.setItem("theme", t);
      applyTheme(t);
      forceUpdate((n) => n + 1);
    },
    [applyTheme]
  );

  const resolvedTheme = getResolvedTheme(theme);

  return { theme, setTheme, resolvedTheme };
}
