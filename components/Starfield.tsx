"use client";

import { useEffect, useRef } from "react";

interface Props {
  density?: number; // stars per 10k px², capped to a hard max for mobile
  shooting?: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  twinkleSpeed: number;
  twinklePhase: number;
  depth: number;
  color: string;
}

// Hard cap so phones don't draw 800 stars/frame on tall viewports.
const MAX_STARS_MOBILE = 220;
const MAX_STARS_DESKTOP = 480;
// Throttle the canvas redraw — 30fps is plenty for slow drift/twinkle.
const FRAME_MS = 1000 / 30;

export default function Starfield({ density = 0.18, shooting = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const shootRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    // Coarse pointer = touch device; no mousemove parallax.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const maxStars = isMobile ? MAX_STARS_MOBILE : MAX_STARS_DESKTOP;

    let w = 0;
    let h = 0;
    let backgroundGradient: CanvasGradient | null = null;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 2);

    function rebuild() {
      const raw = Math.floor((w * h * density) / 1000);
      const count = Math.min(raw, maxStars);
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        const colorRoll = Math.random();
        const color =
          colorRoll < 0.85
            ? "232, 237, 247"
            : Math.random() < 0.5
              ? "244, 213, 141"
              : "170, 200, 255";
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.3 + depth * 1.3 + Math.random() * 0.4,
          base: 0.25 + depth * 0.55,
          twinkleSpeed: 0.4 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          depth,
          color,
        });
      }
      starsRef.current = stars;
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      backgroundGradient = ctx!.createLinearGradient(0, 0, w, h);
      backgroundGradient.addColorStop(0, "rgba(20, 24, 60, 0.0)");
      backgroundGradient.addColorStop(0.5, "rgba(40, 30, 70, 0.06)");
      backgroundGradient.addColorStop(1, "rgba(10, 14, 40, 0.0)");
      rebuild();
      if (reducedMotion) {
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    function onMouse(e: MouseEvent) {
      if (reducedMotion || isTouch) return;
      mouseRef.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function maybeShoot() {
      if (!shooting || reducedMotion || shootRef.current) return;
      if (Math.random() < 0.0015) {
        const fromTop = Math.random() < 0.5;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
        const speed = 8 + Math.random() * 6;
        shootRef.current = {
          x: fromTop ? Math.random() * w * 0.6 : -40,
          y: fromTop ? -40 : Math.random() * h * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 90 + Math.random() * 40,
        };
      }
    }

    let paused = document.hidden;
    function onVisibility() {
      paused = document.hidden;
      if (!paused) {
        last = performance.now();
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    let last = performance.now();
    let t = 0;
    function frame(now: number) {
      if (paused) return;
      if (now - last < FRAME_MS) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const delta = (now - last) / FRAME_MS; // ≈ 1.0 at 30fps
      last = now;
      t += delta;

      // Ease mouse parallax (skipped on touch)
      if (!isTouch) {
        mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.06;
        mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.06;
      }

      ctx!.clearRect(0, 0, w, h);

      ctx!.fillStyle = backgroundGradient!;
      ctx!.fillRect(0, 0, w, h);

      const mx = isTouch ? 0 : mouseRef.current.x;
      const my = isTouch ? 0 : mouseRef.current.y;
      const skipDrift = reducedMotion || isMobile;
      const skipHalo = isMobile; // halos are expensive; mobile skips them

      for (const s of starsRef.current) {
        const alpha = reducedMotion
          ? s.base
          : s.base + Math.sin(t * 0.05 * s.twinkleSpeed + s.twinklePhase) * 0.35 * s.base;
        // Branchless on mobile: skip parallax and drift math when both = 0
        const px = isTouch ? s.x : s.x - mx * 18 * s.depth;
        const py = isTouch ? s.y : s.y - my * 18 * s.depth;
        const yy = skipDrift ? py : (py + (t * 0.04 * (1 - s.depth)) % h) % h;

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${s.color}, ${alpha})`;
        ctx!.arc(px, yy, s.r, 0, Math.PI * 2);
        ctx!.fill();

        if (!skipHalo && s.r > 1.2 && alpha > 0.7) {
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(255, 255, 255, ${(alpha - 0.6) * 0.18})`;
          ctx!.arc(px, yy, s.r * 3, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      maybeShoot();
      const sh = shootRef.current;
      if (sh) {
        sh.life += delta;
        sh.x += sh.vx * delta;
        sh.y += sh.vy * delta;
        const a = Math.max(0, 1 - sh.life / sh.max);
        const tail = 80;
        const gx = sh.x - sh.vx * (tail / 6);
        const gy = sh.y - sh.vy * (tail / 6);
        const lg = ctx!.createLinearGradient(gx, gy, sh.x, sh.y);
        lg.addColorStop(0, "rgba(255, 255, 255, 0)");
        lg.addColorStop(1, `rgba(244, 213, 141, ${0.9 * a})`);
        ctx!.strokeStyle = lg;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        ctx!.moveTo(gx, gy);
        ctx!.lineTo(sh.x, sh.y);
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx!.arc(sh.x, sh.y, 1.6, 0, Math.PI * 2);
        ctx!.fill();

        if (sh.life > sh.max || sh.x > w + 80 || sh.y > h + 80) {
          shootRef.current = null;
        }
      }

      if (reducedMotion) return;

      rafRef.current = requestAnimationFrame(frame);
    }

    resize();

    if (reducedMotion) {
      // Paint a single static frame and stop.
      rafRef.current = requestAnimationFrame(frame);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [density, shooting]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}
