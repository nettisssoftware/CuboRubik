import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { FaceColor, GameSettings } from "@/components/ui/useSettings";
import "@/components/ui/SettingsMenu.css";

type Props = {
  settings: GameSettings;
  onChange: (patch: Partial<GameSettings>) => void;
  onClear: () => void;
};

const THEMES = [
  { id: "classic", name: "Clásico", colors: ["#cd0009", "#0057d9", "#e2b800"] },
  { id: "neon", name: "Neón", colors: ["#ff003c", "#00b3ff", "#00ff41"] },
  { id: "pastel", name: "Pastel", colors: ["#ff5353", "#74d1ff", "#ffe05e"] },
  { id: "halloween", name: "Halloween", colors: ["#ff3300", "#0053cc", "#00cc44"] },
] as const;
const FACE_LABELS: Record<keyof FaceColor, string> = {
  W: "Blanco", Y: "Amarillo", R: "Rojo", O: "Naranja", G: "Verde", B: "Azul",
};
const THEME_PALETTES: Record<"classic" | "neon" | "pastel" | "halloween", FaceColor> = {
  classic: { R: "#cd0009", O: "#bc4e00", W: "#ffffff", Y: "#e2b800", G: "#009b48", B: "#0057d9" },
  neon: { R: "#ff003c", O: "#ff7b00", W: "#f0f0f0", Y: "#ffee00", G: "#00ff41", B: "#00b3ff" },
  pastel: { R: "#ff5353", O: "#ffa502", W: "#f1f2f6", Y: "#ffe05e", G: "#33ff87", B: "#74d1ff" },
  halloween: { R: "#ff3300", O: "#ff8c00", W: "#e0e0e0", Y: "#ffcc00", G: "#00cc44", B: "#0053cc" },
};

