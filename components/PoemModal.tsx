"use client";

import { useEffect, useState } from "react";
import { STAR_COLOR, STAR_GLOW, type Echo, type Poem } from "@/types/poem";

interface Props {
  poem: Poem | null;
  echoes: Echo[];
  onClose: () => void;
  onAddEcho: (poemId: string, text: string) => void;
}

export default function PoemModal({ poem, echoes, onClose, onAddEcho }: Props) {
  // Two-stage mount/unmount so we can play exit animations via CSS classes.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (poem) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      setText("");
      return () => cancelAnimationFrame(id);
    } else if (mounted) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [poem, mounted]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while the card is mounted.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted || !poem) return null;
  const poemEchoes = echoes.filter((e) => e.poemId === poem.id);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 sm:items-center sm:px-4 sm:py-10 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-night-950/85 backdrop-blur-md"
        aria-hidden
      />

      {/* Orbiting echoes — desktop only */}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
        <div className="relative">
          {poemEchoes.map((e, i) => (
            <EchoOrbit
              key={e.id}
              echo={e}
              index={i}
              total={poemEchoes.length}
              show={visible}
            />
          ))}
        </div>
      </div>

      {/* The card — bottom-sheet on phones, centered card on sm+ */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex w-full max-w-xl flex-col overflow-hidden border-white/10 bg-night-900/95 backdrop-blur-xl transition-all duration-300 ease-out
          h-[92svh] max-h-[92svh] rounded-t-3xl border-t
          sm:h-auto sm:max-h-[90svh] sm:rounded-3xl sm:border ${
            visible
              ? "translate-y-0 scale-100"
              : "translate-y-6 scale-[0.96] sm:translate-y-3 sm:scale-[0.94]"
          }`}
        style={{
          boxShadow: `0 0 80px -20px ${STAR_GLOW}, 0 0 0 1px rgba(255,255,255,0.04)`,
        }}
      >
        {/* Drag handle (visual only) — bottom-sheet affordance on phones */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* Close button — pinned to the card, always tappable */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-night-900/80 text-ink-faded backdrop-blur transition-colors hover:text-ink-silver sm:right-4 sm:top-4 sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent"
          aria-label="close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>

        {/* Scroll region — every line break is here */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-8 sm:pt-8 md:px-12">
          {poem.title.trim() && (
            <h2 className="break-words pr-10 font-serif text-2xl font-light italic leading-tight text-ink-silver sm:pr-12 sm:text-3xl md:text-4xl">
              {poem.title}
            </h2>
          )}

          <div
            className="mb-4 mt-2 h-px w-12 rounded-full sm:mb-5 sm:mt-3 sm:w-16"
            style={{ background: STAR_COLOR, opacity: 0.5 }}
          />

          <p className="poem-body poem-body-mobile max-w-full whitespace-pre-wrap break-words text-ink-silver">
            {poem.body}
          </p>

          <div className="mt-5 border-t border-white/5 pt-3 text-[9px] uppercase tracking-[0.22em] text-ink-faded sm:mt-8 sm:pt-5 sm:text-[10px] sm:tracking-[0.3em]">
            placed {formatDate(poem.publishedAt!)}
          </div>

          {/* Echo composer */}
          <div className="mt-5 sm:mt-6">
            <div className="mb-2 text-[9px] uppercase tracking-[0.22em] text-ink-mist sm:text-[10px] sm:tracking-[0.3em]">
              leave an echo
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 240))}
                placeholder="a quiet word back..."
                rows={2}
                className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 font-serif text-base italic text-ink-silver placeholder:text-ink-faded focus:border-white/25 focus:outline-none sm:px-4 sm:py-3"
              />
              <button
                type="button"
                disabled={!text.trim()}
                onClick={() => {
                  onAddEcho(poem.id, text);
                  setText("");
                }}
                className="w-full rounded-full border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] text-ink-silver transition-all hover:border-white/35 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:px-4 sm:text-xs sm:tracking-[0.25em]"
                style={{ boxShadow: text.trim() ? `0 0 24px -10px ${STAR_GLOW}` : undefined }}
              >
                send
              </button>
            </div>

            {/* Prior echoes — same flow as the body, no fixed max-h on phones */}
            {poemEchoes.length > 0 && (
              <div className="mt-5 space-y-3 sm:max-h-44 sm:overflow-y-auto sm:pr-2">
                {poemEchoes
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((e) => (
                    <div key={e.id} className="flex gap-3">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: STAR_COLOR, boxShadow: `0 0 6px ${STAR_GLOW}` }}
                      />
                      <p className="break-words font-serif text-sm italic text-ink-mist">
                        {e.text}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EchoOrbit({
  echo,
  index,
  total,
  show,
}: {
  echo: Echo;
  index: number;
  total: number;
  show: boolean;
}) {
  const baseAngle = (index / Math.max(total, 1)) * 360;
  const offset = (echo.angle * 180) / Math.PI;
  const startAngle = baseAngle + offset * 0.15;
  const radius = `clamp(180px, ${28 + (index % 3) * 2}vw, ${260 + echo.radius * 1.2}px)`;
  const duration = `${60 + (index % 5) * 12}s`;

  return (
    <div
      className="echo-orbit-wrap absolute"
      style={
        {
          top: 0,
          left: 0,
          ["--start" as string]: `${startAngle}deg`,
          ["--orbit-dur" as string]: duration,
          opacity: show ? 1 : 0,
          transition: `opacity 1.2s ease ${0.3 + index * 0.06}s`,
        } as React.CSSProperties
      }
    >
      <div className="echo-orbit-arm" style={{ ["--radius" as string]: radius } as React.CSSProperties}>
        <div className="echo-orbit-counter">
          <div className="flex max-w-[180px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/10 bg-night-900/70 px-3 py-1.5 backdrop-blur-sm">
            <span
              className="h-1 w-1 flex-shrink-0 rounded-full"
              style={{ background: STAR_COLOR, boxShadow: `0 0 6px ${STAR_COLOR}` }}
            />
            <span className="line-clamp-1 font-serif text-[11px] italic text-ink-mist">{echo.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
