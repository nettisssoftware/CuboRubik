import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Axis, Vec3 } from "./cube-math";

export type TileKind = "center" | "edge" | "corner";

/** Face group origin sits this far outside the old body half-extent. */
export const GAN_LIFT = 0.014;
export const GAN_LOGO_Z = -0.078;

const PLATE = 0.478;
const TILE = 0.448;
const BULGE = 0.2;
const CENTER = 0.4;
const CENTER_R = 0.16;
const INSET = 0.058;
const PLATE_DEPTH = 0.02;
const BEVEL_Z0 = -0.01;
const FLOOR_Z = -0.086;

type Pt = [number, number];

export type GanGeos = {
  core: BufferGeometry;
  plate: Record<TileKind, BufferGeometry>;
  bevel: Record<TileKind, BufferGeometry>;
  floor: Record<TileKind, BufferGeometry>;
  all: BufferGeometry[];
};

export function createGanGeometries(): GanGeos {
  const corner = roundRect(TILE, 0.01, 0.028, 0.01, 0.01);
  const edge = edgeBulge(TILE, BULGE);
  const center = roundRect(CENTER, CENTER_R, CENTER_R, CENTER_R, CENTER_R);
  const plates = {
    corner: roundRect(PLATE, 0.02, 0.1, 0.02, 0.02),
    edge: roundRect(PLATE, 0.09, 0.09, 0.03, 0.03),
    center: roundRect(PLATE, 0.06, 0.06, 0.06, 0.06),
  };
  const holes = { corner, edge, center };
  const plate = {
    corner: plateGeometry(plates.corner, holes.corner),
    edge: plateGeometry(plates.edge, holes.edge),
    center: plateGeometry(plates.center, holes.center),
  };
  const bevel = {
    corner: bevelGeometry(holes.corner, insetLoop(holes.corner, INSET)),
    edge: bevelGeometry(holes.edge, insetLoop(holes.edge, INSET)),
    center: bevelGeometry(holes.center, insetLoop(holes.center, INSET)),
  };
  const floor = {
    corner: floorGeometry(insetLoop(holes.corner, INSET * 0.92)),
    edge: floorGeometry(insetLoop(holes.edge, INSET * 0.92)),
    center: floorGeometry(insetLoop(holes.center, INSET * 0.92)),
  };
  const core = new RoundedBoxGeometry(0.76, 0.76, 0.76, 4, 0.1);
  const all = [core, ...Object.values(plate), ...Object.values(bevel), ...Object.values(floor)];
  return { core, plate, bevel, floor, all };
}

const LX: Record<string, Vector3> = {
  "2+": new Vector3(1, 0, 0),
  "2-": new Vector3(-1, 0, 0),
  "1+": new Vector3(1, 0, 0),
  "1-": new Vector3(1, 0, 0),
  "0+": new Vector3(0, 0, -1),
  "0-": new Vector3(0, 0, 1),
};
const LY: Record<string, Vector3> = {
  "2+": new Vector3(0, 1, 0),
  "2-": new Vector3(0, 1, 0),
  "1+": new Vector3(0, 0, -1),
  "1-": new Vector3(0, 0, 1),
  "0+": new Vector3(0, 1, 0),
  "0-": new Vector3(0, 1, 0),
};

function faceAxes(axis: Axis, sign: number): [Vector3, Vector3] {
  const key = `${axis}${sign > 0 ? "+" : "-"}`;
  return [LX[key]!, LY[key]!];
}

/** Local +Y points away from the face center; the bulge sits on local -Y. */
export function ganRoll(home: Vec3, axis: Axis, kind: TileKind): number {
  if (kind === "center") return 0;
  const sign = home[axis];
  const [lx, ly] = faceAxes(axis, sign);
  if (kind === "edge") {
    let radial: Axis = 0;
    for (const a of [0, 1, 2] as Axis[]) {
      if (a !== axis && home[a] !== 0) radial = a;
    }
    const away = new Vector3();
    away.setComponent(radial, home[radial]);
    return Math.atan2(-away.dot(lx), away.dot(ly));
  }
  const others = ([0, 1, 2] as Axis[]).filter((a) => a !== axis);
  let b = others[0]!;
  let c = others[1]!;
  if (home[b] * home[c] * triple(b, c, axis) * sign < 0) [b, c] = [c, b];
  const want = new Vector3();
  want.setComponent(b, home[b]);
  return Math.atan2(want.dot(ly), want.dot(lx));
}

function triple(b: Axis, c: Axis, a: Axis): number {
  const s = `${b}${c}${a}`;
  return s === "012" || s === "120" || s === "201" ? 1 : -1;
}

