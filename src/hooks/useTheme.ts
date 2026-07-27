import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "../types/note";

function resolveTheme(mode: ThemeMode | string): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "light" ? "light" : "dark";
}

function applyTheme(mode: ThemeMode | string) {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved);
}

export function useTheme(initial: ThemeMode | string = "dark") {
  const [mode, setMode] = useState<ThemeMode | string>(initial);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((prev) => (resolveTheme(prev) === "dark" ? "light" : "dark"));
  }, []);

  return {
    mode,
    resolved: resolveTheme(mode),
    setMode,
    toggle,
  };
}
