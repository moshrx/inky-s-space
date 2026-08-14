import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let e: Record<string, unknown>;
  try {
    e = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof e?.id !== "string" || !e.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (typeof e.poem_id !== "string" || !e.poem_id) {
    return NextResponse.json({ error: "poem_id is required" }, { status: 400 });
  }
  // Mirrors the client-side cap in usePoems.addEcho, since the route is
  // reachable without going through the UI.
  const text = typeof e.text === "string" ? e.text.trim().slice(0, 240) : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    await query(
      `insert into echoes (id, poem_id, text, created_at, angle, radius)
       values ($1, $2, $3, $4, $5, $6)`,
      [e.id, e.poem_id, text, e.created_at ?? Date.now(), e.angle ?? 0, e.radius ?? 50],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // 23503 = foreign_key_violation: the poem does not exist.
    if (code === "23503") {
      return NextResponse.json({ error: "Poem not found" }, { status: 404 });
    }
    if (code === "23505") {
      return NextResponse.json({ error: "Echo already exists" }, { status: 409 });
    }
    console.error("POST /api/echoes failed:", err);
    return NextResponse.json({ error: "Failed to add echo" }, { status: 500 });
  }
}
