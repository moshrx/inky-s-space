// Visual tokens — the whole sky is gold now. Kept as exports so any future
// per-poem theming can swap one constant instead of hunting down hex codes.
export const STAR_COLOR = "#f4d58d";
export const STAR_GLOW = "rgba(244, 213, 141, 0.55)";

export type Emotion = "longing" | "quiet" | "fire" | "drift" | "anchor";

export const EMOTIONS: Emotion[] = ["longing", "quiet", "fire", "drift", "anchor"];

export const EMOTION_META: Record<
  Emotion,
  { color: string; glow: string; label: string; whisper: string }
> = {
  longing: { color: "#c084fc", glow: "rgba(192, 132, 252, 0.55)", label: "longing", whisper: "a soft ache" },
  quiet: { color: "#7dd3fc", glow: "rgba(125, 211, 252, 0.55)", label: "quiet", whisper: "still water" },
  fire: { color: "#fb923c", glow: "rgba(251, 146, 60, 0.55)", label: "fire", whisper: "bright hunger" },
  drift: { color: "#a7f3d0", glow: "rgba(167, 243, 208, 0.55)", label: "drift", whisper: "let go" },
  anchor: { color: "#fcd34d", glow: "rgba(252, 211, 77, 0.55)", label: "anchor", whisper: "hold fast" },
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
