import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/game/Confetti";
import type { CubeApi, Phase } from "@/game/CubeStage";
// Importamos el menú, el hook de settings y el gestor de audio
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

  // --- NUEVO: Configuración del usuario ---
  const { settings } = useSettings();

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

  // 3. Función que recibe los cambios del menú
  const handleSettingsChange = (newSettings: typeof settings) => {
    // Aplicamos cambios en tiempo real si el cubo ya está cargado
    if (api.current) {
      api.current.setSensitivity(newSettings.cameraSensitivity);
      api.current.setTheme(newSettings.theme);
    }
    
    // Control de música
    if (newSettings.musicEnabled) {
      audioManager.play();
    } else {
      audioManager.pause();
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

  const onTap = () => {
    if (phaseRef.current !== "ready") return;
    const now = performance.now();
    if (now - lastTap.current < 420) {
      lastTap.current = 0;
      setArmed(false);
      if (api.current) api.current.start();
      else pendingStart.current = true;
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
            onPhase={setPhase}
            onTap={onTap}
            onFirstMove={() => setHint(false)}
            onApi={(next) => {
              api.current = next;
              
              // 4. Aplicamos la configuración guardada en cuanto la API esté lista
              next.setSensitivity(settings.cameraSensitivity);
              next.setTheme(settings.theme);

              if (pendingStart.current) {
                pendingStart.current = false;
                next.start();
              }
            }}
          />
        ) : null}
      </div>
      <div className="vignette" />
      
      {/* 5. Añadimos el botón de engranaje y el menú flotante */}
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
        </div>
      </header>
      {phase === "won" ? <Victory onReplay={() => api.current?.replay()} /> : null}
    </main>
  );
}

function Victory({ onReplay }: { onReplay: () => void }) {
  const born = useRef(0);
  if (born.current === 0) born.current = performance.now();

  return (
    <div
      className="victory"
      role="dialog"
      aria-modal="true"
      aria-label="Cubo resuelto. Toca para volver a jugar."
      onPointerUp={() => {
        if (performance.now() - born.current < 500) return;
        onReplay();
      }}
    >
      <Confetti />
      <div className="victory-card">
        <div className="trophy-ring">
          <Trophy strokeWidth={1.75} />
        </div>
        <p className="kicker">Victoria</p>
        <h2>Cubo resuelto</h2>
        <p className="victory-copy">Las seis caras coinciden.</p>
        <p className="cta">Toca para volver a jugar</p>
      </div>
    </div>
  );
}