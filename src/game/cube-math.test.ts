import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMove,
  applyQuarters,
  createSolved,
  isSolved,
  makeScramble,
  orientationDet,
  rotate90,
  rotateAround,
  type Axis,
  type Cubie,
  type Dir,
} from "./cube-math.ts";

function clone(cubies: Cubie[]): Cubie[] {
  return cubies.map((c) => ({
    home: [...c.home] as Cubie["home"],
    pos: [...c.pos] as Cubie["pos"],
    ori: c.ori.map((v) => [...v]) as Cubie["ori"],
  }));
}

test("solved cube is 26 cubies and reads solved", () => {
  const cube = createSolved();
  assert.equal(cube.length, 26);
  assert.equal(isSolved(cube), true);
  for (const c of cube) assert.equal(orientationDet(c.ori), 1);
});

test("quarter turns match the continuous rotation at ±90°", () => {
  const samples: [number, number, number][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, -1, 1],
    [-1, 1, 0],
  ];
  for (const axis of [0, 1, 2] as const) {
    for (const dir of [1, -1] as const) {
      for (const v of samples) {
        const discrete = rotate90(v, axis, dir);
        const cont = rotateAround(v, axis, (dir * Math.PI) / 2);
        for (let i = 0; i < 3; i++) assert.ok(Math.abs(discrete[i] - cont[i]) < 1e-9);
      }
    }
  }
});

test("a single turn unsolves, its inverse restores, four turns restore", () => {
  for (const axis of [0, 1, 2] as const) {
    for (const layer of [-1, 0, 1] as const) {
      for (const dir of [1, -1] as const) {
        const cube = createSolved();
        applyMove(cube, { axis, layer, dir });
        assert.equal(isSolved(cube), false);
        applyMove(cube, { axis, layer, dir: (dir * -1) as Dir });
        assert.equal(isSolved(cube), true);

        const spun = createSolved();
        for (let i = 0; i < 4; i++) applyMove(spun, { axis, layer, dir });
        assert.equal(isSolved(spun), true);
        for (const c of spun) {
          assert.deepEqual(c.pos, c.home);
          assert.equal(orientationDet(c.ori), 1);
        }
      }
    }
  }
});

test("applyQuarters agrees with repeated moves, including ±2 and -1", () => {
  const seq: { axis: Axis; layer: -1 | 0 | 1; q: number }[] = [
    { axis: 0, layer: 1, q: 2 },
    { axis: 1, layer: 0, q: -1 },
    { axis: 2, layer: -1, q: -2 },
    { axis: 1, layer: 1, q: 3 },
  ];
  for (const step of seq) {
    const a = createSolved();
    const b = createSolved();
    applyQuarters(a, step.axis, step.layer, step.q);
    const dir: Dir = step.q > 0 ? 1 : -1;
    const n = Math.abs(step.q);
    for (let i = 0; i < n; i++) applyMove(b, { axis: step.axis, layer: step.layer, dir });
    assert.deepEqual(
      a.map((c) => c.pos),
      b.map((c) => c.pos),
    );
  }
});

test("scramble then exact inverse is solved and orientations stay proper", () => {
  const moves = makeScramble(32, () => 0.37);
  assert.equal(moves.length, 32);
  for (let i = 1; i < moves.length; i++) assert.notEqual(moves[i]!.axis, moves[i - 1]!.axis);

  const cube = createSolved();
  for (const m of moves) applyMove(cube, m);
  assert.equal(isSolved(cube), false);
  for (const c of cube) assert.equal(orientationDet(c.ori), 1);

  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i]!;
    applyMove(cube, { axis: m.axis, layer: m.layer, dir: (m.dir * -1) as Dir });
  }
  assert.equal(isSolved(cube), true);
  for (const c of cube) assert.deepEqual(c.pos, c.home);
});

test("middle-slice turns still have a solvable color check", () => {
  const cube = createSolved();
  applyMove(cube, { axis: 0, layer: 0, dir: 1 });
  applyMove(cube, { axis: 1, layer: 0, dir: -1 });
  assert.equal(isSolved(cube), false);
  const fresh = clone(cube);
  applyMove(fresh, { axis: 1, layer: 0, dir: 1 });
  applyMove(fresh, { axis: 0, layer: 0, dir: -1 });
  assert.equal(isSolved(fresh), true);
});