export function SettingsMenu({ settings, onChange, onClear }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ [key]: value } as Pick<GameSettings, K>);
  const handleColorChange = (face: keyof FaceColor, color: string) =>
    onChange({ customColors: { ...settings.customColors, [face]: color }, theme: "custom" });
  const handleThemeChange = (theme: keyof typeof THEME_PALETTES) =>
    onChange({ theme, customColors: THEME_PALETTES[theme] });
  const handleClear = () => {
    if (!window.confirm("¿Seguro que quieres borrar todo tu progreso y ajustes? Esta acción no se puede deshacer.")) return;
    onClear();
    window.location.reload();
  };

  return (
    <>
      <button className="settings-gear-btn" onClick={() => setIsOpen(true)} aria-label="Configuración">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33 2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
      {isOpen && (
        <div className="settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="settings-panel" onClick={event => event.stopPropagation()}>
            <div className="settings-header">
              <button className="back-btn" onClick={() => setIsOpen(false)} aria-label="Cerrar ajustes">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h2>Ajustes</h2><div style={{ width: 32 }} />
            </div>
            <div className="settings-content">
              <p className="section-title">Audio</p>
              <div className="settings-group">
                <div className="setting-row"><span>Efectos de sonido</span><label className="switch">
                  <input type="checkbox" checked={settings.sfxEnabled} onChange={event => handleChange("sfxEnabled", event.target.checked)} />
                  <span className="slider round"></span>
                </label></div>
              </div>

              <p className="section-title">Aspecto visual y temas</p>
              <div className="settings-group">
                <div className="setting-row column">
                  <span className="row-label">Tema de colores</span>
                  <div className="theme-grid">
                    {THEMES.map(theme => <button key={theme.id} type="button"
                      className={`theme-btn ${settings.theme === theme.id ? "active" : ""}`}
                      aria-pressed={settings.theme === theme.id}
                      onClick={() => handleThemeChange(theme.id)}>
                      <div className="theme-preview">{theme.colors.map(color => <span key={color} style={{ background: color }} />)}</div>
                      <span className="theme-name">{theme.name}</span>
                    </button>)}
                  </div>
                </div>
                <div className="setting-row column">
                  <span className="row-label">Colores personalizados</span>
                  <div className="color-picker-grid">
                    {(Object.entries(settings.customColors) as [keyof FaceColor, string][]).map(([face, hex]) => (
                      <div key={face} className="color-cube-wrapper">
                        {face === "W" ? <div className="color-cube locked" style={{ background: hex }} title="El centro blanco está protegido">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div> : <label className="color-cube" style={{ background: hex }} title={FACE_LABELS[face]}>
                          <input type="color" value={hex} aria-label={`Color ${FACE_LABELS[face]}`} onChange={event => handleColorChange(face, event.target.value)} />
                        </label>}
                        <span className="color-label">{face}</span>
                      </div>
                    ))}
                  </div>
                  <p className="helper-text">Los cambios se aplican al cubo inmediatamente. Al elegir un color personalizado se activa el tema Personalizado.</p>
                </div>
                <div className="setting-row">
                  <span>Reducir animaciones</span>
                  <label className="switch">
                    <input type="checkbox" checked={settings.reducedMotion} onChange={event => handleChange("reducedMotion", event.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <p className="section-title">Interacción y control</p>
              <div className="settings-group">
                <div className="setting-row column">
                  <div className="row-header"><span className="row-label">Sensibilidad de la cámara</span>
                    <span className="value-badge">{(settings.cameraSensitivity * 1000).toFixed(1)}</span></div>
                  <input type="range" min="0.001" max="0.01" step="0.0005" value={settings.cameraSensitivity}
                    aria-label="Sensibilidad de la cámara" onChange={event => handleChange("cameraSensitivity", Number(event.target.value))} className="slider-range" />
                  <p className="helper-text">Controla la velocidad de giro de la cámara al arrastrar o usar el gesto de pellizco.</p>
                </div>
                <div className="setting-row column">
                  <div className="row-header"><span className="row-label">Sensibilidad de las piezas</span>
                    <span className="value-badge">{Math.round(settings.moveSensitivity * 100)}%</span></div>
                  <input type="range" min="0.5" max="2" step="0.1" value={settings.moveSensitivity}
                    aria-label="Sensibilidad de las piezas" onChange={event => handleChange("moveSensitivity", Number(event.target.value))} className="slider-range" />
                  <p className="helper-text">Ajusta cuánto recorrido del dedo o del ratón se necesita para girar una capa del cubo.</p>
                </div>
                <div className="setting-row"><span>Vibración háptica</span><label className="switch">
                  <input type="checkbox" checked={settings.hapticsEnabled} onChange={event => handleChange("hapticsEnabled", event.target.checked)} />
                  <span className="slider round"></span>
                </label></div>
              </div>

              <p className="section-title">Datos</p>
              <div className="settings-group">
                <div className="setting-row"><span>Guardar progreso local</span><label className="switch">
                  <input type="checkbox" checked={settings.saveProgress} onChange={event => onChange({
                    saveProgress: event.target.checked, ...(event.target.checked ? {} : { savedGame: null }),
                  })} />
                  <span className="slider round"></span>
                </label></div>
                <div className="setting-row"><button className="danger-text-btn" type="button" onClick={handleClear}>Borrar progreso guardado</button></div>
                <div className="setting-row"><Link className="legal-settings-link" to="/privacidad">Política de privacidad <span aria-hidden="true">›</span></Link></div>
                <div className="setting-row"><Link className="legal-settings-link" to="/terminos">Términos de uso <span aria-hidden="true">›</span></Link></div>
                <div className="setting-row"><Link className="legal-settings-link" to="/contacto">Contacto <span aria-hidden="true">›</span></Link></div>
              </div>
            </div>
            <footer className="settings-brand-footer">
              <span className="settings-brand-symbol" aria-label="尊">尊</span>
              <span className="settings-brand-name">ZUN CUBE</span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
