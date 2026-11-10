import { useState } from "react";
import { useSettings, type FaceColor } from "@/components/ui/useSettings";
import { audioManager } from "@/game/audio-manager";
import "@/components/ui/SettingsMenu.css";

type Props = {
  onChange: (settings: ReturnType<typeof useSettings>["settings"]) => void;
};

const THEMES = [
  { id: "classic", name: "Clásico", colors: ["#de1b24", "#0057d9", "#ffd000"] },
  { id: "neon", name: "Neón", colors: ["#ff003c", "#00b3ff", "#00ff41"] },
  { id: "pastel", name: "Pastel", colors: ["#ff6b6b", "#70a1ff", "#ffeda0"] },
  { id: "halloween", name: "Halloween", colors: ["#ff3300", "#6600cc", "#00cc44"] },
] as const;

const FACE_LABELS = { W: "Blanco", Y: "Amarillo", R: "Rojo", O: "Naranja", G: "Verde", B: "Azul" };

export function SettingsMenu({ onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, clearAllData } = useSettings();

  const handleChange = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    updateSetting(key, value);
    onChange(newSettings);

    if (key === "musicEnabled") {
      value ? audioManager.play() : audioManager.pause();
    }
  };

  const handleColorChange = (face: keyof FaceColor, color: string) => {
    const newColors = { ...settings.customColors, [face]: color };
    handleChange("customColors", newColors);
    handleChange("theme", "custom"); // Forzamos el tema custom al cambiar un color
  };

  return (
    <>
      <button className="settings-gear-btn" onClick={() => setIsOpen(true)} aria-label="Configuración">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <button className="back-btn" onClick={() => setIsOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h2>Ajustes</h2>
              <div style={{ width: 32 }} /> {/* Espaciador para centrar el título */}
            </div>

            <div className="settings-content">
              
              {/* SECCIÓN AUDIO */}
              <p className="section-title">Audio</p>
              <div className="settings-group">
                <div className="setting-row">
                  <span>Música de fondo</span>
                  <label className="switch">
                    <input type="checkbox" checked={settings.musicEnabled} onChange={(e) => handleChange("musicEnabled", e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="setting-row">
                  <span>Efectos de sonido</span>
                  <label className="switch">
                    <input type="checkbox" checked={settings.sfxEnabled} onChange={(e) => handleChange("sfxEnabled", e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              {/* SECCIÓN VISUAL Y TEMAS */}
              <p className="section-title">Aspecto visual y Temas</p>
              <div className="settings-group">
                <div className="setting-row column">
                  <span className="row-label">Tema de colores</span>
                  <div className="theme-grid">
                    {THEMES.map((t) => (
                      <button key={t.id} className={`theme-btn ${settings.theme === t.id ? "active" : ""}`} onClick={() => handleChange("theme", t.id)}>
                        <div className="theme-preview">
                          {t.colors.map((c) => <span key={c} style={{ background: c }} />)}
                        </div>
                        <span className="theme-name">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="setting-row column">
                  <span className="row-label">Colores personalizados</span>
                  <div className="color-picker-grid">
                    {Object.entries(settings.customColors).map(([face, hex]) => {
                      const isWhite = face === "W";
                      return (
                        <div key={face} className="color-cube-wrapper">
                          {isWhite ? (
                            <div className="color-cube locked" style={{ background: hex }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </div>
                          ) : (
                            <label className="color-cube" style={{ background: hex }}>
                              <input type="color" value={hex} onChange={(e) => handleColorChange(face as keyof FaceColor, e.target.value)} title={FACE_LABELS[face as keyof typeof FACE_LABELS]} />
                            </label>
                          )}
                          <span className="color-label">{face}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="setting-row">
                  <span>Reducir animaciones</span>
                  <label className="switch">
                    <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => handleChange("reducedMotion", e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              {/* SECCIÓN RENDIMIENTO Y CALIDAD */}
              <p className="section-title">Rendimiento y calidad</p>
              <div className="settings-group">
                <div className="setting-row column">
                  <span className="row-label">Calidad de sombras</span>
                  <select value={settings.shadowQuality} onChange={(e) => handleChange("shadowQuality", e.target.value)} className="custom-select">
                    <option value="low">Baja</option>
                    <option value="medium">Media (Recomendada)</option>
                    <option value="high">Alta</option>
                  </select>
                  <p className="helper-text">
                    {settings.shadowQuality === "high" && "⚠️ Puede causar caídas de FPS en móviles de gama baja."}
                    {settings.shadowQuality === "medium" && "Equilibrio ideal entre rendimiento y calidad visual."}
                    {settings.shadowQuality === "low" && "Las sombras se verán pixeladas. Mejora el rendimiento."}
                  </p>
                </div>
                
                <div className="setting-row">
                  <div className="row-text">
                    <span>Modo ahorro de batería</span>
                    <p className="helper-text">Reduce la nitidez para alargar la batería y evitar sobrecalentamiento.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.batterySaver} onChange={(e) => handleChange("batterySaver", e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              {/* SECCIÓN INTERACCIÓN Y CONTROL */}
              <p className="section-title">Interacción y control</p>
              <div className="settings-group">
                <div className="setting-row column">
                  <div className="row-header">
                    <span className="row-label">Sensibilidad de la cámara</span>
                    <span className="value-badge">{(settings.cameraSensitivity * 1000).toFixed(1)}</span>
                  </div>
                  <input type="range" min="0.001" max="0.01" step="0.0005" value={settings.cameraSensitivity} onChange={(e) => handleChange("cameraSensitivity", parseFloat(e.target.value))} className="slider-range" />
                </div>
                
                <div className="setting-row">
                  <span>Vibración háptica</span>
                  <label className="switch">
                    <input type="checkbox" checked={settings.hapticsEnabled} onChange={(e) => handleChange("hapticsEnabled", e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              {/* SECCIÓN DATOS */}
              <p className="section-title">Datos</p>
              <div className="settings-group">
                <div className="setting-row">
                  <span>Guardar progreso local</span>
                  <label className="switch">
                    <input type="checkbox" checked={settings.saveProgress} onChange={(e) => handleChange("saveProgress", e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="setting-row">
                  <button className="danger-text-btn" onClick={() => {
                    if (window.confirm("¿Seguro que quieres borrar todo tu progreso y ajustes? Esta acción no se puede deshacer.")) {
                      clearAllData();
                      onChange(useSettings().settings); // Forzamos actualización del padre
                      window.location.reload(); // Recarga limpia para asegurar el reset
                    }
                  }}>
                    Borrar progreso guardado
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}