import type { FaceColor } from "./cube-math";

/** Official-style sticker colors. Rendering only — solved state uses face ids. */
export const FACE_HEX: Record<FaceColor, string> = {
  R: "#ff2424",
  O: "#f59e00",
  W: "#f1f2f6",
  Y: "#fed526",
  G: "#02ff6b",
  B: "#2771ff",
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
