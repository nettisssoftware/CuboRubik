import type { FaceColor } from "./cube-math";

/** Official-style sticker colors. Rendering only — solved state uses face ids. */
export const FACE_HEX: Record<FaceColor, string> = {
  R: "#ff6b6b",
  O: "#ffa502",
  W: "#f1f2f6",
  Y: "#ffeda0",
  G: "#2ed573",
  B: "#70a1ff",
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
