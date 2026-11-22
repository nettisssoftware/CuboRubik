import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { NoToneMapping, ACESFilmicToneMapping, type PerspectiveCamera as ThreeCamera } from "three";
import { CubeEngine, type CubeApi, type Phase } from "./engine";
import type { GameSettings } from "@/components/ui/useSettings";

type Props = {
  onPhase: (phase: Phase) => void;
  onTap: () => void;
  onFirstMove: () => void;
  onApi: (api: CubeApi) => void;
  settings: GameSettings;
  onSaveState: (state: any) => void;
};

function Scene(props: Props) {
  const { gl, camera, scene, size } = useThree();
  const propsRef = useRef(props);
  propsRef.current = props;
  const engineRef = useRef<CubeEngine | null>(null);

  useEffect(() => {
    const engine = new CubeEngine({
      scene, camera: camera as ThreeCamera, dom: gl.domElement,
      hooks: {
        onPhase: phase => propsRef.current.onPhase(phase),
        onTap: () => propsRef.current.onTap(),
        onFirstMove: () => propsRef.current.onFirstMove(),
      },
    });
    engineRef.current = engine;
    engine.initSettings({
      cameraSensitivity: props.settings.cameraSensitivity,
      moveSensitivity: props.settings.moveSensitivity,
      sfxEnabled: props.settings.sfxEnabled,
      hapticsEnabled: props.settings.hapticsEnabled,
      theme: props.settings.theme,
      customColors: props.settings.customColors,
    });
    engine.onStateChange = () => propsRef.current.onSaveState(engine.getSaveState());
    if (props.settings.savedGame) engine.loadSaveState(props.settings.savedGame);

    propsRef.current.onApi({
      start: () => engine.start(),
      replay: () => engine.replay(),
      setSensitivity: value => engine.setSensitivity(value),
      setMoveSensitivity: value => engine.setMoveSensitivity(value),
      setSfxEnabled: enabled => engine.setSfxEnabled(enabled),
      setTheme: theme => engine.setTheme(theme),
      setCustomColors: colors => engine.setCustomColors(colors),
      setHaptics: enabled => engine.setHaptics(enabled),
    });

    const element = gl.domElement;
    const down = (event: PointerEvent) => engine.onPointerDown(event);
    const move = (event: PointerEvent) => engine.onPointerMove(event);
    const up = (event: PointerEvent) => engine.onPointerUp(event);
    const wheel = (event: WheelEvent) => { event.preventDefault(); engine.onWheel(event); };
    const preventMenu = (event: Event) => event.preventDefault();
    const preventTouchScroll = (event: TouchEvent) => event.preventDefault();
    element.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("contextmenu", preventMenu);
    element.addEventListener("touchmove", preventTouchScroll, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("contextmenu", preventMenu);
      element.removeEventListener("touchmove", preventTouchScroll);
      engine.dispose();
      engineRef.current = null;
    };
  }, [gl, camera, scene]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSensitivity(props.settings.cameraSensitivity);
    engine.setMoveSensitivity(props.settings.moveSensitivity);
    engine.setSfxEnabled(props.settings.sfxEnabled);
    engine.setHaptics(props.settings.hapticsEnabled);
    if (props.settings.theme === "custom") engine.setCustomColors(props.settings.customColors);
    else engine.setTheme(props.settings.theme);
  }, [props.settings.cameraSensitivity, props.settings.moveSensitivity, props.settings.sfxEnabled,
      props.settings.hapticsEnabled, props.settings.theme, props.settings.customColors]);

  useFrame((_, dt) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setViewport(size.width, size.height);
    engine.tick(dt);
  });
  return null;
}

export function CubeStage(props: Props) {
  return <Canvas shadows dpr={[1, 2]}
    camera={{ fov: 32, near: 1, far: 50, position: [4, 3.2, 10] }}
    gl={{
      antialias: true, alpha: true,
      toneMapping: props.settings.theme === "neon" ? ACESFilmicToneMapping : NoToneMapping,
      powerPreference: "high-performance",
    }}
    onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}>
    <Scene {...props} />
  </Canvas>;
}

export type { CubeApi, Phase };
