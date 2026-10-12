import type { FaceColor } from "./cube-math";

/** Official-style sticker colors. Rendering only — solved state uses face ids. */
export const FACE_HEX: Record<FaceColor, string> = {
  R: "#de1b24",
  O: "#ff6a00",
  W: "#f7f7f2",
  Y: "#ffd000",
  G: "#009b48",
  B: "#0057d9",
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
