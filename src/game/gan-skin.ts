import {
  BufferGeometry,
  Euler,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import type { Axis, Vec3 } from "./cube-math";
import { CUBE_SPACING, EXTERIOR_Z, FACE_OFFSET, MIN_INNER_Z, SHELL_RADIUS } from "./nucleo-cube";

export type TileKind = "center" | "edge" | "corner";

export type GanGeos = {
  body: Record<TileKind, ExtrudeGeometry>;
  sticker: Record<TileKind, ExtrudeGeometry>;
  all: BufferGeometry[];
};

const SIZE = 0.94; // Silueta compartida por el cuerpo y el sticker
const DEPTH = 0.65; // Profundidad del cuerpo negro
const STICKER_DEPTH = 0.05;
const BEVEL_THICKNESS = 0.015;
const BEVEL_SIZE = 0.012;
const BEVEL_SEGMENTS = 2;
const BODY_CLEARANCE = 0.005; // Holgura técnica entre el cuerpo y la cara posterior del sticker
const R = 0.23; // Radio de las esquinas redondeadas
const SAG = 0.18; // Profundidad del "mordisco" cóncavo de las aristas
const CORNER_RADIUS = 0.04; // Radio uniforme de las esquinas

type Pt = [number, number];

export function createGanGeometries(): GanGeos {
  // 1. Generar las siluetas 2D
  const loopCenter = roundRect(SIZE, R, R, R, R);
  const loopEdge = edgeBulge(SIZE, SAG);
  const loopCorner = roundRect(SIZE, CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS);

  // 2. Crear las piezas negras (extruidas en 3D)
  const bodyCenter = moldInnerShell(extrudeBody(loopCenter, DEPTH), "center");
  const bodyEdge = moldInnerShell(extrudeBody(loopEdge, DEPTH), "edge");
  const bodyCorner = moldInnerShell(extrudeBody(loopCorner, DEPTH), "corner");

  // 3. Crear los stickers (CON relieve/grosor para tapar la tapa cuadrada)
  const stickerCenter = extrudeSticker(loopCenter);
  const stickerEdge = extrudeSticker(loopEdge);
  const stickerCorner = extrudeSticker(loopCorner);

  const body = { center: bodyCenter, edge: bodyEdge, corner: bodyCorner };
  const sticker = { center: stickerCenter, edge: stickerEdge, corner: stickerCorner };

  return {
    body,
    sticker,
    all: [bodyCenter, bodyEdge, bodyCorner, stickerCenter, stickerEdge, stickerCorner],
  };
}

// --- MATEMÁTICA DE LAS SILUETAS ---

function push(loop: Pt[], x: number, y: number) {
  loop.push([x, y]);
}

function arc(loop: Pt[], cx: number, cy: number, r: number, a0: number, a1: number, steps: number) {
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    push(loop, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
}

// Cuadrado perfecto
function square(a: number): Pt[] {
  const half = a / 2;
  return [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
}

// Cuadrado con 4 esquinas redondeadas (para los centros)
function roundRect(a: number, rTL: number, rTR: number, rBR: number, rBL: number): Pt[] {
  const half = a / 2;
  const loop: Pt[] = [];
  const steps = 8;
  push(loop, -half + rBL, -half);
  push(loop, half - rBR, -half);
  arc(loop, half - rBR, -half + rBR, rBR, -Math.PI / 2, 0, steps);
  push(loop, half, half - rTR);
  arc(loop, half - rTR, half - rTR, rTR, 0, Math.PI / 2, steps);
  push(loop, -half + rTL, half);
  arc(loop, -half + rTL, half - rTL, rTL, Math.PI / 2, Math.PI, steps);
  push(loop, -half, -half + rBL);
  arc(loop, -half + rBL, -half + rBL, rBL, Math.PI, Math.PI * 1.5, steps);
  return loop;
}

// Cuadrado con un mordisco cóncavo en el lado que mira hacia el centro (-Y local)
/*function edgeBulge(a: number, sag: number): Pt[] {
  const half = a / 2;
  const loop: Pt[] = [];
  const Rarc = (half * half + sag * sag) / (2 * sag);
  const cy = -half + Rarc; // Centro del arco cóncavo
  
  // Arco cóncavo (desde la izquierda hasta la derecha)
  const left = Math.atan2(sag - Rarc, -half);
  const right = Math.atan2(sag - Rarc, half);
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const ang = left + ((right - left) * i) / steps;
    push(loop, Math.cos(ang) * Rarc, cy + Math.sin(ang) * Rarc);
  }
  
  // Bordes rectos exteriores (Esquinas perfectas de 90 grados)
  push(loop, half, half);
  push(loop, -half, half);
  
  return loop;
} */

// Cuadrado con un mordisco cóncavo en el lado que mira hacia el centro (-Y local)
function edgeBulge(a: number, sag: number): Pt[] {
  const half = a / 2;
  const loop: Pt[] = [];
  const Rarc = (half * half + sag * sag) / (2 * sag);
  const cy = -half + Rarc; // Centro del arco cóncavo

  // 1. Arco cóncavo (el mordisco) - SIN CAMBIOS
  const left = Math.atan2(sag - Rarc, -half);
  const right = Math.atan2(sag - Rarc, half);
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const ang = left + ((right - left) * i) / steps;
    push(loop, Math.cos(ang) * Rarc, cy + Math.sin(ang) * Rarc);
  }

  // 2. Redondeo de las esquinas exteriores con el mismo radio que los corners.
  const cornerRadius = CORNER_RADIUS;

  // Borde derecho: sube, pero se redondea en la esquina superior
  push(loop, half, half - cornerRadius);
  arc(loop, half - cornerRadius, half - cornerRadius, cornerRadius, 0, Math.PI / 2, 8);

  // Borde superior: se cruza y se redondea en la esquina superior izquierda
  push(loop, -half + cornerRadius, half);
  arc(loop, -half + cornerRadius, half - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, 8);

  // Borde izquierdo: baja hasta tocar el mordisco
  push(loop, -half, half - cornerRadius);

  return loop;
}

// --- CONVERSIÓN A GEOMETRÍA 3D ---

function shapeFrom(loop: Pt[]): Shape {
  const shape = new Shape();
  shape.moveTo(loop[0][0], loop[0][1]);
  for (let i = 1; i < loop.length; i++) shape.lineTo(loop[i][0], loop[i][1]);
  shape.closePath();
  return shape;
}

function extrudeBody(loop: Pt[], depth: number): ExtrudeGeometry {
  const shape = shapeFrom(loop);
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 4,
  });

  geo.translate(0, 0, -depth - 0.05);

  return geo;
}

