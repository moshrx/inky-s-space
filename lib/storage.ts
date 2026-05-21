import type { Poem, Echo, Emotion } from "@/types/poem";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

export function emptyPoem(emotion: Emotion = "quiet"): Poem {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    body: "",
    emotion,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

// Deterministic-ish placement on the celestial canvas. We generate (x,y) once
// at publish time and freeze it on the poem, so the sky doesn't reshuffle.
export function placeStar(seed: string): { x: number; y: number; depth: number } {
  let h1 = 2166136261;
  let h2 = 52711;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 + seed.charCodeAt(i), 2246822519);
  }
  const r1 = ((h1 >>> 0) % 10000) / 10000;
  const r2 = ((h2 >>> 0) % 10000) / 10000;
  const r3 = (((h1 ^ h2) >>> 0) % 10000) / 10000;

  const x = (r1 * 2 - 1) * 1500;
  const y = (r2 * 2 - 1) * 900;
  const depth = 0.3 + r3 * 0.7;
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
    emotion: (row.emotion as Emotion) ?? "quiet",
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
    emotion: poem.emotion,
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
