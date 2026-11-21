import { useEffect, useState, useSyncExternalStore } from "react";
export type FaceColor = { R: string; O: string; W: string; Y: string; G: string; B: string };
export type PageTheme = "light" | "dark" | "system";
export type CubeMaterial = "matte" | "glossy" | "chrome" | "translucent";
export type CubeSurface = "smooth" | "textured" | "microrelief";
export type GameSettings = {
  sfxEnabled: boolean;
  reducedMotion: boolean;
  cameraSensitivity: number;
  pieceSensitivity: number;
  pageTheme: PageTheme;
  theme: "classic" | "neon" | "halloween" | "pastel" | "custom";
  saveProgress: boolean;
  shadowQuality: "low" | "medium" | "high";
  batterySaver: boolean;
  hapticsEnabled: boolean;
  turnVibrationEnabled: boolean;
  cubeMaterial: CubeMaterial;
  cubeSurface: CubeSurface;
  customColors: FaceColor;
  savedGame: { history: { axis: 0 | 1 | 2; layer: -1 | 0 | 1; quarters: number }[]; phase: "playing" | "won" } | null;
};
export const DEFAULT_COLORS: FaceColor = {
  R: "#cd0009", O: "#bc4e00", W: "#ffffff", Y: "#e2b800", G: "#009b48", B: "#0057d9",
};
const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true, reducedMotion: false, cameraSensitivity: 0.0052, pieceSensitivity: 1,
  pageTheme: "system", theme: "classic", saveProgress: true, shadowQuality: "medium",
  batterySaver: false, hapticsEnabled: true, turnVibrationEnabled: true,
  cubeMaterial: "matte", cubeSurface: "smooth",
  customColors: DEFAULT_COLORS, savedGame: null,
};
const STORAGE_KEY = "cubix_settings";
const GAME_STORAGE_KEY = "cubix_game_progress";
function freshDefaults(): GameSettings {
  return { ...DEFAULT_SETTINGS, customColors: { ...DEFAULT_COLORS }, savedGame: null };
}
function resolvePageTheme(theme: PageTheme): "light" | "dark" {
  if (theme === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return theme;
}
function isSavedGame(value: unknown): value is NonNullable<GameSettings["savedGame"]> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as GameSettings["savedGame"];
  return !!candidate && Array.isArray(candidate.history) &&
    (candidate.phase === "playing" || candidate.phase === "won");
}
function readStored(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return freshDefaults();

    // Whitelist supported preferences so retired settings are not retained.
    const storedSettings = {
      sfxEnabled: parsed.sfxEnabled,
      reducedMotion: parsed.reducedMotion,
      cameraSensitivity: parsed.cameraSensitivity,
      pieceSensitivity: parsed.pieceSensitivity,
      pageTheme: parsed.pageTheme,
      theme: parsed.theme,
      saveProgress: parsed.saveProgress,
      shadowQuality: parsed.shadowQuality,
      batterySaver: parsed.batterySaver,
      hapticsEnabled: parsed.hapticsEnabled,
      turnVibrationEnabled: parsed.turnVibrationEnabled,
      cubeMaterial: parsed.cubeMaterial,
      cubeSurface: parsed.cubeSurface,
      customColors: parsed.customColors,
    };
    const legacySavedGame = parsed.savedGame;
    const saveProgress = storedSettings.saveProgress !== false;
    let savedGame: GameSettings["savedGame"] = null;
    if (saveProgress) {
      const savedGameRaw = localStorage.getItem(GAME_STORAGE_KEY);
      if (savedGameRaw) {
        try {
          const candidate: unknown = JSON.parse(savedGameRaw);
          if (isSavedGame(candidate)) savedGame = candidate;
          else localStorage.removeItem(GAME_STORAGE_KEY);
        } catch {
          localStorage.removeItem(GAME_STORAGE_KEY);
        }
      } else if (isSavedGame(legacySavedGame)) {
        // Migrate progress saved by older versions.
        savedGame = legacySavedGame;
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(savedGame));
      }
    } else {
      localStorage.removeItem(GAME_STORAGE_KEY);
    }
    const piece = Number(storedSettings.pieceSensitivity);
    const pageTheme: PageTheme =
      storedSettings.pageTheme === "light" || storedSettings.pageTheme === "dark" || storedSettings.pageTheme === "system"
        ? storedSettings.pageTheme : DEFAULT_SETTINGS.pageTheme;
    return {
      ...DEFAULT_SETTINGS, ...storedSettings, saveProgress, pageTheme,
      cubeMaterial: ["matte", "glossy", "chrome", "translucent"].includes(storedSettings.cubeMaterial) ? storedSettings.cubeMaterial : DEFAULT_SETTINGS.cubeMaterial,
      cubeSurface: ["smooth", "textured", "microrelief"].includes(storedSettings.cubeSurface) ? storedSettings.cubeSurface : DEFAULT_SETTINGS.cubeSurface,
      pieceSensitivity: Number.isFinite(piece) ? piece : DEFAULT_SETTINGS.pieceSensitivity,
      customColors: { ...DEFAULT_COLORS, ...(storedSettings.customColors || {}) },
      savedGame,
    };
  } catch {
    return freshDefaults();
  }
}
// One shared state source for the settings menu and the game.
let current: GameSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") current = readStored();
function emit() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() { return current; }
function getServerSnapshot() { return DEFAULT_SETTINGS; }
function commit(next: GameSettings) { current = next; emit(); }
export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    try {
      const { savedGame, ...persistedSettings } = settings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedSettings));
      if (settings.saveProgress && savedGame) localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(savedGame));
      else localStorage.removeItem(GAME_STORAGE_KEY);
    } catch {
      // Storage can be unavailable or full; gameplay remains usable.
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
    if (key === "saveProgress" && value === false) {
      try { localStorage.removeItem(GAME_STORAGE_KEY); } catch { /* Storage unavailable. */ }
      commit({ ...current, saveProgress: false, savedGame: null });
      return;
    }
    commit({ ...current, [key]: value });
  };
  const clearAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GAME_STORAGE_KEY);
    } catch { /* Storage unavailable. */ }
    commit(freshDefaults());
  };
  return { settings, updateSetting, clearAllData, isLoaded };
}
