import {
  BufferGeometry,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import type { Axis, Vec3 } from "./cube-math";

export type TileKind = "center" | "edge" | "corner";

export type GanGeos = {
  body: Record<TileKind, ExtrudeGeometry>;
  sticker: Record<TileKind, ShapeGeometry>;
  all: BufferGeometry[];
};

const SIZE = 0.94; // Ancho total de la pieza (y del sticker)
const DEPTH = 0.94; // Profundidad total de la pieza negra
const R = 0.16; // Radio de las esquinas redondeadas
const SAG = 0.18; // Profundidad del "mordisco" cóncavo de las aristas

type Pt = [number, number];

export function createGanGeometries(): GanGeos {
  // 1. Generar las siluetas 2D
  const loopCenter = roundRect(SIZE, R, R, R, R);
  const loopEdge = edgeBulge(SIZE, SAG);
  const loopCorner = square(SIZE); // Las esquinas son cuadrados perfectos

  // 2. Crear las piezas negras (extruidas en 3D)
  const bodyCenter = extrudeBody(loopCenter, DEPTH);
  const bodyEdge = extrudeBody(loopEdge, DEPTH);
  const bodyCorner = extrudeBody(loopCorner, DEPTH);

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
function edgeBulge(a: number, sag: number): Pt[] {
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
  
  // Bordes rectos exteriores
  push(loop, half, half);
  push(loop, -half, half);
  
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
    depth: depth,
    bevelEnabled: false,
  });
  // CAMBIO CLAVE: Extruimos hacia adentro, no centramos.
  // Su cara exterior queda en Z=0 y el cuerpo va hacia Z=-0.94.
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function extrudeSticker(loop: Pt[]): ExtrudeGeometry {
  const shape = shapeFrom(loop);
  const geo = new ExtrudeGeometry(shape, {
    depth: 0.09,             // 1. Más grosor (relieve negativo profundo)
    bevelEnabled: true,      // 2. Biselado activado
    bevelThickness: 0.01,   // 3. Bisel sutil
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // 4. Empujamos el sticker hacia adentro (relieve negativo puro)
  // Su cara frontal queda en Z=0, al ras.
  geo.translate(0, 0, -0.08); 
  return geo;
}

function shapeGeo(loop: Pt[]): ShapeGeometry {
  return new ShapeGeometry(shapeFrom(loop));
}

// --- ORIENTACIÓN ---

const LX: Record<string, Vector3> = {
  "2+": new Vector3(1, 0, 0), "2-": new Vector3(-1, 0, 0),
  "1+": new Vector3(1, 0, 0), "1-": new Vector3(1, 0, 0),
  "0+": new Vector3(0, 0, -1), "0-": new Vector3(0, 0, 1),
};
const LY: Record<string, Vector3> = {
  "2+": new Vector3(0, 1, 0), "2-": new Vector3(0, 1, 0),
  "1+": new Vector3(0, 0, -1), "1-": new Vector3(0, 0, 1),
  "0+": new Vector3(0, 1, 0), "0-": new Vector3(0, 1, 0),
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
  
  // Para las esquinas, no necesitamos rotación (son cuadrados perfectos)
  return 0;
}