function push(loop: Pt[], x: number, y: number) {
  const last = loop[loop.length - 1];
  if (last && Math.hypot(last[0] - x, last[1] - y) < 1e-4) return;
  loop.push([x, y]);
}

function arc(loop: Pt[], cx: number, cy: number, r: number, a0: number, a1: number, steps: number) {
  if (r < 1e-4) {
    push(loop, cx, cy);
    return;
  }
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    push(loop, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
}

/** CCW rounded square. Corner radii: TL, TR, BR, BL. TR (+x,+y) is the outer cube corner. */
function roundRect(a: number, rTL: number, rTR: number, rBR: number, rBL: number): Pt[] {
  const loop: Pt[] = [];
  const steps = 8;
  push(loop, -a + rBL, -a);
  push(loop, a - rBR, -a);
  arc(loop, a - rBR, -a + rBR, rBR, -Math.PI / 2, 0, steps);
  push(loop, a, a - rTR);
  arc(loop, a - rTR, a - rTR, rTR, 0, Math.PI / 2, steps);
  push(loop, -a + rTL, a);
  arc(loop, -a + rTL, a - rTL, rTL, Math.PI / 2, Math.PI, steps);
  push(loop, -a, -a + rBL);
  arc(loop, -a + rBL, -a + rBL, rBL, Math.PI, Math.PI * 1.5, steps);
  return loop;
}

/** Square whose side toward the center (local -Y) bulges outward on a convex arc. */
function edgeBulge(a: number, sag: number): Pt[] {
  const loop: Pt[] = [];
  const rOuter = 0.045;
  const R = (a * a + sag * sag) / (2 * sag);
  const cy = -a + R;
  const left = Math.atan2(sag - R, -a);
  const right = Math.atan2(sag - R, a);
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const ang = left + ((right - left) * i) / steps;
    push(loop, Math.cos(ang) * R, cy + Math.sin(ang) * R);
  }
  push(loop, a, a - rOuter);
  arc(loop, a - rOuter, a - rOuter, rOuter, 0, Math.PI / 2, 6);
  push(loop, -a + rOuter, a);
  arc(loop, -a + rOuter, a - rOuter, rOuter, Math.PI / 2, Math.PI, 6);
  push(loop, -a, -a + sag);
  return loop;
}

function insetLoop(loop: Pt[], dist: number): Pt[] {
  const n = loop.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i + n - 1) % n]!;
    const curr = loop[i]!;
    const next = loop[(i + 1) % n]!;
    let nx = 0;
    let ny = 0;
    for (const [p, q] of [
      [prev, curr],
      [curr, next],
    ] as const) {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      nx += -dy / len;
      ny += dx / len;
    }
    const nl = Math.hypot(nx, ny) || 1;
    out.push([curr[0] + (nx / nl) * dist, curr[1] + (ny / nl) * dist]);
  }
  return out;
}

function shapeFrom(loop: Pt[], reverse: boolean): Shape {
  const pts = reverse ? [...loop].reverse() : loop;
  const shape = new Shape();
  shape.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i]![0], pts[i]![1]);
  shape.closePath();
  return shape;
}

function plateGeometry(outer: Pt[], hole: Pt[]): ExtrudeGeometry {
  const shape = shapeFrom(outer, false);
  const path = new Path();
  const rev = [...hole].reverse();
  path.moveTo(rev[0]![0], rev[0]![1]);
  for (let i = 1; i < rev.length; i++) path.lineTo(rev[i]![0], rev[i]![1]);
  path.closePath();
  shape.holes.push(path);
  const geo = new ExtrudeGeometry(shape, { depth: PLATE_DEPTH, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -PLATE_DEPTH);
  return geo;
}

function bevelGeometry(outer: Pt[], inner: Pt[]): BufferGeometry {
  const steps = 3;
  const n = outer.length;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const e = t * t * (3 - 2 * t);
    const z = BEVEL_Z0 + (FLOOR_Z - BEVEL_Z0) * e;
    for (let i = 0; i < n; i++) {
      const p = outer[i]!;
      const q = inner[i]!;
      positions.push(p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e, z);
    }
  }
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const a = s * n + i;
      const b = s * n + i2;
      const c = (s + 1) * n + i2;
      const d = (s + 1) * n + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function floorGeometry(loop: Pt[]): ShapeGeometry {
  const geo = new ShapeGeometry(shapeFrom(loop, false));
  geo.translate(0, 0, FLOOR_Z + 0.004);
  return geo;
}
