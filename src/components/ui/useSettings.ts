// src/components/ui/useSettings.ts
import { useState, useEffect } from "react";

export type FaceColor = { R: string; O: string; W: string; Y: string; G: string; B: string };

export type GameSettings = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  reducedMotion: boolean;
  cameraSensitivity: number;
  theme: "classic" | "neon" | "halloween" | "pastel" | "custom";
  // --- NUEVOS AJUSTES ---
  saveProgress: boolean;
  shadowQuality: "low" | "medium" | "high";
  batterySaver: boolean;
  hapticsEnabled: boolean;
  customColors: FaceColor;
};

export const DEFAULT_COLORS: FaceColor = {
  R: "#de1b24",
  O: "#ff6a00",
  W: "#f7f7f2", // El blanco se queda fijo
  Y: "#ffd000",
  G: "#009b48",
  B: "#0057d9",
};

const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: false,
  sfxEnabled: true,
  reducedMotion: false,
  cameraSensitivity: 0.0052,
  theme: "classic",
  // --- NUEVOS VALORES POR DEFECTO ---
  saveProgress: true,
  shadowQuality: "medium",
  batterySaver: false,
  hapticsEnabled: true,
  customColors: DEFAULT_COLORS,
};

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem("cubix_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Mergeamos para asegurarnos de que si añadimos nuevas props en el futuro, no rompan el estado
        return { ...DEFAULT_SETTINGS, ...parsed, customColors: { ...DEFAULT_COLORS, ...(parsed.customColors || {}) } };
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
  }, [settings]);

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

  return { settings, updateSetting, clearAllData };
}