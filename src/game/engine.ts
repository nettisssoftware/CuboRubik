import {
  AmbientLight,
  DirectionalLight,
  ShapeGeometry,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  TextureLoader,
  type Intersection,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
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
import { FACE_HEX } from "./palette";

export type Phase = "ready" | "scrambling" | "playing" | "won";

export type CubeApi = {
  start: () => void;
  replay: () => void;
  setSensitivity: (val: number) => void;
  setTheme: (theme: "classic" | "neon" | "halloween" | "pastel") => void;
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

const SPACING = 1.0;
const BODY = 0.98;
const AXIS_VEC = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

const TURN_MS = 0.16;
const SCRAMBLE_MS = 0.092;

class Sfx {
  private ctx: AudioContext | null = null;

  unlock() {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    this.unlock();
    this.tone(soft ? 160 : 196, 0.05, "triangle", soft ? 0.018 : 0.045);
    this.tone(soft ? 340 : 480, 0.03, "square", soft ? 0.006 : 0.012);
  }

  win() {
    this.unlock();
    [523, 659, 784, 1046].forEach((n, i) => this.tone(n, 0.2, "triangle", 0.045, i * 0.08));
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

  phase: Phase = "ready";
  private queue: Move[] = [];
  private anim: Anim | null = null;
  private history: { axis: Axis; layer: Layer; quarters: number }[] = [];
  private retries = 0;
  private announcedMove = false;

  private theta = 0.62;
  private sens = 0.0052; // Sensibilidad por defecto
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

  constructor(opts: { scene: Scene; camera: PerspectiveCamera; dom: HTMLElement; hooks: Hooks }) {
    this.camera = opts.camera;
    this.dom = opts.dom;
    this.hooks = opts.hooks;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.pieces = this.buildPieces();
    this.buildLights(opts.scene);
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

    // Zoom ilimitado: eliminamos el clamp superior e inferior
    this.targetRadius = this.fitDist * this.userZoom;
  }

  tick(dt: number) {
    const d = Math.min(dt, 0.05);
    this.time += d;
    this.updateCamera(d);
    this.updateMotion(d);
    const bob = this.phase === "ready" && !this.reduced ? Math.sin(this.time * 1.15) * 0.07 : 0;
    this.cubeRoot.position.y += (bob - this.cubeRoot.position.y) * (1 - Math.exp(-4 * d));
  }

  start() {
    if (this.phase !== "ready") return;
    this.sfx.unlock();
    this.beginScramble();
  }

  replay() {
    if (this.phase !== "won") return;
    this.sfx.unlock();
    this.beginScramble();
  }

  onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, travel: 0 });
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

    const orbitOnly =
      e.button === 2 ||
      e.button === 1 ||
      this.phase !== "playing" ||
      this.anim !== null ||
      this.queue.length > 0;

    if (orbitOnly) {
      this.mode = "orbit";
      this.orbiting = true;
      return;
    }

    const hit = this.pick(e.clientX, e.clientY);
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
      if (tap && this.mode !== "slice" && this.mode !== "pinch") this.hooks.onTap();
      if (this.mode === "slice") this.releaseSlice();
      this.mode = "none";
      this.orbiting = false;
      this.pinch = null;
      this.pendingPiece = null;
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
    this.userZoom = this.userZoom * factor; // Zoom ilimitado (quitamos el clamp)
    this.targetRadius = this.fitDist * this.userZoom;
  }

  dispose() {
    for (const obj of this.owned) obj.parent?.remove(obj);
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    if (window.__cubix) delete window.__cubix;
  }

  /** Puts the cube one turn from solved and plays that turn as the player. */
  solveAsPlayer() {
    if (this.anim || this.mode === "slice") return;
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

  private beginScramble() {
    this.cancelSlice(true);
    this.queue = [];
    this.anim = null;
    this.phase = "scrambling";
    this.hooks.onPhase(this.phase);
    this.queue.push(...makeScramble(this.reduced ? 16 : 24));
    this.pump();
  }

  private declareWin() {
    this.phase = "won";
    this.sfx.win();
    this.hooks.onPhase(this.phase);
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
    for (let i = 0; i < steps; i++) this.queue.push({ axis, layer, dir });
    // Mark the whole gesture as one user action by tagging via a side channel:
    // pump reads `user` from the anim we start immediately when idle.
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
      this.history.push({ axis: anim.axis, layer: anim.layer, quarters: anim.quarters });
      if (anim.sound) this.sfx.turn(this.phase === "scrambling");
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
      return;
    }
    if (this.phase === "playing" && anim.user && anim.quarters !== 0 && isSolved(this.pieces)) {
      this.declareWin();
    }
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
    const dAngle = pixels / pxPerWorld / radius;
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
      } else if (abs > second) second = abs;
    }
    if (!best) return null;
    if (Math.abs(best.score) < dist * 0.28) return dist < 30 ? "wait" : null;
    if (dist < 26 && second > 0 && Math.abs(best.score) < second * 1.25) return "wait";
    return { axis: best.axis, layer: piece.pos[best.axis] as Layer };
  }

  private hitNormalFromGrab(piece: Piece): Vector3 {
    piece.mesh.worldToLocal(this.tmpN.copy(this.grab));
    const ax = Math.abs(this.tmpN.x);
    const ay = Math.abs(this.tmpN.y);
    const az = Math.abs(this.tmpN.z);
    if (ax > ay && ax > az) this.tmpA.set(Math.sign(this.tmpN.x) || 1, 0, 0);
    else if (ay > az) this.tmpA.set(0, Math.sign(this.tmpN.y) || 1, 0);
    else this.tmpA.set(0, 0, Math.sign(this.tmpN.z) || 1);
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
    this.phi = clamp(this.phi - dy * sens, 0.18, Math.PI - 0.18);
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

    // Zoom ilimitado en pellizco (quitamos el clamp)
    this.userZoom = pinch.zoom * (pinch.dist / dist);
    this.targetRadius = this.fitDist * this.userZoom;

    this.theta = pinch.theta - (midX - pinch.midX) * this.sens;
    this.phi = clamp(pinch.phi - (midY - pinch.midY) * this.sens, 0.18, Math.PI - 0.18);
    this.orbiting = true;
  }

  private updateCamera(dt: number) {
    const now = performance.now();
    if (this.phase === "ready" && !this.orbiting && !this.reduced && now > this.autoResumeAt) {
      this.theta += dt * 0.22;
    }
    if (!this.orbiting) {
      this.theta += this.vTheta * dt;
      this.phi = clamp(this.phi + this.vPhi * dt, 0.18, Math.PI - 0.18);
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
      if (piece) return { piece, point: hit.point.clone() };
    }
    return null;
  }

  private buildPieces(): Piece[] {
    // 1. La geometría del bloque negro (se mantiene igual)
    const bodyGeo = new RoundedBoxGeometry(BODY, BODY, BODY, 3, 0.078);

    // --- NUEVA GEOMETRÍA PLANA Y ENRASADA ---
    // Ajustamos el tamaño para que el margen negro sea idéntico arriba, abajo y a los lados.
    // Si BODY es 0.98, un tamaño de 0.84 deja un margen de 0.07 en cada lado.
    const stickerSize = 0.84;
    const stickerRadius = 0.16; // Curva suave para que se vea como la imagen
    const shape = new Shape();
    const s = stickerSize / 2;
    const r = stickerRadius;

    // Dibujamos el cuadrado con esquinas redondeadas
    shape.moveTo(-s + r, -s);
    shape.lineTo(s - r, -s);
    shape.quadraticCurveTo(s, -s, s, -s + r);
    shape.lineTo(s, s - r);
    shape.quadraticCurveTo(s, s, s - r, s);
    shape.lineTo(-s + r, s);
    shape.quadraticCurveTo(-s, s, -s, s - r);
    shape.lineTo(-s, -s + r);
    shape.quadraticCurveTo(-s, -s, -s + r, -s);

    // ShapeGeometry crea una figura 2D plana (sin grosor)
    const stickerGeo = new ShapeGeometry(shape);

    this.geos.push(bodyGeo, stickerGeo);

    const plastic = new MeshPhysicalMaterial({
      color: "#14151c",
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    });
    this.mats.push(plastic);

    const stickerMat = new Map<string, MeshStandardMaterial>();
    for (const [id, hex] of Object.entries(FACE_HEX)) {
      const mat = new MeshStandardMaterial({
        color: hex,
        metalness: 0.15,
        roughness: 0.25,
        emissive: hex, // Devuelve el brillo a las pegatinas
        emissiveIntensity: 0.2, // Ajustado para que resalten pero no quemen el color
      });
      stickerMat.set(id, mat);
      this.mats.push(mat);
    }

    // --- CARGAR LOGO PERSONALIZADO ---
const textureLoader = new TextureLoader();
// Cargamos la imagen desde la carpeta public
const logoTexture = textureLoader.load("/enterprise-logo.png");

    // Ajustamos la textura para que el logo no toque los bordes (márgenes)
// 0.6 significa que el logo ocupará el 60% del centro de la pegatina
logoTexture.repeat.set(0.7, 0.7); 
// Lo centramos perfectamente
logoTexture.offset.set(0.2, 0.2); 

    
// Configuramos el material para que la imagen se adapte bien
const logoMat = new MeshStandardMaterial({
  map: logoTexture,
  transparent: true, // Permite que el fondo blanco se vea a través de los espacios del logo
  opacity: 1,        // Totalmente opaco donde hay color
  roughness: 0.3,
  metalness: 0.1,
  // Un pequeño brillo para que resalte sobre el blanco
  emissive: "#ffffff",
  emissiveIntensity: 0.05,
});
this.mats.push(logoMat);

    return createSolved().map((data, id) => {
      const mesh = new Group();
      mesh.userData.isCubie = true;
      mesh.userData.cubieId = id;
      const body = new Mesh(bodyGeo, plastic);
      body.castShadow = true;
      body.receiveShadow = true;
      mesh.add(body);
      for (const axis of [0, 1, 2] as const) {
  const sign = data.home[axis];
  if (sign === 0) continue;
  const color = faceColor(axis, sign);
  
  // 👇 DETECTAMOS SI ES EL CENTRO BLANCO 👇
  const isWhiteCenter = color === "W" && data.home[0] === 0 && data.home[1] === 0 && data.home[2] === 0;
  
  // 👇 USAMOS EL MATERIAL DEL LOGO SI ES EL CENTRO, SI NO EL COLOR NORMAL 👇
  const materialToUse = isWhiteCenter ? logoMat : stickerMat.get(color)!;
  
  const sticker = new Mesh(stickerGeo, materialToUse);
  
  // Etiquetas para el sistema de temas
  sticker.userData.stickerColor = color; 
  // Marcamos esto para que el cambio de tema no le borre la textura al logo
  sticker.userData.hasLogo = isWhiteCenter; 

  placeSticker(sticker, axis, sign);
  mesh.add(sticker);
}
      this.cubeRoot.add(mesh);
      return { ...data, mesh };
    });
  }

  private buildLights(scene: Scene) {
    // --- LUCES ---
    const hemi = new HemisphereLight("#d5e4f5", "#2a2118", 0.72);
    const amb = new AmbientLight("#ffffff", 0.38);

    const key = new PointLight("#fff4e4", 45, 50);
    key.position.set(0, 10, 0); // Luz exactamente arriba
    key.castShadow = false; // Sin sombra porque no hay suelo
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0015;

    const fill = new DirectionalLight("#9fdfff", 0.48);
    fill.position.set(-7, 3.2, -4);

    const rim = new DirectionalLight("#ffb25a", 0.32);
    rim.position.set(-2, 4, -8);

    // Añadimos SOLO las luces a la escena (nada de discos ni aros)
    for (const obj of [hemi, amb, key, key.target, fill, rim]) {
      scene.add(obj);
      this.owned.push(obj);
    }
  }

  private publishDebug() {
    window.__cubix = {
      phase: () => this.phase,
      solved: () => isSolved(this.pieces),
      turns: () => this.history.length,
      solveAsPlayer: () => this.solveAsPlayer(),
    };
  }

  // Método para cambiar la sensibilidad en vivo
  public setSensitivity(val: number) {
    this.sens = val;
  }

  public setTheme(theme: "classic" | "neon" | "halloween" | "pastel") {
    const palettes = {
      classic: {
        R: "#de1b24",
        O: "#ff6a00",
        W: "#f7f7f2",
        Y: "#ffd000",
        G: "#009b48",
        B: "#0057d9",
      },
      neon: { R: "#ff003c", O: "#ff7b00", W: "#f0f0f0", Y: "#ffee00", G: "#00ff41", B: "#00b3ff" },
      pastel: {
        R: "#ff6b6b",
        O: "#ffa502",
        W: "#f1f2f6",
        Y: "#ffeda0",
        G: "#2ed573",
        B: "#70a1ff",
      },
      halloween: {
        R: "#ff3300",
        O: "#ff8c00",
        W: "#e0e0e0",
        Y: "#ffcc00",
        G: "#00cc44",
        B: "#6600cc",
      },
    };
    const colors = palettes[theme];

    for (const piece of this.pieces) {
      piece.mesh.children.forEach((child) => {
        if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {

        if (child.userData.hasLoho) return;
          
          // 👇 LEEMOS LA ETIQUETA QUE CREAMOS 👇
          const colorId = child.userData.stickerColor;
          if (colorId && colors[colorId as keyof typeof colors]) {
            const newHex = colors[colorId as keyof typeof colors];
            child.material.color.set(newHex);
            child.material.emissive.set(newHex);
          }
        }
      });
    }
  }
}

function placeSticker(mesh: Mesh, axis: Axis, sign: number) {
  // Ajustado para el nuevo grosor de la pegatina (depth 0.04 + bevel 0.01)
  const o = BODY / 2 + 0.002;
  mesh.userData.localNormal = new Vector3(0, 0, 1);
  if (axis === 0) {
    mesh.position.x = sign * o;
    mesh.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else if (axis === 1) {
    mesh.position.y = sign * o;
    mesh.rotation.x = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    mesh.position.z = sign * o;
    if (sign < 0) mesh.rotation.y = Math.PI;
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
  if (Math.abs(vel) > 2.4) guess += Math.sign(vel) * q * 0.42;
  let steps = Math.round(guess / q);
  steps = clamp(steps, -2, 2);
  if (Math.abs(angle) < 0.2 && Math.abs(vel) < 2.4) steps = 0;
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
