import { useEffect, useRef, useState } from "react";

export type FaceColor = { R: string; O: string; W: string; Y: string; G: string; B: string };
export type SavedGame = {
  history: { axis: 0 | 1 | 2; layer: -1 | 0 | 1; quarters: number }[];
  phase: "playing" | "won";
};
export type GameSettings = {
  sfxEnabled: boolean;
  reducedMotion: boolean;
  cameraSensitivity: number;
  moveSensitivity: number;
  theme: "classic" | "neon" | "halloween" | "pastel" | "custom";
  saveProgress: boolean;
  hapticsEnabled: boolean;
  customColors: FaceColor;
  savedGame: SavedGame | null;
};

export const DEFAULT_COLORS: FaceColor = {
  R: "#cd0009", O: "#bc4e00", W: "#ffffff", Y: "#e2b800", G: "#009b48", B: "#0057d9",
};
export const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true, reducedMotion: false, cameraSensitivity: 0.0052, moveSensitivity: 1, theme: "classic",
  saveProgress: true, hapticsEnabled: true, customColors: DEFAULT_COLORS, savedGame: null,
};

const isTheme = (value: unknown): value is GameSettings["theme"] =>
  value === "classic" || value === "neon" || value === "halloween" || value === "pastel" || value === "custom";

function readSettings(): GameSettings {
  try {
    const raw = localStorage.getItem("cubix_settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const saveProgress = typeof parsed.saveProgress === "boolean" ? parsed.saveProgress : true;
    const savedGame = saveProgress && parsed.savedGame && Array.isArray(parsed.savedGame.history) &&
      (parsed.savedGame.phase === "playing" || parsed.savedGame.phase === "won") ? parsed.savedGame : null;

    return {
      sfxEnabled: typeof parsed.sfxEnabled === "boolean" ? parsed.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
      cameraSensitivity: typeof parsed.cameraSensitivity === "number"
        ? Math.min(0.01, Math.max(0.001, parsed.cameraSensitivity)) : DEFAULT_SETTINGS.cameraSensitivity,
      moveSensitivity: typeof parsed.moveSensitivity === "number"
        ? Math.min(2, Math.max(0.5, parsed.moveSensitivity)) : DEFAULT_SETTINGS.moveSensitivity,
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      saveProgress,
      hapticsEnabled: typeof parsed.hapticsEnabled === "boolean" ? parsed.hapticsEnabled : DEFAULT_SETTINGS.hapticsEnabled,
      customColors: { ...DEFAULT_COLORS, ...(parsed.customColors || {}) },
      savedGame,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(readSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldPersist = useRef((() => {
    try { return localStorage.getItem("cubix_settings") !== null; }
    catch { return false; }
  })());

  useEffect(() => {
    if (shouldPersist.current) {
      try {
        localStorage.setItem("cubix_settings", JSON.stringify({
          ...settings,
          savedGame: settings.saveProgress ? settings.savedGame : null,
        }));
      } catch (error) {
        console.warn("No se pudieron guardar los ajustes localmente.", error);
      }
    }
    setIsLoaded(true);
  }, [settings]);

  const updateSettings = (patch: Partial<GameSettings>) => {
    shouldPersist.current = true;
    setSettings(previous => ({ ...previous, ...patch }));
  };

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    updateSettings({ [key]: value } as Pick<GameSettings, K>);

  const clearAllData = () => {
    try { localStorage.removeItem("cubix_settings"); }
    catch (error) { console.warn("No se pudieron borrar los datos locales.", error); }
  };

  return { settings, updateSetting, updateSettings, clearAllData, isLoaded };
}
