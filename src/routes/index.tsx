import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { CubeApi, Phase } from "@/game/CubeStage";
import { SettingsMenu } from "@/components/ui/SettingsMenu";
import { useSettings } from "@/components/ui/useSettings";

export const Route = createFileRoute("/")({ component: Home });
type StageComponent = typeof import("@/game/CubeStage").CubeStage;

function Home() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [armed, setArmed] = useState(false);
  const [hint, setHint] = useState(true);
  const [Stage, setStage] = useState<StageComponent | null>(null);
  const api = useRef<CubeApi | null>(null);
  const pendingStart = useRef(false);
  const lastTap = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const { settings, updateSetting, updateSettings, clearAllData, isLoaded } = useSettings();

  useEffect(() => {
    let live = true;
    void import("@/game/CubeStage").then(mod => { if (live) setStage(() => mod.CubeStage); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const current = api.current;
    if (!current) return;
    current.setSensitivity(settings.cameraSensitivity);
    current.setMoveSensitivity(settings.moveSensitivity);
    current.setSfxEnabled(settings.sfxEnabled);
    current.setReducedMotion(settings.reducedMotion);
    current.setHaptics(settings.hapticsEnabled);
    if (settings.theme === "custom") current.setCustomColors(settings.customColors);
    else current.setTheme(settings.theme);
  }, [settings.cameraSensitivity, settings.moveSensitivity, settings.sfxEnabled,
      settings.hapticsEnabled, settings.theme, settings.customColors]);

  const handleSettingsChange = (patch: Partial<typeof settings>) => {
    if (patch.saveProgress === false) updateSettings({ ...patch, savedGame: null });
    else updateSettings(patch);
  };
  const handleSaveState = (state: any) => {
    if (settings.saveProgress) updateSetting("savedGame", state);
  };

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => { lastTap.current = 0; setArmed(false); }, 480);
    return () => window.clearTimeout(id);
  }, [armed]);

  const onTap = () => {
    if (phaseRef.current === "scrambling" || phaseRef.current === "playing") return;
    const now = performance.now();
    if (now - lastTap.current < 420) {
      lastTap.current = 0;
      setArmed(false);
      if (phaseRef.current === "ready") {
        if (api.current) api.current.start();
        else pendingStart.current = true;
      } else if (phaseRef.current === "won" && api.current) api.current.replay();
      return;
    }
    lastTap.current = now;
    setArmed(true);
  };

  return (
    <main className="arena">
      <div className="stage">
        {Stage && isLoaded ? <Stage
          settings={settings}
          onSaveState={handleSaveState}
          onPhase={setPhase}
          onTap={onTap}
          onFirstMove={() => setHint(false)}
          onApi={next => {
            api.current = next;
            next.setSensitivity(settings.cameraSensitivity);
            next.setMoveSensitivity(settings.moveSensitivity);
            next.setSfxEnabled(settings.sfxEnabled);
            next.setReducedMotion(settings.reducedMotion);
            next.setHaptics(settings.hapticsEnabled);
            if (settings.theme === "custom") next.setCustomColors(settings.customColors);
            else next.setTheme(settings.theme);
            if (pendingStart.current) { pendingStart.current = false; next.start(); }
          }}
        /> : null}
      </div>
      <div className="vignette" />
      <SettingsMenu settings={settings} onChange={handleSettingsChange} onClear={clearAllData} />
      <header className="hud">
        <div className="brand"><p className="wordmark">CUBIX</p><p className="kicker">Arena 3×3</p></div>
        <div className="hud-copy">
          {phase === "ready" ? <><p className="prompt">Toca dos veces la pantalla para comenzar</p>{armed ? <p className="armed">Una vez más</p> : null}</> : null}
          {phase === "scrambling" ? <p className="status">Mezclando el cubo</p> : null}
          {phase === "playing" ? <p className="status">{hint
            ? "Desliza una pieza para girarla. Arrastra el vacío para mover la cámara. Pellizca para acercar."
            : "Arma las seis caras"}</p> : null}
          {phase === "won" ? <><p className="prompt" style={{ color: "var(--color-primary)", fontWeight: 600 }}>¡Cubo resuelto!</p>
            <p className="status">{armed ? "Una vez más para mezclar..." : "Toca dos veces para jugar de nuevo"}</p></> : null}
        </div>
      </header>
    </main>
  );
}