const shellCenter = new Vector3();
const projected = new Vector3();

/**
 * Cáscara esférica interna. La tapa (z >= EXTERIOR_Z) no se mueve.
 * Si proyectar al cascarón ensancharía la pieza, solo se empuja en Z:
 * así el perfil exterior y el hueco con las vecinas se mantienen.
 * El roll de las esquinas deja el origen del cubo en el mismo cuadrante,
 * así las tres piezas comparten un solo molde.
 */
function moldInnerShell(geo: ExtrudeGeometry, kind: TileKind): ExtrudeGeometry {
  shellAnchor(kind, shellCenter);
  const pos = geo.attributes.position;
  const r2 = SHELL_RADIUS * SHELL_RADIUS;
  const vertex = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    if (vertex.z >= EXTERIOR_Z) continue;

    const dx = vertex.x - shellCenter.x;
    const dy = vertex.y - shellCenter.y;
    const dz = vertex.z - shellCenter.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist >= SHELL_RADIUS || dist < 1e-6) continue;

    const scale = SHELL_RADIUS / dist;
    projected.set(dx, dy, dz).multiplyScalar(scale).add(shellCenter);

    const oldRho = Math.hypot(vertex.x, vertex.y);
    const newRho = Math.hypot(projected.x, projected.y);
    let x = vertex.x;
    let y = vertex.y;
    let z = projected.z;

    if (newRho <= oldRho + 1e-4) {
      x = projected.x;
      y = projected.y;
    } else {
      const rho2 = dx * dx + dy * dy;
      if (rho2 < r2) z = shellCenter.z + Math.sqrt(r2 - rho2);
    }

    if (z > MIN_INNER_Z) z = MIN_INNER_Z;
    if (z < vertex.z) z = vertex.z;
    pos.setXYZ(i, x, y, z);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function shellAnchor(kind: TileKind, out: Vector3) {
  const z = -(CUBE_SPACING + FACE_OFFSET);
  if (kind === "center") out.set(0, 0, z);
  else if (kind === "edge") out.set(0, -CUBE_SPACING, z);
  else out.set(CUBE_SPACING, CUBE_SPACING, z);
}

function extrudeSticker(loop: Pt[]): ExtrudeGeometry {
  const shape = shapeFrom(loop);
  const geo = new ExtrudeGeometry(shape, {
    depth: 0.04, // 1. Más grosor (relieve negativo profundo)
    bevelEnabled: true, // 2. Biselado activado
    bevelThickness: 0.04, // 3. Bisel sutil
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // 4. Empujamos el sticker hacia adentro (relieve negativo puro)
  // Su cara frontal queda en Z=0, al ras.
  geo.translate(0, 0, -0.03);
  return geo;
}

function shapeGeo(loop: Pt[]): ShapeGeometry {
  return new ShapeGeometry(shapeFrom(loop));
}

// --- ORIENTACIÓN ---

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

// Calcula la rotación necesaria para que el mordisco mire hacia el centro
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

  // Cuadrado redondeado: simétrico cada 90°. Este giro (k·π/2) no cambia
  // la silueta exterior; solo alinea el interior con la cáscara compartida.
  const origin = cubeOriginInFaceLocal(home, axis, 0);
  return Math.atan2(origin.y, origin.x) - Math.PI / 4;
}

const faceEuler = new Euler();
const orientQ = new Quaternion();
const rollQ = new Quaternion();
const faceQ = new Quaternion();
const originV = new Vector3();
const localZ = new Vector3(0, 0, 1);

function cubeOriginInFaceLocal(home: Vec3, axis: Axis, roll: number): Vector3 {
  const sign = home[axis];
  faceEuler.set(0, 0, 0);
  if (axis === 0) faceEuler.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
  else if (axis === 1) faceEuler.x = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
  else if (sign < 0) faceEuler.y = Math.PI;

  orientQ.setFromEuler(faceEuler);
  rollQ.setFromAxisAngle(localZ, roll);
  faceQ.copy(orientQ).multiply(rollQ);

  originV.set(-home[0] * CUBE_SPACING, -home[1] * CUBE_SPACING, -home[2] * CUBE_SPACING);
  originV.setComponent(axis, originV.getComponent(axis) - sign * FACE_OFFSET);
  return originV.applyQuaternion(faceQ.invert());
}
