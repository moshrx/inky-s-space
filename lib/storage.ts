import type { Poem, Echo } from "@/types/poem";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

export function emptyPoem(): Poem {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    body: "",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

// World box: roughly fits a default-zoom viewport so several clusters are
// visible without panning. Smaller = stars feel closer together.
const WORLD_HALF_W = 900;
const WORLD_HALF_H = 540;

// Each ISO week becomes a small cluster. Same-week poems land near each other
// (within ±CLUSTER_RADIUS world units of the week's center). Different weeks
// land in different parts of the sky.
const CLUSTER_RADIUS = 140;

// Stable 0..1 pseudo-random from a string. Uses two independent hashes so we
// can derive x, y, and depth without correlation.
function hash01(seed: string): { a: number; b: number; c: number } {
  let h1 = 2166136261;
  let h2 = 52711;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 + seed.charCodeAt(i), 2246822519);
  }
  return {
    a: ((h1 >>> 0) % 10000) / 10000,
    b: ((h2 >>> 0) % 10000) / 10000,
    c: (((h1 ^ h2) >>> 0) % 10000) / 10000,
  };
}

// Deterministic placement: cluster anchor from the week of publish, small
// offset from the poem id. Re-running with the same inputs returns the same
// coords, so the sky never reshuffles.
export function placeStar(
  id: string,
  publishedAt: number,
): { x: number; y: number; depth: number } {
  // 1. Anchor each ISO week somewhere in the world.
  const week = weekKey(publishedAt);
  const wk = hash01(week);
  const anchorX = (wk.a * 2 - 1) * (WORLD_HALF_W - CLUSTER_RADIUS);
  const anchorY = (wk.b * 2 - 1) * (WORLD_HALF_H - CLUSTER_RADIUS);

  // 2. Scatter the poem around the anchor (uniform disk via polar coords).
  const off = hash01(id);
  const r = Math.sqrt(off.a) * CLUSTER_RADIUS; // sqrt for uniform area
  const theta = off.b * Math.PI * 2;
  const x = anchorX + r * Math.cos(theta);
  const y = anchorY + r * Math.sin(theta);

  // 3. Depth still per-poem for parallax variety.
  const depth = 0.3 + off.c * 0.7;

  return { x, y, depth };
}

// Constellations: poems written in the same ISO week share lines.
export function weekKey(ts: number): string {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${d.getUTCFullYear()}-W${week}`;
}

// DB helpers: snake_case ↔ camelCase
export function dbToPoem(row: Record<string, unknown>): Poem {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    body: (row.body as string) ?? "",
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    publishedAt: row.published_at as number | null,
    x: row.x as number | undefined,
    y: row.y as number | undefined,
    depth: row.depth as number | undefined,
  };
}

export function poemToDb(poem: Poem): Record<string, unknown> {
  return {
    id: poem.id,
    title: poem.title,
    body: poem.body,
    created_at: poem.createdAt,
    updated_at: poem.updatedAt,
    published_at: poem.publishedAt,
    x: poem.x ?? null,
    y: poem.y ?? null,
    depth: poem.depth ?? null,
  };
}

export function dbToEcho(row: Record<string, unknown>): Echo {
  return {
    id: row.id as string,
    poemId: row.poem_id as string,
    text: row.text as string,
    createdAt: row.created_at as number,
    angle: row.angle as number,
    radius: row.radius as number,
  };
}

export function echoToDb(echo: Echo): Record<string, unknown> {
  return {
    id: echo.id,
    poem_id: echo.poemId,
    text: echo.text,
    created_at: echo.createdAt,
    angle: echo.angle,
    radius: echo.radius,
  };
}
