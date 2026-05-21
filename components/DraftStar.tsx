"use client";

import { STAR_COLOR, STAR_GLOW, type Poem } from "@/types/poem";

interface Props {
  poem: Poem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

// Float offsets cycle so each star drifts on its own rhythm but we don't
// need per-star JS — pure CSS animation, varied by id char modulo.
const FLOAT_VARIANTS = ["float-a", "float-b", "float-c", "float-d"] as const;

export default function DraftStar({ poem, active, onSelect, onDelete }: Props) {
  const preview =
    poem.title.trim() ||
    poem.body.split("\n").find((l) => l.trim().length > 0)?.slice(0, 38) ||
    "untitled";
  const wordCount = poem.body.trim() ? poem.body.trim().split(/\s+/).length : 0;
  const variant = FLOAT_VARIANTS[poem.id.charCodeAt(0) % FLOAT_VARIANTS.length];

  return (
    <div
      onClick={onSelect}
      className={`group draft-enter relative cursor-pointer rounded-xl border px-3 py-2.5 transition-colors duration-200 ${
        active
          ? "border-white/25 bg-white/[0.04]"
          : "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1.5 flex-shrink-0 ${variant}`}>
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: STAR_COLOR,
              boxShadow: `0 0 10px ${STAR_GLOW}, 0 0 2px ${STAR_COLOR}`,
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-base italic text-ink-silver">{preview}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-faded">
            {wordCount} word{wordCount === 1 ? "" : "s"}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 focus:opacity-60"
          aria-label="Delete draft"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
