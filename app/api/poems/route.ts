import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Never cache: the sky must reflect what was just written.
export const dynamic = "force-dynamic";

const COLUMNS = "id, title, body, created_at, updated_at, published_at, x, y, depth";

// Parse the body and check the fields the SQL can't default. Without this a
// missing id or malformed JSON reaches Postgres and surfaces as a 500, which
// reads as "the server broke" when the request was simply wrong.
async function readPoem(request: Request) {
  let p: Record<string, unknown>;
  try {
    p = await request.json();
  } catch {
    return { error: "Invalid JSON body" };
  }
  if (typeof p?.id !== "string" || !p.id) return { error: "id is required" };
  if (typeof p.created_at !== "number" || typeof p.updated_at !== "number") {
    return { error: "created_at and updated_at must be numbers" };
  }
  return { poem: p };
}

// Same column order as COLUMNS, for both insert and update.
function poemValues(p: Record<string, unknown>) {
  return [
    p.id,
    p.title ?? "",
    p.body ?? "",
    p.created_at,
    p.updated_at,
    p.published_at ?? null,
    p.x ?? null,
    p.y ?? null,
    p.depth ?? null,
  ];
}

export async function GET() {
  try {
    const [poems, echoes] = await Promise.all([
      query(`select ${COLUMNS} from poems order by created_at desc`),
      query(
        "select id, poem_id, text, created_at, angle, radius from echoes order by created_at desc",
      ),
    ]);
    return NextResponse.json({ poems, echoes });
  } catch (err) {
    console.error("GET /api/poems failed:", err);
    return NextResponse.json({ error: "Failed to load poems" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = await readPoem(request);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await query(
      `insert into poems (${COLUMNS})
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      poemValues(parsed.poem!),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 23505 = unique_violation: this id already exists, a client error.
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "Poem already exists" }, { status: 409 });
    }
    console.error("POST /api/poems failed:", err);
    return NextResponse.json({ error: "Failed to create poem" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const parsed = await readPoem(request);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    // `returning id` lets us tell "updated" from "matched nothing" — without it
    // editing a deleted poem reports success and the change is silently lost.
    const rows = await query(
      `update poems
         set title = $2, body = $3, created_at = $4, updated_at = $5,
             published_at = $6, x = $7, y = $8, depth = $9
       where id = $1
       returning id`,
      poemValues(parsed.poem!),
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Poem not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/poems failed:", err);
    return NextResponse.json({ error: "Failed to update poem" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    // echoes cascade via FK
    await query("delete from poems where id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/poems failed:", err);
    return NextResponse.json({ error: "Failed to delete poem" }, { status: 500 });
  }
}
