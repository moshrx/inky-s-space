"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Starfield from "@/components/Starfield";
import EmotionPicker from "@/components/EmotionPicker";
import DraftStar from "@/components/DraftStar";
import InkyLock from "@/components/InkyLock";
import { usePoems } from "@/lib/usePoems";
import { EMOTION_META, type Emotion, type Poem } from "@/types/poem";

type SaveState = "idle" | "saving" | "saved";

export default function InkyPage() {
  return (
    <InkyLock>
      <InkyRoom />
    </InkyLock>
  );
}

function InkyRoom() {
  const {
    ready,
    drafts,
    published,
    createDraft,
    updatePoem,
    deletePoem,
    publish,
    unpublish,
  } = usePoems();

  function handleLock() {
    try {
      window.localStorage.removeItem("inky:unlocked");
    } catch {}
    window.location.reload();
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showPublishedList, setShowPublishedList] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // mobile drawer
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active: Poem | null = useMemo(() => {
    if (!activeId) return null;
    return (
      drafts.find((p) => p.id === activeId) ||
      published.find((p) => p.id === activeId) ||
      null
    );
  }, [activeId, drafts, published]);

  useEffect(() => {
    if (!ready) return;
    if (activeId) return;
    if (drafts.length > 0) {
      setActiveId(drafts[0].id);
    } else if (published.length === 0) {
      const d = createDraft("quiet");
      setActiveId(d.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function schedulePatch(id: string, patch: Partial<Poem>) {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updatePoem(id, patch);
      setSaveState("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 1500);
    }, 350);
  }

  function handleNewDraft() {
    const d = createDraft(active?.emotion ?? "quiet");
    setActiveId(d.id);
    setShowSidebar(false);
  }

  function handlePlaceStar() {
    if (!active) return;
    if (!active.body.trim()) return;
    publish(active.id);
    setShowPublishedList(true);
  }

  const meta = active ? EMOTION_META[active.emotion] : EMOTION_META.quiet;

  return (
    <main className="vignette safe-px relative min-h-svh overflow-hidden">
      <Starfield density={0.1} shooting={false} />

      <header className="safe-top relative z-20 flex items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 md:px-10 md:py-5">
        <Link
          href="/"
          className="rounded-full px-1 py-1 font-serif text-xs italic text-ink-mist transition-colors hover:text-ink-silver sm:text-sm"
        >
          ← back
        </Link>
        <div className="min-w-0 text-center">
          <div className="truncate font-serif text-sm italic text-ink-gold sm:text-lg md:text-xl">
            the writing room
          </div>
          <div className="hidden text-[10px] uppercase tracking-[0.3em] text-ink-faded sm:block sm:tracking-[0.35em]">
            only you are here
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowSidebar((s) => !s)}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-mist active:scale-95 md:hidden"
            aria-label="Toggle drafts"
          >
            {drafts.length}
          </button>
          <button
            type="button"
            onClick={handleLock}
            className="rounded-full px-1 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-faded transition-colors hover:text-ink-mist sm:tracking-[0.2em]"
            title="Lock the room"
          >
            lock
          </button>
          <Link
            href="/space"
            className="hidden font-serif text-xs italic text-ink-mist transition-colors hover:text-ink-silver sm:inline sm:text-sm"
          >
            space →
          </Link>
        </div>
      </header>

      <div className="relative z-20 mx-auto grid max-w-[1500px] grid-cols-1 gap-3 px-2 pb-6 sm:gap-4 sm:px-3 sm:pb-8 md:grid-cols-[300px_minmax(0,1fr)] md:gap-6 md:px-8 md:pb-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* EDITOR — first in DOM so mobile sees it first */}
        <section className="order-1 rounded-2xl border border-white/[0.06] bg-night-900/40 p-3 backdrop-blur-md sm:p-5 md:order-2 md:p-10">
          {active ? (
            <Editor
              key={active.id}
              poem={active}
              saveState={saveState}
              onChange={(patch) => schedulePatch(active.id, patch)}
              onPlace={handlePlaceStar}
              onUnpublish={() => unpublish(active.id)}
              glowColor={meta.glow}
              accent={meta.color}
            />
          ) : (
            <div className="flex h-[55svh] flex-col items-center justify-center text-center">
              <p className="font-serif text-lg italic text-ink-mist">pick a star, or strike a new one.</p>
              <button
                onClick={handleNewDraft}
                className="mt-6 rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.3em] text-ink-silver transition-colors hover:border-ink-gold hover:text-ink-gold"
              >
                + new star
              </button>
            </div>
          )}
        </section>

        {/* SIDEBAR — collapsed by default on mobile */}
        <aside
          className={`order-2 rounded-2xl border border-white/[0.06] bg-night-900/50 p-4 backdrop-blur-md md:order-1 md:block ${
            showSidebar ? "block" : "hidden"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-base italic text-ink-silver">unplaced stars</h2>
            <button
              onClick={handleNewDraft}
              className="text-xs uppercase tracking-[0.2em] text-ink-mist transition-colors hover:text-ink-gold"
            >
              + new
            </button>
          </div>

          <div className="thin-scroll max-h-[55svh] space-y-2 overflow-y-auto pr-1 md:max-h-[calc(100svh-260px)]">
            {drafts.length === 0 ? (
              <p className="font-serif text-sm italic text-ink-faded">no drifting stars yet.</p>
            ) : (
              drafts.map((p) => (
                <DraftStar
                  key={p.id}
                  poem={p}
                  active={p.id === activeId}
                  onSelect={() => {
                    setActiveId(p.id);
                    setShowSidebar(false);
                  }}
                  onDelete={() => {
                    deletePoem(p.id);
                    if (p.id === activeId) setActiveId(null);
                  }}
                />
              ))
            )}
          </div>

          <div className="mt-5 border-t border-white/5 pt-4">
            <button
              onClick={() => setShowPublishedList((s) => !s)}
              className="flex w-full items-center justify-between text-xs uppercase tracking-[0.25em] text-ink-mist hover:text-ink-silver"
            >
              <span>in the space · {published.length}</span>
              <span className="text-ink-faded">{showPublishedList ? "−" : "+"}</span>
            </button>
            <div
              className={`thin-scroll grid overflow-hidden pr-1 transition-[grid-template-rows] duration-300 ease-out ${
                showPublishedList ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 space-y-2 overflow-y-auto" style={{ maxHeight: "28svh" }}>
                {published.map((p) => {
                  const m = EMOTION_META[p.emotion];
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveId(p.id);
                        setShowSidebar(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-white/10 hover:bg-white/[0.02] ${
                        p.id === activeId ? "border-white/15 bg-white/[0.03]" : ""
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: m.color, boxShadow: `0 0 6px ${m.glow}` }}
                      />
                      <span className="truncate font-serif text-sm italic text-ink-silver">
                        {p.title.trim() || p.body.split("\n")[0]?.slice(0, 30) || "untitled"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Editor({
  poem,
  saveState,
  onChange,
  onPlace,
  onUnpublish,
  glowColor,
  accent,
}: {
  poem: Poem;
  saveState: SaveState;
  onChange: (p: Partial<Poem>) => void;
  onPlace: () => void;
  onUnpublish: () => void;
  glowColor: string;
  accent: string;
}) {
  const [title, setTitle] = useState(poem.title);
  const [body, setBody] = useState(poem.body);
  const [emotion, setEmotion] = useState<Emotion>(poem.emotion);

  useEffect(() => {
    setTitle(poem.title);
    setBody(poem.body);
    setEmotion(poem.emotion);
  }, [poem.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPublished = poem.publishedAt !== null;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="editor-enter" style={{ ["--glow" as string]: glowColor }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <EmotionPicker
          value={emotion}
          onChange={(e) => {
            setEmotion(e);
            onChange({ emotion: e });
          }}
        />
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-ink-faded">
          <SaveIndicator state={saveState} />
          {isPublished && (
            <span className="rounded-full border border-white/10 px-2 py-1 text-ink-gold">in the space</span>
          )}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onChange({ title: e.target.value });
        }}
        placeholder="title, or leave it bare"
        className="w-full border-0 bg-transparent font-serif text-2xl font-light italic leading-tight text-ink-silver placeholder:text-ink-faded focus:outline-none sm:text-3xl md:text-5xl"
      />

      <div className="mt-2 h-px w-24 rounded-full" style={{ background: accent, opacity: 0.4 }} />

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          onChange({ body: e.target.value });
        }}
        placeholder={"begin anywhere.\nthe space will hold the line breaks."}
        rows={12}
        className="poem-body mt-5 w-full resize-none border-0 bg-transparent text-ink-silver placeholder:font-serif placeholder:italic placeholder:text-ink-faded focus:outline-none sm:mt-8"
      />

      <div className="safe-bottom mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-ink-faded">
          {wordCount} word{wordCount === 1 ? "" : "s"}
          {poem.updatedAt ? ` · ${timeAgo(poem.updatedAt)}` : ""}
        </div>
        <div className="flex items-center gap-3">
          {isPublished ? (
            <button
              onClick={onUnpublish}
              className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-ink-mist transition-colors hover:border-white/25 hover:text-ink-silver sm:px-4 sm:text-xs sm:tracking-[0.25em]"
            >
              pull from space
            </button>
          ) : (
            <button
              type="button"
              disabled={!body.trim()}
              onClick={onPlace}
              className="group relative overflow-hidden rounded-full border border-white/20 px-5 py-2.5 text-[10px] uppercase tracking-[0.3em] text-ink-silver transition-all duration-200 hover:scale-[1.03] hover:border-white/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 sm:px-6 sm:text-xs"
              style={{ boxShadow: body.trim() ? `0 0 30px -8px ${glowColor}` : undefined }}
            >
              <span className="relative z-10">✦ place this star</span>
              <span
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)` }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return <span className="text-ink-faded">auto-saving</span>;
  if (state === "saving") return <span className="text-ink-mist">writing...</span>;
  return <span className="text-emo-drift">held</span>;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
