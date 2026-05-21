"use client";

import { EMOTIONS, EMOTION_META, type Emotion } from "@/types/poem";

interface Props {
  value: Emotion;
  onChange: (emotion: Emotion) => void;
}

export default function EmotionPicker({ value, onChange }: Props) {
  return (
    <div className="thin-scroll flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.02] p-1">
      {EMOTIONS.map((emotion) => {
        const meta = EMOTION_META[emotion];
        const active = value === emotion;
        return (
          <button
            key={emotion}
            type="button"
            onClick={() => onChange(emotion)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors sm:px-3 sm:text-xs ${
              active
                ? "bg-white/10 text-ink-silver"
                : "text-ink-mist hover:bg-white/5 hover:text-ink-silver"
            }`}
            aria-pressed={active}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: meta.color,
                boxShadow: active ? `0 0 8px ${meta.glow}` : undefined,
              }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
