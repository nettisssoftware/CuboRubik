import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { NoToneMapping, type PerspectiveCamera as ThreeCamera } from "three";
import { CubeEngine, type CubeApi, type Phase } from "./engine";

type Props = {
  onPhase: (phase: Phase) => void;
  onTap: () => void;
  onFirstMove: () => void;
  onApi: (api: CubeApi) => void;
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
    propsRef.current.onApi({
      start: () => engine.start(),
      replay: () => engine.replay(),
    });

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
  }, [gl, camera, scene]);

  useFrame((_, dt) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setViewport(size.width, size.height);
    engine.tick(dt);
  });

  return null;
}

export function CubeStage(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 200, position: [4, 3.2, 10] }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: NoToneMapping,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

export type { CubeApi, Phase };
