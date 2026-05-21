// Visual tokens — the whole space is gold now. Kept as exports so any future
// per-poem theming can swap one constant instead of hunting down hex codes.
export const STAR_COLOR = "#f4d58d";
export const STAR_GLOW = "rgba(244, 213, 141, 0.55)";

export interface Poem {
  id: string;
  title: string;
  body: string;
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
