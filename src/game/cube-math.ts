export type Vec3 = [number, number, number];
export type Ori = [Vec3, Vec3, Vec3];
export type Axis = 0 | 1 | 2;
export type Layer = -1 | 0 | 1;
export type Dir = 1 | -1;
export type FaceColor = "R" | "O" | "W" | "Y" | "G" | "B";

export type Cubie = {
  home: Vec3;
  pos: Vec3;
  ori: Ori;
};

export type Move = {
  axis: Axis;
  layer: Layer;
  dir: Dir;
};

const ID: Ori = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export function createSolved(): Cubie[] {
  const out: Cubie[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        out.push({
          home: [x, y, z],
          pos: [x, y, z],
          ori: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
        });
      }
    }
  }
  return out;
}

/** Right-hand rotation. +π/2 matches `rotate90(..., +1)`. */
export function rotateAround(v: Vec3, axis: Axis, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = v[0];
  const y = v[1];
  const z = v[2];
  if (axis === 0) return [x, c * y - s * z, s * y + c * z];
  if (axis === 1) return [c * x + s * z, y, -s * x + c * z];
  return [c * x - s * y, s * x + c * y, z];
}

export function rotate90(v: Vec3, axis: Axis, dir: Dir): Vec3 {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  if (axis === 0) return dir === 1 ? [x, -z, y] : [x, z, -y];
  if (axis === 1) return dir === 1 ? [z, y, -x] : [-z, y, x];
  return dir === 1 ? [-y, x, z] : [y, -x, z];
}

export function applyMove(cubies: Cubie[], move: Move): void {
  for (const c of cubies) {
    if (c.pos[move.axis] !== move.layer) continue;
    c.pos = rotate90(c.pos, move.axis, move.dir);
    c.ori = [
      rotate90(c.ori[0], move.axis, move.dir),
      rotate90(c.ori[1], move.axis, move.dir),
      rotate90(c.ori[2], move.axis, move.dir),
    ];
  }
}

/** `quarters` is a signed multiple of 90° (right-hand). Equivalent mod 4. */
export function applyQuarters(cubies: Cubie[], axis: Axis, layer: Layer, quarters: number): void {
  let q = quarters % 4;
  if (q < 0) q += 4;
  if (q === 0) return;
  if (q === 3) {
    applyMove(cubies, { axis, layer, dir: -1 });
    return;
  }
  for (let i = 0; i < q; i++) applyMove(cubies, { axis, layer, dir: 1 });
}

export function faceColor(axis: Axis, sign: number): FaceColor {
  if (axis === 0) return sign > 0 ? "R" : "O";
  if (axis === 1) return sign > 0 ? "W" : "Y";
  return sign > 0 ? "G" : "B";
}

export function orientationDet(ori: Ori): number {
  const a = ori[0];
  const b = ori[1];
  const c = ori[2];
  const cx = b[1] * c[2] - b[2] * c[1];
  const cy = b[2] * c[0] - b[0] * c[2];
  const cz = b[0] * c[1] - b[1] * c[0];
  return a[0] * cx + a[1] * cy + a[2] * cz;
}

/**
 * A face is solved when every sticker pointing that way is the same color.
 * Centers may travel (middle-slice turns), so this is color uniformity — not
 * "pieces back in their start slots".
 */
export function isSolved(cubies: Cubie[]): boolean {
  const buckets = new Map<string, FaceColor[]>();
  for (const c of cubies) {
    for (const axis of [0, 1, 2] as const) {
      const sign = c.home[axis];
      if (sign === 0) continue;
      const color = faceColor(axis, sign);
      const pointed = c.ori[axis];
      const key = `${pointed[0] * sign},${pointed[1] * sign},${pointed[2] * sign}`;
      const list = buckets.get(key);
      if (list) list.push(color);
      else buckets.set(key, [color]);
    }
  }
  if (buckets.size !== 6) return false;
  for (const list of buckets.values()) {
    if (list.length !== 9) return false;
    const first = list[0];
    for (let i = 1; i < list.length; i++) if (list[i] !== first) return false;
  }
  return true;
}

export function makeScramble(length = 24, rng: () => number = Math.random): Move[] {
  const moves: Move[] = [];
  let prevAxis: Axis | -1 = -1;
  const axes: Axis[] = [0, 1, 2];
  const layers: Layer[] = [-1, 0, 1];
  let guard = 0;
  while (moves.length < length && guard < length * 8) {
    guard++;
    let axis = axes[Math.floor(rng() * 3)] ?? 0;
    if (axis === prevAxis) axis = (((axis + 1 + Math.floor(rng() * 2)) % 3) as Axis);
    const layer = layers[Math.floor(rng() * 3)] ?? 0;
    const dir: Dir = rng() < 0.5 ? 1 : -1;
    moves.push({ axis, layer, dir });
    prevAxis = axis;
  }
  return moves;
}

export function identityOri(): Ori {
  return [
    [...ID[0]],
    [...ID[1]],
    [...ID[2]],
  ];
}
