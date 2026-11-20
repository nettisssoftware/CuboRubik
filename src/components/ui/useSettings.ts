// src/components/ui/useSettings.ts
import { useState, useEffect } from "react";

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

function resolvePageTheme(theme: PageTheme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function useSettings() {

  // NUEVO: Estado para saber si ya cargamos los datos
  const [isLoaded, setIsLoaded] = useState(false); 
  
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem("cubix_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        const piece = Number(parsed.pieceSensitivity);
        const pageTheme: PageTheme =
          parsed.pageTheme === "light" || parsed.pageTheme === "dark" || parsed.pageTheme === "system"
            ? parsed.pageTheme
            : DEFAULT_SETTINGS.pageTheme;
        // Mergeamos para asegurarnos de que si añadimos nuevas props en el futuro, no rompan el estado
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          pageTheme,
          pieceSensitivity: Number.isFinite(piece) ? piece : DEFAULT_SETTINGS.pieceSensitivity,
          customColors: { ...DEFAULT_COLORS, ...(parsed.customColors || {}) },
        };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    // SOLO guardamos si el usuario ha dado su consentimiento
    if (settings.saveProgress) {
      localStorage.setItem("cubix_settings", JSON.stringify(settings));
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
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // NUEVO: Función para borrar todo el progreso y resetear
  const clearAllData = () => {
    // 1. Borramos la clave de ajustes
    localStorage.removeItem("cubix_settings");
    // 2. (Opcional) Si en el futuro guardas el estado del cubo en otra clave, bórrala aquí también:
    // localStorage.removeItem("cubix_game_state");
    
    // 3. Reseteamos el estado de React a fábrica
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSetting, clearAllData, isLoaded};
}
