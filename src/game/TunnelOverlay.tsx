import { useEffect, useRef } from "react";

export const TUNNEL_MS = 2200;

interface TunnelOverlayProps {
  caption: string;
  onDone: () => void;
}

// A short "walking down the tunnel" animation: a stone tunnel seen head-on,
// with ceiling lights rushing toward you and a lit exit growing at the end.
const TunnelOverlay = ({ caption, onDone }: TunnelOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;
    let finished = false;

    const frame = (now: number) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W / 2;
      const cy = H / 2;
      const t = Math.min(1, (now - start) / TUNNEL_MS);

      ctx.fillStyle = "#0b0a0e";
      ctx.fillRect(0, 0, W, H);

      // Stone rings from the far end (small) to the near end (screen edge).
      // `travel` moves the rings outward to give a sense of walking forward.
      const travel = ((now - start) / 260) % 1;
      const RINGS = 14;
      for (let i = RINGS; i >= 0; i--) {
        const depth = (i - travel) / RINGS; // 0 = near, 1 = far
        if (depth < 0) continue;
        const scale = Math.pow(1 - depth, 2.2);
        const w = W * 1.15 * scale;
        const h = H * 1.15 * scale;
        const shade = Math.round(18 + 40 * scale);
        ctx.strokeStyle = `rgb(${shade + 8}, ${shade}, ${shade + 4})`;
        ctx.lineWidth = Math.max(1, 14 * scale);
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

        // A warm ceiling light on every other ring
        if (i % 2 === 0) {
          const lw = 40 * scale;
          ctx.fillStyle = `rgba(255, 200, 110, ${0.25 + 0.6 * scale})`;
          ctx.fillRect(cx - lw / 2, cy - h / 2 + ctx.lineWidth, lw, Math.max(1, 5 * scale));
        }
      }

      // The lit exit at the far end grows as you get closer.
      const exitW = 18 + W * 0.55 * t * t;
      const exitH = exitW * 0.7;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, exitW);
      glow.addColorStop(0, `rgba(255, 225, 150, ${0.55 + 0.4 * t})`);
      glow.addColorStop(1, "rgba(255, 225, 150, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - exitW, cy - exitW, exitW * 2, exitW * 2);
      ctx.fillStyle = `rgba(255, 244, 214, ${0.5 + 0.5 * t})`;
      ctx.fillRect(cx - exitW / 2, cy - exitH / 2, exitW, exitH);

      // Fade to white light right at the end.
      if (t > 0.8) {
        ctx.fillStyle = `rgba(255, 246, 225, ${(t - 0.8) / 0.2})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (t >= 1) {
        if (!finished) {
          finished = true;
          onDoneRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[16] pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <p className="absolute bottom-10 inset-x-0 text-center text-amber-100/90 text-sm font-mono tracking-wide">
        {caption}
      </p>
    </div>
  );
};

export default TunnelOverlay;
