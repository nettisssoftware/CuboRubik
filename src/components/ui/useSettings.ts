// src/components/ui/useSettings.ts
import { useState, useEffect } from "react";

export type GameSettings = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  reducedMotion: boolean;
  cameraSensitivity: number;
  theme: "classic" | "neon" | "halloween" | "pastel";
};

const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: false, // Desactivado por defecto por políticas del navegador
  sfxEnabled: true,
  reducedMotion: false,
  cameraSensitivity: 0.0052,
  theme: "classic",
};

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    // Cargar desde localStorage al iniciar
    try {
      const saved = localStorage.getItem("cubix_settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Guardar en localStorage cada vez que cambie una configuración
  useEffect(() => {
    localStorage.setItem("cubix_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}