import { useState } from "react";
import { useSettings } from "@/components/ui/useSettings"; // ✅ Ruta corregida
import { audioManager } from "@/game/audio-manager";      // ✅ Ruta corregida
import "@/components/ui/SettingsMenu.css";                // ✅ Ruta corregida
// Props para pasarle la configuración al Engine 3D
type Props = {
  onChange: (settings: ReturnType<typeof useSettings>["settings"]) => void;
};

export function SettingsMenu({ onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting } = useSettings();

  const handleChange = (key: keyof typeof settings, value: any) => {
  // 1. Creamos el nuevo objeto de configuración
  const newSettings = { ...settings, [key]: value };
  
  // 2. Actualizamos el estado local
  updateSetting(key, value);
  
  // 3. Enviamos el objeto COMPLETO al motor
  onChange(newSettings);
  
  // Lógica especial para la música
  if (key === "musicEnabled") {
    value ? audioManager.play() : audioManager.pause();
  }
};

  return (
    <>
      {/* Botón del Engranaje (Fijo arriba a la derecha) */}
      <button 
        className="settings-gear-btn" 
        onClick={() => setIsOpen(true)}
        aria-label="Configuración"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {/* Panel Deslizante */}
      {isOpen && (
        <div className="settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Configuración</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="settings-content">
              {/* SECCIÓN AUDIO */}
              <h3>Audio</h3>
              <div className="setting-row">
                <span>Música de fondo</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={settings.musicEnabled} 
                    onChange={(e) => handleChange("musicEnabled", e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="setting-row">
                <span>Efectos de sonido</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={settings.sfxEnabled} 
                    onChange={(e) => handleChange("sfxEnabled", e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* SECCIÓN VISUAL */}
              <h3>Visual</h3>
              <div className="setting-row">
                <span>Tema de colores</span>
                <select 
                  value={settings.theme} 
                  onChange={(e) => handleChange("theme", e.target.value)}
                  className="theme-select"
                >
                  <option value="classic">Clásico</option>
                  <option value="neon">Neón</option>
                  <option value="halloween">Halloween</option>
                  <option value="pastel">Pastel</option>
                </select>
              </div>
              <div className="setting-row">
                <span>Reducir animaciones</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={settings.reducedMotion} 
                    onChange={(e) => handleChange("reducedMotion", e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* SECCIÓN CONTROL */}
              <h3>Control</h3>
              <div className="setting-row column">
                <span>Sensibilidad de la cámara</span>
                <input 
                  type="range" 
                  min="0.001" max="0.01" step="0.0005" 
                  value={settings.cameraSensitivity}
                  onChange={(e) => handleChange("cameraSensitivity", parseFloat(e.target.value))}
                  className="slider-range"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}