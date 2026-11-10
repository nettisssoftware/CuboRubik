import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { CubeApi, Phase } from "@/game/CubeStage";
import { SettingsMenu } from "@/components/ui/SettingsMenu";
import { useSettings } from "@/components/ui/useSettings";
import { audioManager } from "@/game/audio-manager";

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

  // Configuración del usuario
  const { settings, updateSetting } = useSettings();

  // 1. Cargar el componente 3D de forma dinámica
  useEffect(() => {
    let live = true;
    void import("@/game/CubeStage").then((mod) => {
      if (live) setStage(() => mod.CubeStage);
    });
    return () => {
      live = false;
    };
  }, []);

  // 2. Lógica de la música al iniciar
  useEffect(() => {
    if (settings.musicEnabled) {
      audioManager.play();
    }
  }, [settings.musicEnabled]);

  // 3. Función que recibe los cambios del menú en tiempo real
  const handleSettingsChange = (newSettings: typeof settings) => {
    if (api.current) {
      api.current.setSensitivity(newSettings.cameraSensitivity);
      api.current.setHaptics(newSettings.hapticsEnabled);
      
      if (newSettings.theme === "custom") {
        api.current.setCustomColors(newSettings.customColors);
      } else {
        api.current.setTheme(newSettings.theme);
      }
    }
    
    if (newSettings.musicEnabled) {
      audioManager.play();
    } else {
      audioManager.pause();
    }
  };

  const handleSaveState = (state: any) => {
  if (settings.saveProgress) {
    updateSetting("savedGame", state);
  }
};

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => {
      lastTap.current = 0;
      setArmed(false);
    }, 480);
    return () => window.clearTimeout(id);
  }, [armed]);

  // 4. Lógica del doble toque (Iniciar y Reiniciar)
  const onTap = () => {
    // Ignoramos toques si el cubo se está mezclando o el jugador está jugando
    if (phaseRef.current === "scrambling" || phaseRef.current === "playing") return;

    const now = performance.now();
    if (now - lastTap.current < 420) {
      lastTap.current = 0;
      setArmed(false);
      
      // Si está listo, empezamos. Si ya ganó, reiniciamos.
      if (phaseRef.current === "ready") {
        if (api.current) api.current.start();
        else pendingStart.current = true;
      } else if (phaseRef.current === "won") {
        if (api.current) api.current.replay();
      }
      return;
    }
    lastTap.current = now;
    setArmed(true);
  };

  return (
    <main className="arena">
      <div className="stage">
        {Stage ? (
          <Stage
            settings={settings} // <-- PASAMOS LA CONFIGURACIÓN
            onSaveState={handleSaveState}
            onPhase={setPhase}
            onTap={onTap}
            onFirstMove={() => setHint(false)}
            onApi={(next) => {
              api.current = next;
              
              // Aplicamos la configuración guardada en cuanto la API esté lista
              next.setSensitivity(settings.cameraSensitivity);
              next.setHaptics(settings.hapticsEnabled);
              
              if (settings.theme === "custom") {
                next.setCustomColors(settings.customColors);
              } else {
                next.setTheme(settings.theme);
              }

              if (pendingStart.current) {
                pendingStart.current = false;
                next.start();
              }
            }}
          />
        ) : null}
      </div>
      <div className="vignette" />
      
      <SettingsMenu onChange={handleSettingsChange} />

      <header className="hud">
        <div className="brand">
          <p className="wordmark">CUBIX</p>
          <p className="kicker">Arena 3×3</p>
        </div>
        <div className="hud-copy">
          {phase === "ready" ? (
            <>
              <p className="prompt">Toca dos veces la pantalla para comenzar</p>
              {armed ? <p className="armed">Una vez más</p> : null}
            </>
          ) : null}
          {phase === "scrambling" ? <p className="status">Mezclando el cubo</p> : null}
          {phase === "playing" ? (
            <p className="status">
              {hint
                ? "Desliza una pieza para girarla. Arrastra el vacío para mover la cámara. Pellizca para acercar."
                : "Arma las seis caras"}
            </p>
          ) : null}
          
          {/* NUEVO HUD DE VICTORIA */}
          {phase === "won" ? (
            <>
              <p className="prompt" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                ¡Cubo resuelto!
              </p>
              <p className="status">
                {armed ? "Una vez más para mezclar..." : "Toca dos veces para jugar de nuevo"}
              </p>
            </>
          ) : null}
        </div>
      </header>
    </main>
  );
}