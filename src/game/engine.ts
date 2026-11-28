import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  Texture,
  CanvasTexture,
  type Intersection,
} from "three";
import {
  applyQuarters,
  createSolved,
  faceColor,
  isSolved,
  makeScramble,
  rotateAround,
  type Axis,
  type Cubie,
  type Dir,
  type Layer,
  type Move,
  type Vec3,
} from "./cube-math";
import { createGanGeometries, GAN_LIFT, ganRoll } from "./gan-skin";
import { createNucleoCore } from "./nucleo-cube";
import { FACE_HEX } from "./palette";

export type Phase = "ready" | "scrambling" | "playing" | "won";

export type CubeApi = {
  start: () => void;
  replay: () => void;
  setSensitivity: (val: number) => void;
  setMoveSensitivity: (val: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setTheme: (theme: "classic" | "neon" | "halloween" | "pastel") => void;
  setCustomColors: (colors: Record<string, string>) => void;
  setHaptics: (enabled: boolean) => void;
};

type Hooks = {
  onPhase: (phase: Phase) => void;
  onTap: () => void;
  onFirstMove: () => void;
};

type Piece = Cubie & { mesh: Group };

type Basis = { piece: Piece; pos: Vec3; quat: Quaternion };

type Anim = {
  axis: Axis;
  layer: Layer;
  from: number;
  to: number;
  elapsed: number;
  dur: number;
  quarters: number;
  bases: Basis[];
  user: boolean;
  sound: boolean;
};

const SPACING = 1.03;
const AXIS_VEC = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

const TURN_MS = 0.16;
const SCRAMBLE_MS = 0.092;
const CASE_HIDDEN_Y = -6.2;

class Sfx {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  unlock() {
    if (!this.enabled) return;
    try {
      const AC =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* autoplay policies vary; the puzzle still works silent */
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
    if (!this.ctx) return;

    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(amp);
    amp.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  turn(soft: boolean) {
    if (!this.enabled) return;
    this.unlock();
    this.tone(soft ? 160 : 196, 0.05, "triangle", soft ? 0.018 : 0.045);
    this.tone(soft ? 340 : 480, 0.03, "square", soft ? 0.006 : 0.012);
  }

  win() {
    if (!this.enabled) return;
    this.unlock();
    [523, 659, 784, 1046].forEach((n, i) => this.tone(n, 0.2, "triangle", 0.045, i * 0.08));
  }

  caseClose() {
    if (!this.enabled) return;
    this.unlock();
    this.tone(125, 0.055, "square", 0.035);
    this.tone(390, 0.035, "triangle", 0.018, 0.008);
  }
}

export class CubeEngine {
  readonly cubeRoot = new Group();

  private readonly pieces: Piece[];
  private readonly camera: PerspectiveCamera;
  private readonly dom: HTMLElement;
  private readonly hooks: Hooks;

  private readonly raycaster = new Raycaster();
  private readonly sfx = new Sfx();
  private readonly boxRoot = new Group();
  private readonly boxLid = new Group();

  private boxY = 0;
  private boxTargetY = 0;
  private lidAngle = 0;
  private lidTargetAngle = 0;
  private boxRemoved = false;
  private boxMotion:
    | "idle"
    | "opening"
    | "closing"
    | "openingToHide"
    | "lowering"
    | "raising"
    | "closingAfterRise" = "idle";
  private cubeTapTimer: number | null = null;
  public onCaseStateChange: ((state: { removed: boolean; lidOpen: boolean }) => void) | null = null;
  public onCaseVisibilityChange: ((removed: boolean) => void) | null = null;

  private readonly owned: Object3D[] = [];
  private readonly geos: { dispose: () => void }[] = [];
  private readonly mats: { dispose: () => void }[] = [];

  private readonly ndc = new Vector2();
  private readonly grab = new Vector3();
  private readonly tmpA = new Vector3();
  private readonly tmpB = new Vector3();
  private readonly tmpC = new Vector3();
  private readonly tmpN = new Vector3();
  private readonly tmpQ = new Quaternion();
  private readonly screen = new Vector2();
  public onStateChange: (() => void) | null = null;

  phase: Phase = "ready";

  private currentTheme: string = "classic";
  private currentCustomColors: Record<string, string> | null = null;

  private queue: Move[] = [];
  private anim: Anim | null = null;

  // Textura del logo protegida
  private readonly logoTexture: Texture;

  private history: {
    axis: Axis;
    layer: Layer;
    quarters: number;
  }[] = [];

  private retries = 0;
  private announcedMove = false;

  private theta = 0.62;
  private sens = 0.0052;
  private moveSens = 1;
  private phi = 1.02;

  private radius = 12;
  private targetRadius = 12;
  private fitDist = 12;
  private userZoom = 1;

  private vTheta = 0;
  private vPhi = 0;

  private lookY = 0;
  private time = 0;

  private pointers = new Map<number, { x: number; y: number; travel: number }>();

  private mode: "none" | "pending" | "slice" | "orbit" | "pinch" = "none";

  private downX = 0;
  private downY = 0;
  private downAt = 0;
  private downButton = 0;
  private downOnCube = false;

  private orbiting = false;
  private autoResumeAt = 0;

  private slice: {
    axis: Axis;
    layer: Layer;
    bases: Basis[];
    angle: number;
    vel: number;
    lastAngle: number;
    lastT: number;
  } | null = null;

  private pendingPiece: Piece | null = null;

  private pinch: {
    dist: number;
    midX: number;
    midY: number;
    zoom: number;
    theta: number;
    phi: number;
  } | null = null;

  private reduced: boolean;
  private systemReducedMotion = false;
  private hapticsEnabled = true;

  constructor(opts: { scene: Scene; camera: PerspectiveCamera; dom: HTMLElement; hooks: Hooks }) {
    this.camera = opts.camera;
    this.dom = opts.dom;
    this.hooks = opts.hooks;

    this.systemReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.reduced = this.systemReducedMotion;

    // 1. CREACIÓN DEL CANVAS Y TEXTURA BLANCA BASE
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Fondo blanco inmediato para que la pieza nunca sea invisible
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);

    this.logoTexture = new CanvasTexture(canvas);

    // Normalizar las coordenadas UV de la pieza central.
    // La geometría tiene un tamaño de 0.94 × 0.94.
    this.logoTexture.repeat.set(1 / 0.94, 1 / 0.94);
    this.logoTexture.offset.set(0.5, 0.5);

    this.logoTexture.needsUpdate = true;

    // 2. CARGA ASÍNCRONA DEL LOGO
    const img = new Image();

    img.onload = () => {
      // El logo ocupará el 60 % de la superficie.
      const logoSize = 512 * 0.9;
      const offset = (512 - logoSize) / 2;

      // Dibujar el PNG centrado, conservando su transparencia.
      ctx.drawImage(img, offset, offset, logoSize, logoSize);

      // Actualizar la textura después de cargar la imagen.
      this.logoTexture.needsUpdate = true;
    };

    img.onerror = () => {
      console.error("No se pudo cargar /zun-logo.png");
    };

    img.src = "/zun-logo.png";

    this.pieces = this.buildPieces();
    this.buildLights(opts.scene);
    this.buildCase(opts.scene);
    opts.scene.add(this.cubeRoot);
    this.owned.push(this.cubeRoot);

    this.syncAll();
    this.hooks.onPhase(this.phase);
    this.publishDebug();
  }

  setViewport(w: number, h: number) {
    if (w < 2 || h < 2) return;

    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = w / h;
    const bound = 2.95;
    const fill = Math.min(w, h) < 700 ? 0.5 : 0.6;

    const tanV = Math.tan(fov / 2);
    const tanH = tanV * aspect;

    const distV = bound / (tanV * fill);
    const distH = bound / (tanH * fill);

    this.fitDist = Math.max(distV, distH);
    this.targetRadius = this.fitDist * this.userZoom;
  }

  tick(dt: number) {
    const d = Math.min(dt, 0.05);

    this.time += d;
    this.updateCamera(d);
    this.updateMotion(d);

    const bob = this.phase === "ready" && !this.reduced ? Math.sin(this.time * 1.15) * 0.07 : 0;

    this.cubeRoot.position.y += (bob - this.cubeRoot.position.y) * (1 - Math.exp(-4 * d));
    this.updateCase(d);
  }

  start() {
    if (this.phase !== "ready" || this.boxRoot.visible) return;
    this.sfx.unlock();
    this.beginScramble();
  }

  replay() {
    if (this.phase !== "won" || this.boxRoot.visible) return;
    this.sfx.unlock();
    this.beginScramble();
  }

  onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;

    this.dom.setPointerCapture?.(e.pointerId);

    this.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      travel: 0,
    });

    this.vTheta = 0;
    this.vPhi = 0;
    this.autoResumeAt = performance.now() + 1600;

    if (this.pointers.size >= 2) {
      this.cancelSlice(false);
      this.mode = "pinch";
      this.capturePinch();
      return;
    }

    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downAt = performance.now();
    this.downButton = e.button;

    // El raycast solo consulta las piezas del cubo, nunca la caja.
    // La caja no puede interceptar los toques dirigidos al cubo.
    const hit = e.button === 0 ? this.pick(e.clientX, e.clientY) : null;
    this.downOnCube = hit !== null;

    const orbitOnly =
      e.button === 2 ||
      e.button === 1 ||
      this.phase !== "playing" ||
      this.boxRoot.visible ||
      this.anim !== null ||
      this.queue.length > 0;

    if (orbitOnly) {
      this.mode = "orbit";
      this.orbiting = true;
      return;
    }

    if (!hit) {
      this.mode = "orbit";
      this.orbiting = true;
      return;
    }

    this.pendingPiece = hit.piece;
    this.grab.copy(hit.point);
    this.mode = "pending";
  }

  onPointerMove(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;

    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    p.x = e.clientX;
    p.y = e.clientY;
    p.travel += Math.hypot(dx, dy);

    if (this.pointers.size >= 2) {
      this.updatePinch();
      return;
    }

    if (this.mode === "orbit") {
      this.orbitBy(dx, dy);
      return;
    }

    if (this.mode === "pending") {
      const tdx = e.clientX - this.downX;
      const tdy = e.clientY - this.downY;
      const dist = Math.hypot(tdx, tdy);

      if (dist < 11) return;

      const choice = this.chooseAxis(tdx, tdy, dist);

      if (choice === "wait") return;

      if (choice === null || !this.pendingPiece) {
        this.mode = "orbit";
        this.orbiting = true;
        this.orbitBy(dx, dy);
        return;
      }

      this.beginSlice(choice.axis, choice.layer);
      this.accumulate(dx, dy);
      return;
    }

    if (this.mode === "slice") this.accumulate(dx, dy);
  }

  onPointerUp(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);

    if (!p) return;

    if (this.pointers.size === 0) {
      const tap = this.downButton === 0 && p.travel < 10 && performance.now() - this.downAt < 450;

      if (tap && this.mode !== "slice" && this.mode !== "pinch") {
        if (this.downOnCube) this.handleCubeTap();
        else if (!this.boxRoot.visible) this.hooks.onTap();
      }

      if (this.mode === "slice") this.releaseSlice();

      this.mode = "none";
      this.orbiting = false;
      this.pinch = null;
      this.pendingPiece = null;
      this.downOnCube = false;
      this.autoResumeAt = performance.now() + 1400;

      return;
    }

    if (this.mode === "pinch" && this.pointers.size === 1) {
      const rest = this.pointers.values().next().value;

      this.mode = "orbit";
      this.orbiting = true;
      this.pinch = null;

      if (rest) {
        this.downX = rest.x;
        this.downY = rest.y;
      }
    }
  }

  onWheel(e: WheelEvent) {
    const factor = e.deltaY > 0 ? 1.08 : 0.92;

    this.userZoom = this.userZoom * factor;
    this.targetRadius = this.fitDist * this.userZoom;
  }

  dispose() {
    if (this.cubeTapTimer !== null) {
      window.clearTimeout(this.cubeTapTimer);
      this.cubeTapTimer = null;
    }

    for (const obj of this.owned) {
      obj.parent?.remove(obj);
    }

    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();

    if (window.__cubix) delete window.__cubix;
  }

  solveAsPlayer() {
    if (this.boxRoot.visible || this.anim || this.mode === "slice") return;

    const hist = this.history.splice(0);

    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i]!;
      applyQuarters(this.pieces, h.axis, h.layer, -h.quarters);
    }

    applyQuarters(this.pieces, 1, 1, 1);

    this.history = [{ axis: 1, layer: 1, quarters: 1 }];

    this.syncAll();

    this.queue = [];
    this.phase = "playing";
    this.hooks.onPhase(this.phase);

    this.enqueueQuarters(1, 1, -1, true, true);
  }

  private handleCubeTap() {
    this.sfx.unlock();
    if (this.cubeTapTimer !== null) {
      window.clearTimeout(this.cubeTapTimer);
      this.cubeTapTimer = null;
      this.toggleBoxVisibility();
      return;
    }
    this.cubeTapTimer = window.setTimeout(() => {
      this.cubeTapTimer = null;
      if (this.boxMotion !== "idle" || this.boxRemoved) return;
      this.lidTargetAngle = Math.abs(this.lidAngle) < 0.1 ? -Math.PI / 2 : 0;
      this.boxMotion = this.lidTargetAngle < 0 ? "opening" : "closing";
      this.onCaseStateChange?.({ removed: false, lidOpen: this.lidTargetAngle < 0 });
    }, 420);
  }

  private toggleBoxVisibility() {
    if (this.boxMotion !== "idle" || this.anim || this.slice || this.queue.length > 0) return;
    if (this.boxRemoved) {
      this.boxRoot.visible = true;
      this.onCaseVisibilityChange?.(false);
      this.boxY = CASE_HIDDEN_Y;
      this.boxTargetY = 0;
      this.lidAngle = -Math.PI / 2;
      this.lidTargetAngle = -Math.PI / 2;
      this.boxLid.rotation.x = this.lidAngle;
      this.boxMotion = "raising";
      this.onCaseStateChange?.({ removed: false, lidOpen: false });
    } else {
      this.lidTargetAngle = -Math.PI / 2;
      this.boxMotion = "openingToHide";
      this.onCaseStateChange?.({ removed: true, lidOpen: true });
    }
  }

  public setCaseState(state?: { removed: boolean; lidOpen: boolean } | null) {
    const removed = Boolean(state?.removed);
    const lidOpen = removed || Boolean(state?.lidOpen);
    this.boxRemoved = removed;
    this.boxMotion = "idle";
    this.boxY = removed ? CASE_HIDDEN_Y : 0;
    this.boxTargetY = this.boxY;
    this.lidAngle = lidOpen ? -Math.PI / 2 : 0;
    this.lidTargetAngle = this.lidAngle;
    this.boxLid.rotation.x = this.lidAngle;
    this.boxRoot.position.set(0, this.cubeRoot.position.y + this.boxY, 0);
    this.boxRoot.visible = !removed;
    this.onCaseVisibilityChange?.(removed);
  }

  public getCaseState() {
    return { removed: this.boxRemoved, lidOpen: this.boxRemoved || this.lidAngle < -0.1 };
  }

  private finishCaseTransition() {
    this.boxMotion = "idle";
    this.onCaseStateChange?.(this.getCaseState());
  }

  private updateCase(dt: number) {
    const smooth = 1 - Math.exp(-10 * dt);
    const angleWasMoving = Math.abs(this.lidTargetAngle - this.lidAngle) > 0.002;
    const boxWasMoving = Math.abs(this.boxTargetY - this.boxY) > 0.002;
    this.boxY += (this.boxTargetY - this.boxY) * smooth;
    this.lidAngle += (this.lidTargetAngle - this.lidAngle) * smooth;
    if (Math.abs(this.boxTargetY - this.boxY) < 0.002) this.boxY = this.boxTargetY;
    if (Math.abs(this.lidTargetAngle - this.lidAngle) < 0.002) this.lidAngle = this.lidTargetAngle;
    this.boxRoot.position.set(0, this.cubeRoot.position.y + this.boxY, 0);
    this.boxLid.rotation.x = this.lidAngle;

    if (this.boxMotion === "openingToHide" && !angleWasMoving) {
      this.boxTargetY = CASE_HIDDEN_Y;
      this.boxMotion = "lowering";
    } else if (this.boxMotion === "lowering" && !boxWasMoving) {
      this.boxRemoved = true;
      this.boxRoot.visible = false;
      this.onCaseVisibilityChange?.(true);
      this.finishCaseTransition();
    } else if (this.boxMotion === "raising" && !boxWasMoving) {
      this.lidTargetAngle = 0;
      this.boxMotion = "closingAfterRise";
    } else if (this.boxMotion === "closingAfterRise" && !angleWasMoving) {
      this.boxRemoved = false;
      this.sfx.caseClose();
      this.finishCaseTransition();
    } else if (this.boxMotion === "opening" && !angleWasMoving) {
      this.finishCaseTransition();
    } else if (this.boxMotion === "closing" && !angleWasMoving) {
      this.sfx.caseClose();
      this.finishCaseTransition();
    }
  }

  private buildCase(scene: Scene) {
    const size = 3.34;
    const half = size / 2;
    const thickness = 0.075;
    const wallHeight = size / 2;
    const wallCenter = -size / 4;

    const baseMaterial = new MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.28,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
    });
    const lidMaterial = new MeshPhysicalMaterial({
      color: "#eaf4ff",
      roughness: 0.16,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: DoubleSide,
    });
    const hingeMaterial = new MeshPhysicalMaterial({
      color: "#aeb8c2",
      roughness: 0.3,
      metalness: 0.72,
      clearcoat: 0.65,
    });
    this.mats.push(baseMaterial, lidMaterial, hingeMaterial);

    const slabGeometry = new BoxGeometry(size, thickness, size);
    const xWallGeometry = new BoxGeometry(thickness, wallHeight, size);
    const zWallGeometry = new BoxGeometry(size, wallHeight, thickness);
    const hingeGeometry = new CylinderGeometry(0.065, 0.065, 0.26, 8);
    this.geos.push(slabGeometry, xWallGeometry, zWallGeometry, hingeGeometry);

    const addPanel = (
      parent: Group,
      geometry: BoxGeometry,
      material: MeshPhysicalMaterial,
      x: number,
      y: number,
      z: number,
    ) => {
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      parent.add(mesh);
    };

    // Mitad inferior: plástico blanco sólido y opaco.
    addPanel(this.boxRoot, slabGeometry, baseMaterial, 0, -half, 0);
    addPanel(this.boxRoot, xWallGeometry, baseMaterial, -half + thickness / 2, wallCenter, 0);
    addPanel(this.boxRoot, xWallGeometry, baseMaterial, half - thickness / 2, wallCenter, 0);
    addPanel(this.boxRoot, zWallGeometry, baseMaterial, 0, wallCenter, -half + thickness / 2);
    addPanel(this.boxRoot, zWallGeometry, baseMaterial, 0, wallCenter, half - thickness / 2);

    // Mitad superior: tapa semitransparente con pivote en las bisagras traseras.
    this.boxLid.position.set(0, 0, -half + thickness / 2);
    addPanel(this.boxLid, slabGeometry, lidMaterial, 0, half, half);
    addPanel(this.boxLid, xWallGeometry, lidMaterial, -half + thickness / 2, half / 2, half);
    addPanel(this.boxLid, xWallGeometry, lidMaterial, half - thickness / 2, half / 2, half);
    addPanel(this.boxLid, zWallGeometry, lidMaterial, 0, half / 2, size - thickness / 2);
    // Cierra el lateral posterior para completar la tapa junto a las bisagras.
    addPanel(this.boxLid, zWallGeometry, lidMaterial, 0, half / 2, thickness / 2);
    this.boxRoot.add(this.boxLid);

    // Bisagras visibles en la unión posterior entre la base y la tapa.
    for (const x of [-1.05, 1.05]) {
      const hinge = new Mesh(hingeGeometry, hingeMaterial);
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(x, 0, -half);
      hinge.castShadow = false;
      hinge.receiveShadow = false;
      this.boxRoot.add(hinge);
    }

    this.boxRoot.position.y = this.cubeRoot.position.y;
    scene.add(this.boxRoot);
    this.owned.push(this.boxRoot);
  }

  private beginScramble() {
    this.cancelSlice(true);

    this.queue = [];
    this.anim = null;
    this.history = [];

    this.phase = "scrambling";
    this.hooks.onPhase(this.phase);
    this.onStateChange?.();

    this.queue.push(...makeScramble(this.reduced ? 16 : 24));
    this.pump();
  }

  private declareWin() {
    this.phase = "won";
    this.sfx.win();
    this.triggerHaptic([45, 35, 90]);

    this.hooks.onPhase(this.phase);
    if (this.onStateChange) this.onStateChange();
  }

  private enqueueQuarters(
    axis: Axis,
    layer: Layer,
    quarters: number,
    user: boolean,
    sound: boolean,
  ) {
    const q = ((quarters % 4) + 4) % 4;
    if (q === 0) return;

    const dir: Dir = q === 3 ? -1 : 1;
    const steps = q === 3 ? 1 : q;

    for (let i = 0; i < steps; i++) {
      this.queue.push({ axis, layer, dir });
    }

    if (!this.anim) this.pumpUser = user;

    this.pumpSound = sound;
    this.pump();

    this.pumpUser = false;
    this.pumpSound = true;
  }

  private pumpUser = false;
  private pumpSound = true;

  private pump(): boolean {
    if (this.anim || this.queue.length === 0) return false;

    const move = this.queue.shift()!;
    const user = this.pumpUser && this.phase === "playing";
    const dur = this.phase === "scrambling" ? SCRAMBLE_MS : TURN_MS;

    this.anim = {
      axis: move.axis,
      layer: move.layer,
      from: 0,
      to: (move.dir * Math.PI) / 2,
      elapsed: 0,
      dur: this.reduced ? Math.min(0.04, dur) : dur,
      quarters: move.dir,
      bases: this.capture(move.axis, move.layer),
      user,
      sound: this.pumpSound,
    };

    return true;
  }

  private updateMotion(dt: number) {
    if (this.slice) {
      this.pose(this.slice.bases, this.slice.axis, this.slice.angle);
      return;
    }

    if (!this.anim) return;

    const anim = this.anim;

    anim.elapsed += dt;

    const t = Math.min(1, anim.elapsed / anim.dur);
    const e = easeOutCubic(t);
    const angle = anim.from + (anim.to - anim.from) * e;

    this.pose(anim.bases, anim.axis, angle);

    if (t < 1) return;

    this.commitAnim(anim);
  }

  private commitAnim(anim: Anim) {
    if (anim.quarters !== 0) {
      applyQuarters(this.pieces, anim.axis, anim.layer, anim.quarters);

      this.history.push({
        axis: anim.axis,
        layer: anim.layer,
        quarters: anim.quarters,
      });

      if (anim.sound) this.sfx.turn(this.phase === "scrambling");
      if (anim.user) this.triggerHaptic(12);

      if (anim.user && !this.announcedMove) {
        this.announcedMove = true;
        this.hooks.onFirstMove();
      }
    }

    this.syncAll();
    this.anim = null;

    const more = this.pump();
    if (more) return;

    if (this.phase === "scrambling") {
      if (isSolved(this.pieces) && this.retries < 1) {
        this.retries += 1;
        this.queue.push(...makeScramble(16));
        this.pump();
        return;
      }

      this.retries = 0;
      this.phase = "playing";
      this.hooks.onPhase(this.phase);
      this.onStateChange?.();

      return;
    }

    if (this.phase === "playing" && anim.user && anim.quarters !== 0 && isSolved(this.pieces)) {
      this.declareWin();
    }

    if (this.onStateChange) this.onStateChange();
  }

  private beginSlice(axis: Axis, layer: Layer) {
    this.slice = {
      axis,
      layer,
      bases: this.capture(axis, layer),
      angle: 0,
      vel: 0,
      lastAngle: 0,
      lastT: performance.now(),
    };

    this.mode = "slice";
    this.orbiting = false;
  }

  private accumulate(dx: number, dy: number) {
    const slice = this.slice;
    if (!slice) return;

    const point = this.rotatedGrab(slice.axis, slice.angle);
    const axis = AXIS_VEC[slice.axis];

    this.tmpC.crossVectors(axis, point);

    const radius = this.tmpC.length();
    if (radius < 0.08) return;

    this.tmpC.multiplyScalar(1 / radius);

    this.worldDirToScreen(point, this.tmpC);

    const pxPerWorld = this.screen.length() / 0.25;
    if (pxPerWorld < 0.4) return;

    const pixels = (dx * this.screen.x + dy * this.screen.y) / this.screen.length();

    const dAngle = (pixels / pxPerWorld / radius) * this.moveSens;

    slice.angle = clamp(slice.angle + dAngle, -Math.PI * 1.2, Math.PI * 1.2);

    const now = performance.now();
    const dt = (now - slice.lastT) / 1000;

    if (dt > 0.001 && dt < 0.08) {
      const inst = (slice.angle - slice.lastAngle) / dt;
      slice.vel = slice.vel * 0.55 + inst * 0.45;
    }

    slice.lastAngle = slice.angle;
    slice.lastT = now;
  }

  private releaseSlice() {
    const slice = this.slice;
    if (!slice) return;

    const quarters = snapQuarters(slice.angle, slice.vel);
    const target = (quarters * Math.PI) / 2;

    this.slice = null;

    if (Math.abs(target - slice.angle) < 0.001 && quarters === 0) {
      this.syncAll();
      return;
    }

    this.anim = {
      axis: slice.axis,
      layer: slice.layer,
      from: slice.angle,
      to: target,
      elapsed: 0,
      dur: this.reduced ? 0.04 : 0.13 + Math.min(0.08, Math.abs(target - slice.angle) * 0.05),
      quarters,
      bases: slice.bases,
      user: true,
      sound: quarters !== 0,
    };
  }

  private cancelSlice(instant: boolean) {
    if (!this.slice) return;

    const slice = this.slice;
    this.slice = null;

    if (instant || Math.abs(slice.angle) < 0.02) {
      this.syncAll();
      return;
    }

    this.anim = {
      axis: slice.axis,
      layer: slice.layer,
      from: slice.angle,
      to: 0,
      elapsed: 0,
      dur: 0.12,
      quarters: 0,
      bases: slice.bases,
      user: false,
      sound: false,
    };
  }

  private chooseAxis(
    tdx: number,
    tdy: number,
    dist: number,
  ): { axis: Axis; layer: Layer } | "wait" | null {
    const piece = this.pendingPiece;
    if (!piece) return null;

    const normal = this.hitNormalFromGrab(piece);
    const faceAxis = dominant(normal);

    let best: { axis: Axis; score: number } | null = null;
    let second = 0;

    for (const axis of [0, 1, 2] as const) {
      if (axis === faceAxis) continue;

      this.tmpC.crossVectors(AXIS_VEC[axis], this.grab);

      if (this.tmpC.lengthSq() < 1e-6) continue;

      this.tmpC.normalize();
      this.worldDirToScreen(this.grab, this.tmpC);

      const sl = this.screen.length();
      if (sl < 0.5) continue;

      const score = (tdx * this.screen.x + tdy * this.screen.y) / sl;

      const abs = Math.abs(score);

      if (!best || abs > Math.abs(best.score)) {
        if (best) second = Math.abs(best.score);
        best = { axis, score };
      } else if (abs > second) {
        second = abs;
      }
    }

    if (!best) return null;

    if (Math.abs(best.score) < dist * 0.28) {
      return dist < 30 ? "wait" : null;
    }

    if (dist < 26 && second > 0 && Math.abs(best.score) < second * 1.25) {
      return "wait";
    }

    return {
      axis: best.axis,
      layer: piece.pos[best.axis] as Layer,
    };
  }

  private hitNormalFromGrab(piece: Piece): Vector3 {
    piece.mesh.worldToLocal(this.tmpN.copy(this.grab));

    const ax = Math.abs(this.tmpN.x);
    const ay = Math.abs(this.tmpN.y);
    const az = Math.abs(this.tmpN.z);

    if (ax > ay && ax > az) {
      this.tmpA.set(Math.sign(this.tmpN.x) || 1, 0, 0);
    } else if (ay > az) {
      this.tmpA.set(0, Math.sign(this.tmpN.y) || 1, 0);
    } else {
      this.tmpA.set(0, 0, Math.sign(this.tmpN.z) || 1);
    }

    return this.tmpA.transformDirection(piece.mesh.matrixWorld);
  }

  private rotatedGrab(axis: Axis, angle: number): Vector3 {
    const r = rotateAround([this.grab.x, this.grab.y, this.grab.z], axis, angle);

    return this.tmpB.set(r[0], r[1], r[2]);
  }

  private worldDirToScreen(point: Vector3, dir: Vector3) {
    this.tmpA.copy(point).project(this.camera);

    this.tmpN.copy(point).addScaledVector(dir, 0.25).project(this.camera);

    const w = this.dom.clientWidth || 1;
    const h = this.dom.clientHeight || 1;

    this.screen.set((this.tmpN.x - this.tmpA.x) * 0.5 * w, -(this.tmpN.y - this.tmpA.y) * 0.5 * h);
  }

  private orbitBy(dx: number, dy: number) {
    const now = performance.now();
    const dt = Math.max(0.008, (now - this.downAt) / 1000);

    this.downAt = now;

    const sens = this.sens;

    this.theta -= dx * sens;
    this.phi -= dy * sens;

    this.vTheta = clamp((-dx * sens) / dt, -2.2, 2.2);
    this.vPhi = clamp((-dy * sens) / dt, -2.2, 2.2);

    this.orbiting = true;
  }

  private capturePinch() {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return;

    const a = pts[0]!;
    const b = pts[1]!;

    this.pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
      zoom: this.userZoom,
      theta: this.theta,
      phi: this.phi,
    };
  }

  private updatePinch() {
    if (!this.pinch) this.capturePinch();

    const pinch = this.pinch;
    if (!pinch) return;

    const pts = [...this.pointers.values()];
    if (pts.length < 2) return;

    const a = pts[0]!;
    const b = pts[1]!;

    const dist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    this.userZoom = pinch.zoom * (pinch.dist / dist);
    this.targetRadius = this.fitDist * this.userZoom;

    this.theta = pinch.theta - (midX - pinch.midX) * this.sens;

    this.phi = pinch.phi - (midY - pinch.midY) * this.sens;

    this.orbiting = true;
  }

  private updateCamera(dt: number) {
    const now = performance.now();

    if (this.phase === "ready" && !this.orbiting && !this.reduced && now > this.autoResumeAt) {
      this.theta += dt * 0.22;
    }

    if (!this.orbiting) {
      this.theta += this.vTheta * dt;

      this.phi += this.vPhi * dt;

      const damp = Math.exp(-3.4 * dt);

      this.vTheta *= damp;
      this.vPhi *= damp;
    }

    const desiredLook = this.phase === "won" ? -1.15 : 0;

    this.lookY += (desiredLook - this.lookY) * (1 - Math.exp(-4 * dt));

    this.radius += (this.targetRadius - this.radius) * (1 - Math.exp(-7 * dt));

    const sinPhi = Math.sin(this.phi);

    this.camera.position.set(
      this.radius * sinPhi * Math.sin(this.theta),
      this.radius * Math.cos(this.phi),
      this.radius * sinPhi * Math.cos(this.theta),
    );

    this.camera.up.set(
      -Math.cos(this.phi) * Math.sin(this.theta),
      Math.sin(this.phi),
      -Math.cos(this.phi) * Math.cos(this.theta),
    );
    this.camera.lookAt(0, this.lookY, 0);
  }

  private capture(axis: Axis, layer: Layer): Basis[] {
    const list: Basis[] = [];

    for (const piece of this.pieces) {
      if (piece.pos[axis] !== layer) continue;

      list.push({
        piece,
        pos: [piece.pos[0], piece.pos[1], piece.pos[2]],
        quat: piece.mesh.quaternion.clone(),
      });
    }

    return list;
  }

  private pose(bases: Basis[], axis: Axis, angle: number) {
    this.tmpQ.setFromAxisAngle(AXIS_VEC[axis], angle);

    for (const b of bases) {
      const p = rotateAround(b.pos, axis, angle);

      b.piece.mesh.position.set(p[0] * SPACING, p[1] * SPACING, p[2] * SPACING);

      b.piece.mesh.quaternion.copy(this.tmpQ).multiply(b.quat);
    }
  }

  private syncAll() {
    for (const piece of this.pieces) {
      piece.mesh.position.set(
        piece.pos[0] * SPACING,
        piece.pos[1] * SPACING,
        piece.pos[2] * SPACING,
      );
      quatFromOri(piece.ori, piece.mesh.quaternion, this.tmpA, this.tmpB, this.tmpC);
    }

    // Aplicar el tema guardado en memoria
    if (this.currentCustomColors) {
      this.applyCustomColors(this.currentCustomColors);
    } else {
      this.applyTheme(this.currentTheme as any);
    }
  }

  private pick(clientX: number, clientY: number): { piece: Piece; point: Vector3 } | null {
    const rect = this.dom.getBoundingClientRect();

    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(this.ndc, this.camera);

    this.cubeRoot.updateMatrixWorld(true);

    const hits = this.raycaster.intersectObjects(this.cubeRoot.children, true);

    for (const hit of hits) {
      const piece = pieceFromHit(hit, this.pieces);

      if (piece) {
        return {
          piece,
          point: hit.point.clone(),
        };
      }
    }

    return null;
  }

  private buildPieces(): Piece[] {
    const gan = createGanGeometries();
    this.geos.push(...gan.all);

    const nucleo = createNucleoCore();
    this.geos.push(...nucleo.geometries);
    this.mats.push(...nucleo.materials);
    this.cubeRoot.add(nucleo.group);

    const plastic = new MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0.0,
      roughness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    this.mats.push(plastic);

    const stickerMats = new Map<string, MeshPhysicalMaterial>();
    for (const [id, hex] of Object.entries(FACE_HEX)) {
      const mat = new MeshPhysicalMaterial({
        color: hex,
        roughness: 0.35,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      stickerMats.set(id, mat);
      this.mats.push(mat);
    }

    return createSolved().map((data, id) => {
      const mesh = new Group();
      mesh.userData.isCubie = true;
      mesh.userData.cubieId = id;

      const activeFaces = data.home.filter((v) => v !== 0).length;
      let kind: "center" | "edge" | "corner" = "center";
      if (activeFaces === 2) kind = "edge";
      if (activeFaces === 3) kind = "corner";

      for (const axis of [0, 1, 2] as const) {
        const sign = data.home[axis];
        if (sign === 0) continue;

        const color = faceColor(axis, sign);
        let mat = stickerMats.get(color)!;

        if (color === "W" && kind === "center") {
          mat = new MeshPhysicalMaterial({
            color: "#ffffff",
            map: this.logoTexture,
            roughness: 0.35,
            metalness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
          });

          // Registrar el material para su gestión.
          this.mats.push(mat);
        }

        const face = new Group();

        // NUEVO: Añadir el cuerpo negro idéntico al sticker
        const body = new Mesh(gan.body[kind], plastic);
        body.position.z = 0;
        face.add(body);

        const sticker = new Mesh(gan.sticker[kind], mat);
        sticker.userData.stickerColor = color;
        sticker.position.z = 0;

        const offset = 0.94 / 2;
        if (axis === 0) {
          face.position.x = sign * offset;
          face.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (axis === 1) {
          face.position.y = sign * offset;
          face.rotation.x = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else {
          face.position.z = sign * offset;
          if (sign < 0) face.rotation.y = Math.PI;
        }

        const roll = ganRoll(data.home, axis, kind);
        if (roll) face.rotateZ(roll);

        face.add(sticker);
        mesh.add(face);
      }

      this.cubeRoot.add(mesh);
      return { ...data, mesh };
    });
  }

  public setHaptics(enabled: boolean) {
    this.hapticsEnabled = enabled;
    if (!enabled && typeof navigator !== "undefined" && typeof navigator.vibrate === "function")
      navigator.vibrate(0);
  }

  private triggerHaptic(pattern: number | number[]) {
    if (
      !this.hapticsEnabled ||
      typeof navigator === "undefined" ||
      typeof navigator.vibrate !== "function"
    )
      return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* Unsupported vibration API. */
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfx.setEnabled(enabled);
  }

  public setReducedMotion(enabled: boolean) {
    this.reduced = this.systemReducedMotion || enabled;
  }

  private buildLights(scene: Scene) {
    // Luz ambiental suave para que las sombras no sean negras puras
    const amb = new AmbientLight("#ffffff", 0.8);
    const hemi = new HemisphereLight("#ffffff", "#222222", 0.8);

    // Luz principal que viaja CON la cámara
    const cameraLight = new DirectionalLight("#ffffff", 1.5);
    cameraLight.position.set(0, 0, 1); // Un poco adelante de la cámara
    this.camera.add(cameraLight); // ¡La luz es hija de la cámara!
    scene.add(this.camera); // La cámara debe estar en la escena

    // Luces de relleno fijas para dar volumen (opcional)
    const fill = new DirectionalLight("#9fdfff", 0.3);
    fill.position.set(-7, 3.2, -4);

    const rim = new DirectionalLight("#ffb25a", 0.2);
    rim.position.set(-2, 4, -8);

    // IMPORTANTE: La sombra ya no la proyecta la luz de la cámara
    // (porque se mueve y la sombra "bailaría"). La proyecta una luz fija.
    const shadowLight = new DirectionalLight("#ffffff", 0.5);
    shadowLight.position.set(5, 10, 7);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = 1024;
    shadowLight.shadow.mapSize.height = 1024;
    shadowLight.shadow.bias = -0.001;

    for (const obj of [hemi, amb, fill, rim, shadowLight]) {
      scene.add(obj);
      this.owned.push(obj);
    }

    // La cameraLight ya es hija de la cámara, no la añadimos al owned
    // porque se limpiará cuando se limpie la cámara.
  }

  private publishDebug() {
    window.__cubix = {
      phase: () => this.phase,
      solved: () => isSolved(this.pieces),
      turns: () => this.history.length,
      solveAsPlayer: () => this.solveAsPlayer(),
    };
  }

  public setSensitivity(val: number) {
    this.sens = clamp(val, 0.001, 0.01);
  }

  public setMoveSensitivity(val: number) {
    this.moveSens = clamp(val, 0.5, 2);
  }

  // Función interna para pintar los colores personalizados
  private applyCustomColors(colors: Record<string, string>) {
    for (const piece of this.pieces) {
      piece.mesh.children.forEach((child) => {
        if (child instanceof Group) {
          child.children.forEach((meshPart) => {
            if (meshPart instanceof Mesh && meshPart.userData.stickerColor) {
              const colorId = meshPart.userData.stickerColor;
              const newHex = colors[colorId];
              if (newHex && meshPart.material instanceof MeshPhysicalMaterial) {
                if (meshPart.material.map) return; // Proteger logo
                meshPart.material.color.set(newHex);
                meshPart.material.emissive.set(newHex);
                meshPart.material.emissiveIntensity = 0.05;
              }
            }
          });
        }
      });
    }
  }

  // Función interna para pintar los temas predefinidos
  private applyTheme(theme: "classic" | "neon" | "halloween" | "pastel") {
    const palettes = {
      classic: {
        R: "#cd0009",
        O: "#bc4e00",
        W: "#ffffff",
        Y: "#e2b800",
        G: "#009b48",
        B: "#0057d9",
      },
      neon: { R: "#ff003c", O: "#ff7b00", W: "#f0f0f0", Y: "#ffee00", G: "#00ff41", B: "#00b3ff" },
      pastel: {
        R: "#ff5353",
        O: "#ffa502",
        W: "#f1f2f6",
        Y: "#ffe05e",
        G: "#33ff87",
        B: "#74d1ff",
      },
      halloween: {
        R: "#ff3300",
        O: "#ff8c00",
        W: "#e0e0e0",
        Y: "#ffcc00",
        G: "#00cc44",
        B: "#0053cc",
      },
    };
    const colors = palettes[theme];

    for (const piece of this.pieces) {
      piece.mesh.children.forEach((child) => {
        if (child instanceof Group) {
          child.children.forEach((meshPart) => {
            if (meshPart instanceof Mesh && meshPart.userData.stickerColor) {
              const colorId = meshPart.userData.stickerColor;
              if (colorId && colors[colorId as keyof typeof colors]) {
                const newHex = colors[colorId as keyof typeof colors];
                if (meshPart.material.map) return; // Proteger logo

                if (meshPart.material instanceof MeshPhysicalMaterial) {
                  meshPart.material.color.set(newHex);
                  if (theme !== "classic") {
                    meshPart.material.emissive.set(newHex);
                    meshPart.material.emissiveIntensity = 0.15;
                  } else {
                    meshPart.material.emissive.set(0x000000);
                  }
                }
              }
            }
          });
        }
      });
    }
  }

  public setCustomColors(colors: Record<string, string>) {
    this.currentTheme = "custom";
    this.currentCustomColors = colors;
    this.applyCustomColors(colors);
  }

  public setTheme(theme: "classic" | "neon" | "halloween" | "pastel") {
    this.currentTheme = theme;
    this.currentCustomColors = null;
    this.applyTheme(theme);
  }

  public getSaveState() {
    if (this.phase !== "playing" && this.phase !== "won") return null;
    return {
      history: this.history,
      phase: this.phase,
    };
  }

  public loadSaveState(state: { history: any[]; phase: "playing" | "won" }) {
    if (!state || !state.history) return;

    for (const move of state.history) {
      applyQuarters(this.pieces, move.axis, move.layer, move.quarters);
    }

    this.history = state.history;
    this.phase = state.phase;

    this.syncAll();
    this.hooks.onPhase(this.phase);

    if (this.phase === "won") {
      this.lookY = -1.15;
    }
  }

  // NUEVO: Método para inicializar todos los ajustes de golpe
  public initSettings(settings: {
    cameraSensitivity: number;
    moveSensitivity: number;
    sfxEnabled: boolean;
    reducedMotion: boolean;
    hapticsEnabled: boolean;
    theme: string;
    customColors?: Record<string, string>;
  }) {
    this.setSensitivity(settings.cameraSensitivity);
    this.setMoveSensitivity(settings.moveSensitivity);
    this.setSfxEnabled(settings.sfxEnabled);
    this.setReducedMotion(settings.reducedMotion);
    this.setHaptics(settings.hapticsEnabled);

    if (settings.theme === "custom" && settings.customColors) {
      this.setCustomColors(settings.customColors);
    } else {
      this.setTheme(settings.theme as any);
    }
  }
}

function pieceFromHit(hit: Intersection, pieces: Piece[]): Piece | null {
  let obj: Object3D | null = hit.object;

  while (obj) {
    if (obj.userData.isCubie === true && typeof obj.userData.cubieId === "number") {
      return pieces[obj.userData.cubieId as number] ?? null;
    }
    obj = obj.parent;
  }

  return null;
}

function dominant(n: Vector3): Axis {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);

  if (ax > ay && ax > az) return 0;
  if (ay > az) return 1;

  return 2;
}

function quatFromOri(ori: Cubie["ori"], q: Quaternion, x: Vector3, y: Vector3, z: Vector3) {
  x.set(ori[0][0], ori[0][1], ori[0][2]);
  y.set(ori[1][0], ori[1][1], ori[1][2]);
  z.set(ori[2][0], ori[2][1], ori[2][2]);

  basisM.makeBasis(x, y, z);
  q.setFromRotationMatrix(basisM);
}

const basisM = new Matrix4();

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function snapQuarters(angle: number, vel: number): number {
  const q = Math.PI / 2;
  let guess = angle;

  if (Math.abs(vel) > 2.4) {
    guess += Math.sign(vel) * q * 0.42;
  }

  let steps = Math.round(guess / q);
  steps = clamp(steps, -2, 2);

  if (Math.abs(angle) < 0.2 && Math.abs(vel) < 2.4) {
    steps = 0;
  }

  return steps;
}

declare global {
  interface Window {
    __cubix?: {
      phase: () => string;
      solved: () => boolean;
      turns: () => number;
      solveAsPlayer: () => void;
    };
  }
}
