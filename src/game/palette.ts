import type { FaceColor } from "./cube-math";

/** Official-style sticker colors. Rendering only — solved state uses face ids. */
export const FACE_HEX: Record<FaceColor, string> = {
  R: "#df5e64",
  O: "#f99045",
  W: "#f7f7f2",
  Y: "#f7e079",
  G: "#4ff69c",
  B: "#00d6d9",
};

export const CONFETTI_HEX = [
  FACE_HEX.R,
  FACE_HEX.O,
  FACE_HEX.W,
  FACE_HEX.Y,
  FACE_HEX.G,
  FACE_HEX.B,
  "#f0b429",
  "#3ecfc2",
];
