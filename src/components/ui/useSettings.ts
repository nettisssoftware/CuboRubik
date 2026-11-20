// src/components/ui/useSettings.ts
import { useEffect, useState, useSyncExternalStore } from "react";

export type FaceColor = { R: string; O: string; W: string; Y: string; G: string; B: string };

export type PageTheme = "light" | "dark" | "system";

export type GameSettings = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  reducedMotion: boolean;
  cameraSensitivity: number;
  pieceSensitivity: number;
  pageTheme: PageTheme;
  theme: "classic" | "neon" | "halloween" | "pastel" | "custom";
  // --- NUEVOS AJUSTES ---
  saveProgress: boolean;
  shadowQuality: "low" | "medium" | "high";
  batterySaver: boolean;
  hapticsEnabled: boolean;
  customColors: FaceColor;

   savedGame: {
    history: { axis: 0 | 1 | 2; layer: -1 | 0 | 1; quarters: number }[];
    phase: "playing" | "won";
  } | null; 
};

export const DEFAULT_COLORS: FaceColor = {
  R: "#cd0009",
  O: "#bc4e00",
  W: "#ffffff",
  Y: "#e2b800",
  G: "#009b48",
  B: "#0057d9",
};

const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: false,
  sfxEnabled: true,
  reducedMotion: false,
  cameraSensitivity: 0.0052,
  pieceSensitivity: 1,
  pageTheme: "system",
  theme: "classic",
  // --- NUEVOS VALORES POR DEFECTO ---
  saveProgress: true,
  shadowQuality: "medium",
  batterySaver: false,
  hapticsEnabled: true,
  customColors: DEFAULT_COLORS,
  savedGame: null,
};

const STORAGE_KEY = "cubix_settings";

function freshDefaults(): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    customColors: { ...DEFAULT_COLORS },
    savedGame: null,
  };
}

function resolvePageTheme(theme: PageTheme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function readStored(): GameSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved);
    const piece = Number(parsed.pieceSensitivity);
    const pageTheme: PageTheme =
      parsed.pageTheme === "light" || parsed.pageTheme === "dark" || parsed.pageTheme === "system"
        ? parsed.pageTheme
        : DEFAULT_SETTINGS.pageTheme;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      pageTheme,
      pieceSensitivity: Number.isFinite(piece) ? piece : DEFAULT_SETTINGS.pieceSensitivity,
      customColors: { ...DEFAULT_COLORS, ...(parsed.customColors || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Una sola copia para el menú y la partida. Si cada uno tenía la suya,
// guardar el cubo reescribía el local sin el tema ni la sensibilidad nuevos.
let current: GameSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  current = readStored();
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

function getServerSnapshot() {
  return DEFAULT_SETTINGS;
}

function commit(next: GameSettings) {
  current = next;
  emit();
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (settings.saveProgress) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    setIsLoaded(true);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.pageTheme = settings.pageTheme;
      root.dataset.resolvedTheme = resolvePageTheme(settings.pageTheme);
    };
    apply();
    if (settings.pageTheme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.pageTheme]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    commit({ ...current, [key]: value });
  };

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    commit(freshDefaults());
  };

  return { settings, updateSetting, clearAllData, isLoaded };
}
