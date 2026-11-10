import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { 
  NoToneMapping, 
  ACESFilmicToneMapping, 
  type PerspectiveCamera as ThreeCamera 
} from "three";
import { CubeEngine, type CubeApi, type Phase } from "./engine";
import type { GameSettings } from "@/components/ui/useSettings";

type Props = {
  onPhase: (phase: Phase) => void;
  onTap: () => void;
  onFirstMove: () => void;
  onApi: (api: CubeApi) => void;
  settings: GameSettings; // <-- NUEVO
  onSaveState: (state: any) => void;
};

function Scene(props: Props) {
  const { gl, camera, scene, size } = useThree();
  const propsRef = useRef(props);
  propsRef.current = props;
  const engineRef = useRef<CubeEngine | null>(null);

  useEffect(() => {
    const engine = new CubeEngine({
      scene,
      camera: camera as ThreeCamera,
      dom: gl.domElement,
      hooks: {
        onPhase: (phase) => propsRef.current.onPhase(phase),
        onTap: () => propsRef.current.onTap(),
        onFirstMove: () => propsRef.current.onFirstMove(),
      },
    });
    engineRef.current = engine;

    // NUEVO: Configurar el guardado automático
engine.onStateChange = () => {
  const saveState = engine.getSaveState();
  if (propsRef.current.onSaveState) {
    propsRef.current.onSaveState(saveState);
  }
};

// NUEVO: Cargar partida si existe
if (props.settings.savedGame) {
  engine.loadSaveState(props.settings.savedGame);
}
    
    // API EXPUESTA AL PADRE
    propsRef.current.onApi({
      start: () => engine.start(),
      replay: () => engine.replay(),
      setSensitivity: (val) => engine.setSensitivity(val),
      setTheme: (theme) => engine.setTheme(theme),
      setCustomColors: (colors) => engine.setCustomColors(colors), // <-- NUEVO
      setHaptics: (enabled) => engine.setHaptics(enabled),          // <-- NUEVO
    });

    // Aplicar configuración inicial al motor
    engine.setSensitivity(props.settings.cameraSensitivity);
    if (props.settings.theme === "custom") {
      engine.setCustomColors(props.settings.customColors);
    } else {
      engine.setTheme(props.settings.theme);
    }
    engine.setHaptics(props.settings.hapticsEnabled);

    const el = gl.domElement;
    const down = (e: PointerEvent) => engine.onPointerDown(e);
    const move = (e: PointerEvent) => engine.onPointerMove(e);
    const up = (e: PointerEvent) => engine.onPointerUp(e);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      engine.onWheel(e);
    };
    const menu = (e: Event) => e.preventDefault();
    const blockTouch = (e: TouchEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", menu);
    el.addEventListener("touchmove", blockTouch, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", menu);
      el.removeEventListener("touchmove", blockTouch);
      engine.dispose();
      engineRef.current = null;
    };
  }, [gl, camera, scene]); // Solo se inicializa una vez

  // NUEVO: Efecto para actualizar el motor cuando cambian los ajustes
  useEffect(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    
    engine.setSensitivity(props.settings.cameraSensitivity);
    engine.setHaptics(props.settings.hapticsEnabled);
    
    if (props.settings.theme === "custom") {
      engine.setCustomColors(props.settings.customColors);
    } else {
      engine.setTheme(props.settings.theme);
    }

    // Actualizar calidad de sombras
    engine.updateShadowQuality(props.settings.shadowQuality);
    
  }, [
  props.settings.cameraSensitivity, 
  props.settings.hapticsEnabled, 
  props.settings.theme, 
  props.settings.customColors, 
  props.settings.shadowQuality
]);

  useFrame((_, dt) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setViewport(size.width, size.height);
    engine.tick(dt);
  });

  return null;
}

export function CubeStage(props: Props) {
  // Lógica de DPR dinámico
  const dpr: [number, number] = props.settings.batterySaver ? [1, 1] : [1, 3];
  
  return (
    <Canvas
      shadows={props.settings.shadowQuality !== "low"} // Desactiva sombras si es "low"
      dpr={dpr}
      camera={{ fov: 32, near: 1, far: 50, position: [4, 3.2, 10] }}
      gl={{
        antialias: true,
        alpha: true,
        // Tone Mapping dinámico
        toneMapping: props.settings.theme === "neon" ? ACESFilmicToneMapping : NoToneMapping,
        powerPreference: props.settings.batterySaver ? "default" : "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

export type CubeApi = {
  start: () => void;
  replay: () => void;
  setSensitivity: (val: number) => void;
  setTheme: (theme: "classic" | "neon" | "halloween" | "pastel") => void;
  setCustomColors: (colors: Record<string, string>) => void;
  setHaptics: (enabled: boolean) => void;
};

export type { CubeApi, Phase };