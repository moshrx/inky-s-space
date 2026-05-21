"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Starfield from "@/components/Starfield";
import { usePoems } from "@/lib/usePoems";
import { EMOTIONS, EMOTION_META, type Emotion, type Poem } from "@/types/poem";

// Lazy: Framer-free SVG starmap + modal load only after the page mounts.
const Starmap = dynamic(() => import("@/components/Starmap"), {
  ssr: false,
  loading: () => null,
});
const PoemModal = dynamic(() => import("@/components/PoemModal"), {
  ssr: false,
  loading: () => null,
});

const TONIGHT_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function SpacePage() {
  const { ready, published, echoes, addEcho } = usePoems();
  const [openPoem, setOpenPoem] = useState<Poem | null>(null);
  const [filter, setFilter] = useState<Emotion | "all">("all");
  const [flyTo, setFlyTo] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    // Show field guide on tablet+ only, and only first visit
    if (!mq.matches && !window.localStorage.getItem("space:guide-seen")) {
      setShowLegend(true);
    }
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function dismissLegend() {
    setShowLegend(false);
    try {
      window.localStorage.setItem("space:guide-seen", "1");
    } catch {}
  }

  const tonight = useMemo(() => {
    if (published.length === 0) return null;
    const newest = published.reduce((a, b) =>
      (b.publishedAt || 0) > (a.publishedAt || 0) ? b : a,
    );
    if (Date.now() - (newest.publishedAt || 0) < TONIGHT_WINDOW_MS) {
      return newest;
    }
    return null;
  }, [published]);

  const filtered = useMemo(
    () => (filter === "all" ? published : published.filter((p) => p.emotion === filter)),
    [published, filter],
  );

  function randomStar() {
    const pool = filtered.length > 0 ? filtered : published;
    if (pool.length === 0) return;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    setFlyTo(choice.id);
    setTimeout(() => setOpenPoem(choice), 1100);
  }

  function flyToTonight() {
    if (!tonight) return;
    setFlyTo(tonight.id);
    setTimeout(() => setOpenPoem(tonight), 1100);
  }

  return (
    <main className="vignette safe-px relative min-h-svh overflow-hidden">
      {/* Lower density on mobile — Starfield already caps, but skip cycles on phones */}
      <Starfield density={isMobile ? 0.12 : 0.2} />

      <div className="absolute inset-0 z-10">
        {ready && (
          <Starmap
            poems={published}
            echoes={echoes}
            filter={filter}
            onOpen={(p) => setOpenPoem(p)}
            flyToId={flyTo}
            onFlyComplete={() => setFlyTo(null)}
          />
        )}
      </div>

      {/* Top bar — collapses centered title on the smallest phones */}
      <header className="safe-top pointer-events-none relative z-20 flex items-start justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4 md:px-8 md:py-6">
        <Link
          href="/"
          className="pointer-events-auto rounded-full px-1 py-1 font-serif text-xs italic text-ink-mist transition-colors hover:text-ink-silver sm:text-sm"
        >
          ← door
        </Link>

        <div className="pointer-events-auto text-center">
          <div className="font-serif text-sm italic text-ink-silver sm:text-base md:text-xl">
            the space
          </div>
          <div className="hidden text-[9px] uppercase tracking-[0.3em] text-ink-faded sm:block sm:text-[10px] sm:tracking-[0.35em]">
            wander gently
          </div>
        </div>

        <Link
          href="/inky"
          className="pointer-events-auto rounded-full px-1 py-1 font-serif text-xs italic text-ink-mist transition-colors hover:text-ink-silver sm:text-sm"
        >
          writing →
        </Link>
      </header>

      {/* Tonight pill — sits lower on phones so it doesn't kiss the header */}
      {tonight && (
        <button
          type="button"
          onClick={flyToTonight}
          className="fade-in-up safe-px absolute left-1/2 top-[68px] z-30 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-full border border-white/15 bg-night-900/70 px-3 py-1.5 opacity-0 backdrop-blur-md transition-all [animation-delay:300ms] hover:border-ink-gold/50 active:scale-95 sm:top-20 sm:px-4 sm:py-2 md:top-24"
          style={{ boxShadow: `0 0 28px -12px ${EMOTION_META[tonight.emotion].glow}` }}
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span
              className="tonight-dot h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{
                background: EMOTION_META[tonight.emotion].color,
                boxShadow: `0 0 10px ${EMOTION_META[tonight.emotion].glow}`,
              }}
            />
            <span className="text-[9px] uppercase tracking-[0.28em] text-ink-silver sm:text-[10px] sm:tracking-[0.35em]">
              tonight
            </span>
            <span className="max-w-[140px] truncate font-serif text-xs italic text-ink-mist sm:max-w-none sm:text-sm">
              {tonight.title.trim() ||
                (tonight.body.split("\n").find((l) => l.trim()) || "untitled").slice(0, 26)}
            </span>
          </div>
        </button>
      )}

      {/* Filter bar — horizontal scroll, hugs safe-area */}
      <div className="safe-bottom pointer-events-none absolute bottom-2 left-0 right-0 z-30 flex justify-center px-2 sm:bottom-5 sm:px-4">
        <div className="pointer-events-auto thin-scroll flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-night-900/70 px-2 py-1.5 backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="all"
            color="#e8edf7"
          />
          {EMOTIONS.map((e) => {
            const m = EMOTION_META[e];
            return (
              <FilterChip
                key={e}
                active={filter === e}
                onClick={() => setFilter((f) => (f === e ? "all" : e))}
                label={m.label}
                color={m.color}
              />
            );
          })}
          <div className="mx-1 h-5 w-px flex-shrink-0 bg-white/10" />
          <button
            onClick={randomStar}
            className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-mist transition-colors hover:bg-white/5 hover:text-ink-gold active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.2em]"
          >
            ✦ random
          </button>
        </div>
      </div>

      {/* Field guide — tablet+ only, first-visit, dismissible */}
      {showLegend && published.length > 0 && (
        <div className="fade-in-up absolute right-4 top-20 z-30 hidden max-w-[240px] rounded-2xl border border-white/10 bg-night-900/60 p-4 opacity-0 backdrop-blur-md [animation-delay:600ms] md:top-24 lg:block">
          <button
            onClick={dismissLegend}
            className="absolute right-2 top-2 text-ink-faded hover:text-ink-silver"
            aria-label="dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-ink-mist">
            field guide
          </div>
          <p className="mb-3 font-serif text-sm italic text-ink-silver">
            each star is a poem. tap one to read. leave an echo back if you like.
          </p>
          <p className="font-serif text-xs italic text-ink-faded">
            poems written the same week are joined by a quiet line.
          </p>
        </div>
      )}

      {ready && published.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-night-900/70 p-6 text-center backdrop-blur-md sm:p-8">
            <p className="mb-4 font-serif text-xl italic text-ink-silver sm:text-2xl">
              the space is quiet tonight.
            </p>
            <p className="mb-6 font-serif text-sm italic text-ink-faded">
              no stars have been placed yet.
            </p>
            <Link
              href="/inky"
              className="inline-block rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.3em] text-ink-silver transition-all hover:border-ink-gold hover:text-ink-gold"
            >
              go write one
            </Link>
          </div>
        </div>
      )}

      {ready && (
        <PoemModal
          poem={openPoem}
          echoes={echoes}
          onClose={() => setOpenPoem(null)}
          onAddEcho={addEcho}
        />
      )}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-all active:scale-95 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em] ${
        active
          ? "bg-white/10 text-ink-silver"
          : "text-ink-mist hover:bg-white/5 hover:text-ink-silver"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: active ? `0 0 8px ${color}` : "none" }}
      />
      {label}
    </button>
  );
}
