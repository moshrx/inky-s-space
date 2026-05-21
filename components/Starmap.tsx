"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STAR_COLOR, type Echo, type Emotion, type Poem } from "@/types/poem";
import { weekKey } from "@/lib/storage";

interface Props {
  poems: Poem[];
  echoes: Echo[];
  filter: Emotion | "all";
  onOpen: (poem: Poem) => void;
  flyToId: string | null;
  onFlyComplete: () => void;
}

interface View {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 4.5;
const TONIGHT_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function Starmap({
  poems,
  echoes,
  filter,
  onOpen,
  flyToId,
  onFlyComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const viewRef = useRef<View>(view);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const dragMoved = useRef(false);
  const pendingView = useRef<View | null>(null);
  const rafScheduled = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // --- Resize observer ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // --- rAF-batched view setter ---
  const queueView = useCallback((next: View | ((v: View) => View)) => {
    const current = pendingView.current ?? viewRef.current;
    const resolved = typeof next === "function" ? next(current) : next;
    pendingView.current = resolved;
    viewRef.current = resolved;
    if (!rafScheduled.current) {
      rafScheduled.current = true;
      requestAnimationFrame(() => {
        rafScheduled.current = false;
        if (pendingView.current) {
          setView(pendingView.current);
          pendingView.current = null;
        }
      });
    }
  }, []);

  // --- Echo index: O(1) lookup per poem ---
  const echoIndex = useMemo(() => {
    const m = new Map<string, Echo[]>();
    for (const e of echoes) {
      const arr = m.get(e.poemId);
      if (arr) arr.push(e);
      else m.set(e.poemId, [e]);
    }
    return m;
  }, [echoes]);

  // --- Constellations: poems in the same ISO week chained by published time ---
  const constellations = useMemo(() => {
    const byWeek = new Map<string, Poem[]>();
    for (const p of poems) {
      if (p.publishedAt === null) continue;
      const k = weekKey(p.publishedAt);
      const arr = byWeek.get(k) || [];
      arr.push(p);
      byWeek.set(k, arr);
    }
    const lines: { from: Poem; to: Poem }[] = [];
    for (const arr of byWeek.values()) {
      if (arr.length < 2) continue;
      arr.sort((a, b) => (a.publishedAt || 0) - (b.publishedAt || 0));
      for (let i = 0; i < arr.length - 1; i++) {
        lines.push({ from: arr[i], to: arr[i + 1] });
      }
    }
    return lines;
  }, [poems]);

  // --- Newest poem / "tonight" check, once per render ---
  const { newestId, isTonightActive } = useMemo(() => {
    const pub = poems.filter((p) => p.publishedAt !== null);
    if (pub.length === 0) return { newestId: null as string | null, isTonightActive: false };
    const n = pub.reduce((a, b) => ((b.publishedAt || 0) > (a.publishedAt || 0) ? b : a));
    return {
      newestId: n.id,
      isTonightActive: Date.now() - (n.publishedAt || 0) < TONIGHT_WINDOW_MS,
    };
  }, [poems]);

  // --- Fly-to ---
  useEffect(() => {
    if (!flyToId || size.w === 0) return;
    const p = poems.find((p) => p.id === flyToId);
    if (!p || p.x === undefined || p.y === undefined) return;
    animateView(
      viewRef.current,
      { x: -p.x, y: -p.y, scale: 2.2 },
      (v) => {
        viewRef.current = v;
        setView(v);
      },
      onFlyComplete,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToId, size.w]);

  // --- Wheel zoom ---
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const delta = -e.deltaY * 0.0015;
      queueView((v) => {
        const newScale = clamp(v.scale * (1 + delta), MIN_SCALE, MAX_SCALE);
        const nx = v.x - (cx / v.scale - cx / newScale);
        const ny = v.y - (cy / v.scale - cy / newScale);
        return { x: nx, y: ny, scale: newScale };
      });
    },
    [queueView],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist.current != null) {
          const factor = d / lastPinchDist.current;
          queueView((v) => ({
            ...v,
            scale: clamp(v.scale * factor, MIN_SCALE, MAX_SCALE),
          }));
        }
        lastPinchDist.current = d;
        dragMoved.current = true;
        return;
      }

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved.current = true;
      queueView((v) => ({ ...v, x: v.x + dx / v.scale, y: v.y + dy / v.scale }));
    },
    [queueView],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
  }, []);

  const cx = size.w / 2;
  const cy = size.h / 2;
  const transform = `translate(${cx + view.x * view.scale} ${cy + view.y * view.scale}) scale(${view.scale})`;

  // Viewport cull box (in world coords, +300 padding so edges aren't visible).
  const halfW = size.w > 0 ? size.w / 2 / view.scale + 300 : 9999;
  const halfH = size.h > 0 ? size.h / 2 / view.scale + 300 : 9999;
  const minX = -view.x - halfW;
  const maxX = -view.x + halfW;
  const minY = -view.y - halfH;
  const maxY = -view.y + halfH;
  const inViewport = (px: number, py: number) =>
    px >= minX && px <= maxX && py >= minY && py <= maxY;
  const visible = (poem: Poem) => filter === "all" || poem.emotion === filter;

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute inset-0 touch-none cursor-grab select-none active:cursor-grabbing"
      style={{ overscrollBehavior: "contain" }}
    >
      {size.w > 0 && (
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="h-full w-full"
        >
          <defs>
            <filter id="soft-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          <g transform={transform}>
            <g opacity={filter === "all" ? 0.35 : 0.18}>
              {constellations.map((line, i) => {
                const a = line.from;
                const b = line.to;
                if (a.x == null || b.x == null) return null;
                if (!inViewport(a.x, a.y!) && !inViewport(b.x, b.y!)) return null;
                const showA = visible(a);
                const showB = visible(b);
                if (!showA && !showB) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(232, 237, 247, 0.5)"
                    strokeWidth={0.5 / view.scale}
                    strokeDasharray={`${2 / view.scale} ${3 / view.scale}`}
                    opacity={showA && showB ? 1 : 0.35}
                  />
                );
              })}
            </g>

            {poems.map((p) => {
              if (p.publishedAt === null || p.x == null || p.y == null) return null;
              if (!inViewport(p.x, p.y)) return null;
              const isVisible = visible(p);
              const isHover = hoverId === p.id;
              const isTonight = isTonightActive && p.id === newestId;
              const baseR = 3 + (p.depth || 0.6) * 2.2;
              const r = baseR * (isHover ? 1.6 : 1) * (isTonight ? 1.25 : 1);
              const poemEchoes = echoIndex.get(p.id);
              const echoCount = poemEchoes ? poemEchoes.length : 0;

              const seed = (parseInt(p.id.slice(-3), 36) || 0) % 100;
              const twinkleDur = `${3.2 + (seed % 20) * 0.12}s`;
              const twinkleDelay = `${(seed % 50) * -0.07}s`;
              const hitR = Math.max(r * 2.4, 22 / view.scale);

              return (
                <g
                  key={p.id}
                  opacity={isVisible ? 1 : 0.14}
                  style={{ cursor: isVisible ? "pointer" : "default" }}
                  onPointerEnter={() => isVisible && setHoverId(p.id)}
                  onPointerLeave={() => setHoverId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragMoved.current) return;
                    if (!isVisible) return;
                    onOpen(p);
                  }}
                >
                  {/* Invisible finger-sized hit target */}
                  <circle cx={p.x} cy={p.y} r={hitR} fill="transparent" />

                  {/* Halo */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r * (isTonight ? 7 : isHover ? 5 : 3.5)}
                    fill={STAR_COLOR}
                    opacity={isTonight ? 0.22 : 0.12}
                    filter="url(#soft-blur)"
                    className={isTonight ? "tonight-pulse" : undefined}
                  />

                  {/* Echo orbit ring + dots */}
                  {echoCount > 0 && (() => {
                    const px = p.x as number;
                    const py = p.y as number;
                    return (
                      <>
                        <circle
                          cx={px}
                          cy={py}
                          r={r * 3}
                          fill="none"
                          stroke={STAR_COLOR}
                          strokeOpacity={0.25}
                          strokeWidth={0.4 / view.scale}
                          strokeDasharray={`${1 / view.scale} ${2 / view.scale}`}
                        />
                        <g
                          className="echo-orbit"
                          style={{
                            transformOrigin: `${px}px ${py}px`,
                            ["--orbit-dur" as string]: `${40 + (seed % 30)}s`,
                          }}
                        >
                          {poemEchoes!.slice(0, 6).map((e, i) => {
                            const a = (i / Math.min(echoCount, 6)) * Math.PI * 2 + e.angle;
                            const er = r * 3;
                            return (
                              <circle
                                key={e.id}
                                cx={px + Math.cos(a) * er}
                                cy={py + Math.sin(a) * er}
                                r={Math.max(0.5, 0.8 / view.scale + 0.5)}
                                fill={STAR_COLOR}
                                opacity={0.65}
                              />
                            );
                          })}
                        </g>
                      </>
                    );
                  })()}

                  {/* Star core — CSS twinkle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={STAR_COLOR}
                    className="star-twinkle"
                    style={
                      {
                        ["--twinkle-dur" as string]: twinkleDur,
                        ["--twinkle-delay" as string]: twinkleDelay,
                      } as React.CSSProperties
                    }
                  />
                  <circle cx={p.x} cy={p.y} r={r * 0.45} fill="white" opacity={0.85} />

                  {isHover && isVisible && (
                    <g pointerEvents="none">
                      <text
                        x={p.x + r * 2}
                        y={p.y - r * 2}
                        fontFamily="var(--font-serif), Cormorant Garamond, serif"
                        fontStyle="italic"
                        fontSize={14 / view.scale}
                        fill="#e8edf7"
                        opacity={0.92}
                      >
                        {p.title.trim() ||
                          (p.body.split("\n").find((l) => l.trim()) || "untitled").slice(0, 36)}
                      </text>
                      {isTonight && (
                        <text
                          x={p.x + r * 2}
                          y={p.y - r * 2 + 16 / view.scale}
                          fontFamily="var(--font-sans), Inter, sans-serif"
                          fontSize={9 / view.scale}
                          fill={STAR_COLOR}
                          letterSpacing={2 / view.scale}
                        >
                          TONIGHT
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="pointer-events-none safe-bottom absolute bottom-16 left-3 text-[9px] uppercase tracking-[0.25em] text-ink-faded sm:bottom-20 sm:left-4 sm:text-[10px] sm:tracking-[0.3em]">
        zoom {view.scale.toFixed(1)}× · drag · pinch
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function animateView(
  from: View,
  to: View,
  onStep: (v: View) => void,
  onDone: () => void,
) {
  const duration = 1200;
  const start = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const e = easeInOutCubic(t);
    onStep({
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
      scale: from.scale + (to.scale - from.scale) * e,
    });
    if (t < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
