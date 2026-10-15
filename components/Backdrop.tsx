import React, { useEffect, useRef } from 'react';

interface BackdropProps {
  /** 'space' for menus, 'room' for gameplay without a camera (adds a floor + doorway). */
  variant?: 'space' | 'room';
  dim?: boolean;
}

/**
 * Animated starfield; in 'room' mode it also gets a dim perspective floor and
 * a doorway edge on the right for the alien to peek around. Used for menus and
 * as the camera-denied / no-camera play space.
 */
const Backdrop: React.FC<BackdropProps> = ({ variant = 'space', dim }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    type Star = { x: number; y: number; r: number; a: number; tw: number; v: number };
    let stars: Star[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 2600);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random() * 0.7 + 0.2,
        tw: Math.random() * Math.PI * 2,
        v: Math.random() * 0.06 + 0.01
      }));
      if (reduce) requestAnimationFrame(draw);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const sky = ctx.createRadialGradient(w * 0.35, h * 0.3, 0, w * 0.35, h * 0.3, Math.max(w, h));
      sky.addColorStop(0, '#111633');
      sky.addColorStop(0.55, '#070915');
      sky.addColorStop(1, '#020205');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Faint nebula
      const neb = ctx.createRadialGradient(w * 0.75, h * 0.2, 0, w * 0.75, h * 0.2, w * 0.7);
      neb.addColorStop(0, 'rgba(126, 34, 206, 0.16)');
      neb.addColorStop(1, 'rgba(126, 34, 206, 0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);

      const horizon = variant === 'room' ? h * 0.58 : h;
      for (const s of stars) {
        if (s.y > horizon) continue;
        const a = s.a * (0.65 + 0.35 * Math.sin(s.tw + t * 0.0015));
        ctx.fillStyle = `rgba(210, 235, 255, ${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduce) {
          s.x -= s.v;
          if (s.x < 0) s.x = w;
        }
      }

      if (variant === 'room') {
        // Floor plane
        const floor = ctx.createLinearGradient(0, horizon, 0, h);
        floor.addColorStop(0, 'rgba(20, 24, 48, 0.0)');
        floor.addColorStop(0.15, 'rgba(18, 22, 44, 0.85)');
        floor.addColorStop(1, 'rgba(10, 12, 26, 1)');
        ctx.fillStyle = floor;
        ctx.fillRect(0, horizon, w, h - horizon);

        // Perspective grid
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.10)';
        ctx.lineWidth = 1;
        const vx = w * 0.45;
        for (let i = -8; i <= 8; i++) {
          ctx.beginPath();
          ctx.moveTo(vx, horizon);
          ctx.lineTo(vx + i * w * 0.22, h);
          ctx.stroke();
        }
        for (let i = 1; i < 9; i++) {
          const y = horizon + (h - horizon) * Math.pow(i / 9, 1.8);
          ctx.globalAlpha = 0.4 + i * 0.06;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Doorway edge on the right: what the alien peeks around.
        const doorW = Math.max(18, w * 0.05);
        const wall = ctx.createLinearGradient(w - doorW, 0, w, 0);
        wall.addColorStop(0, 'rgba(4, 5, 12, 0.0)');
        wall.addColorStop(0.35, 'rgba(4, 5, 12, 0.9)');
        wall.addColorStop(1, 'rgba(2, 2, 6, 1)');
        ctx.fillStyle = wall;
        ctx.fillRect(w - doorW, h * 0.12, doorW, h);
        // Light spill from behind the door
        const spill = ctx.createRadialGradient(w, horizon + (h - horizon) * 0.5, 0, w, horizon + (h - horizon) * 0.5, w * 0.6);
        spill.addColorStop(0, 'rgba(34, 211, 238, 0.10)');
        spill.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = spill;
        ctx.fillRect(0, 0, w, h);
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <canvas ref={ref} className="w-full h-full block" />
      {dim && <div className="absolute inset-0 bg-black/40" />}
    </div>
  );
};

export default Backdrop;
