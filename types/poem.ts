// Visual tokens — the whole sky is gold now. Kept as exports so any future
// per-poem theming can swap one constant instead of hunting down hex codes.
export const STAR_COLOR = "#f4d58d";
export const STAR_GLOW = "rgba(244, 213, 141, 0.55)";

export const EMOTIONS = ["quiet", "longing", "fire", "drift", "anchor"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_META: Record<
  Emotion,
  { label: string; whisper: string; color: string; glow: string }
> = {
  quiet: {
    label: "quiet",
    whisper: "softly held",
    color: "#7dd3fc",
    glow: "rgba(125, 211, 252, 0.55)",
  },
  longing: {
    label: "longing",
    whisper: "reaching",
    color: "#c084fc",
    glow: "rgba(192, 132, 252, 0.55)",
  },
  fire: {
    label: "fire",
    whisper: "bright at the edge",
    color: "#fb923c",
    glow: "rgba(251, 146, 60, 0.55)",
  },
  drift: {
    label: "drift",
    whisper: "still moving",
    color: "#a7f3d0",
    glow: "rgba(167, 243, 208, 0.5)",
  },
  anchor: {
    label: "anchor",
    whisper: "staying",
    color: "#fcd34d",
    glow: "rgba(252, 211, 77, 0.5)",
  },
};

export interface Poem {
  id: string;
  title: string;
  body: string;
  emotion: Emotion;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  // Starmap position once published — kept stable so the sky doesn't reshuffle.
  x?: number;
  y?: number;
  depth?: number; // 0..1 for parallax layer
}

export interface Echo {
  id: string;
  poemId: string;
  text: string;
  createdAt: number;
  // Orbit position
  angle: number;
  radius: number;
}
