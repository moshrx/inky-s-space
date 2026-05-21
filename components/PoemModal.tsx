"use client";

import { useEffect, useState } from "react";
import { EMOTION_META, type Echo, type Poem } from "@/types/poem";

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
      // Next frame: flip visible -> true so the transition runs
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

  if (!mounted || !poem) return null;
  const meta = EMOTION_META[poem.emotion];
  const poemEchoes = echoes.filter((e) => e.poemId === poem.id);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-3 py-6 transition-opacity duration-300 sm:px-4 sm:py-10 ${
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

      {/* Orbiting echoes — hidden on phones, CSS-only on larger */}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
        <div className="relative">
          {poemEchoes.map((e, i) => (
            <EchoOrbit
              key={e.id}
              echo={e}
              index={i}
              total={poemEchoes.length}
              color={meta.color}
              show={visible}
            />
          ))}
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`safe-px relative z-10 max-h-[90svh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-night-900/90 p-6 backdrop-blur-xl transition-all duration-300 ease-out sm:p-8 md:p-12 ${
          visible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.94]"
        }`}
        style={{
          boxShadow: `0 0 80px -20px ${meta.glow}, 0 0 0 1px rgba(255,255,255,0.04)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-ink-faded transition-colors hover:text-ink-silver sm:right-4 sm:top-4"
          aria-label="close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>

        <div className="mb-4 flex items-center gap-3 pr-8">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ background: meta.color, boxShadow: `0 0 12px ${meta.glow}` }}
          />
          <span className="text-[9px] uppercase tracking-[0.3em] text-ink-mist sm:text-[10px] sm:tracking-[0.35em]">
            {meta.label} — {meta.whisper}
          </span>
        </div>

        {poem.title.trim() && (
          <h2 className="font-serif text-2xl font-light italic text-ink-silver sm:text-3xl md:text-4xl">
            {poem.title}
          </h2>
        )}

        <div className="mb-5 mt-3 h-px w-16 rounded-full" style={{ background: meta.color, opacity: 0.5 }} />

        <p className="poem-body text-ink-silver">{poem.body}</p>

        <div className="mt-6 border-t border-white/5 pt-4 text-[10px] uppercase tracking-[0.3em] text-ink-faded sm:mt-8 sm:pt-5">
          placed {formatDate(poem.publishedAt!)}
        </div>

        <div className="mt-5 sm:mt-6">
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-ink-mist">leave an echo</div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 240))}
              placeholder="a quiet word back..."
              rows={2}
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 font-serif text-base italic text-ink-silver placeholder:text-ink-faded focus:border-white/25 focus:outline-none"
            />
            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => {
                onAddEcho(poem.id, text);
                setText("");
              }}
              className="self-end rounded-full border border-white/15 px-4 py-2.5 text-xs uppercase tracking-[0.25em] text-ink-silver transition-all hover:border-white/35 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:self-auto"
              style={{ boxShadow: text.trim() ? `0 0 24px -10px ${meta.glow}` : undefined }}
            >
              send
            </button>
          </div>

          {poemEchoes.length > 0 && (
            <div className="thin-scroll mt-5 max-h-44 space-y-3 overflow-y-auto pr-2">
              {poemEchoes
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((e) => (
                  <div key={e.id} className="flex gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: meta.color, boxShadow: `0 0 6px ${meta.glow}` }}
                    />
                    <p className="font-serif text-sm italic text-ink-mist">{e.text}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EchoOrbit({
  echo,
  index,
  total,
  color,
  show,
}: {
  echo: Echo;
  index: number;
  total: number;
  color: string;
  show: boolean;
}) {
  const baseAngle = (index / Math.max(total, 1)) * 360;
  const offset = (echo.angle * 180) / Math.PI;
  const startAngle = baseAngle + offset * 0.15;
  // Radius adapts: smaller on viewports under 1024px, set via CSS clamp inline.
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
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
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
