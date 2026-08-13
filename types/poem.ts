// Visual tokens — the whole space is gold. Kept as exports so any future
// per-poem theming can swap one constant instead of hunting down hex codes.
export const STAR_COLOR = "#f4d58d";
export const STAR_GLOW = "rgba(244, 213, 141, 0.55)";

// Size carries substance: how much was written, nudged up by how much came
// back. Both are compressed by log so one long poem can't dwarf the sky.
// Words own most of the range; echoes add a smaller top-up that still has
// somewhere to go once a poem is long.
const WORD_SHARE = 0.78;
const ECHO_SHARE = 0.22;
// Log bases. 220 words is a long poem for this space; 12 echoes is a lot.
const WORD_FULL = Math.log1p(220);
const ECHO_FULL = Math.log1p(12);

/**
 * 0..1 "heft" for a poem — drives star radius on the map.
 * `depth` stays reserved for parallax; it is no longer the size channel.
 */
export function starWeight(poem: Poem, echoCount = 0) {
  const words = poem.body.trim() ? poem.body.trim().split(/\s+/).length : 0;
  const fromWords = Math.min(1, Math.log1p(words) / WORD_FULL) * WORD_SHARE;
  const fromEchoes = Math.min(1, Math.log1p(echoCount) / ECHO_FULL) * ECHO_SHARE;
  return Math.min(1, fromWords + fromEchoes);
}

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
