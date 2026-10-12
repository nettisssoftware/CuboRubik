import { useEffect, useRef } from "react";
import { CONFETTI_HEX } from "./palette";

type Bit = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
};

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let raf = 0;
    const bits: Bit[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const spawn = (n: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 180 + Math.random() * 520;
        bits.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.2,
          y: h * 0.42,
          w: 6 + Math.random() * 7,
          h: 8 + Math.random() * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 180,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 8,
          color: CONFETTI_HEX[i % CONFETTI_HEX.length]!,
        });
      }
    };
    spawn(reduced ? 24 : 110);

    let last = performance.now();
    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.vy += 720 * dt;
        b.vx *= 0.99;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      if (bits.some((b) => b.y < h + 40)) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
