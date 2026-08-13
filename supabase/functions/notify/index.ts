/// <reference lib="deno.ns" />
// Supabase Edge Function — emails the site owner when a poem is placed or an
// echo arrives.
//
// Runs on Supabase, NOT in the Next.js app. Nothing here ships to the browser,
// which is why it can safely hold the Resend key. The app's client code is
// untouched by this feature.
//
// Wired to two Database Webhooks (see supabase/functions/notify/README.md):
//   - echoes  INSERT           → a reader responded
//   - poems   UPDATE           → filtered here to "just published"
//
// Deno runtime. Deploy with:
//   supabase functions deploy notify --no-verify-jwt
//
// Required secrets:
//   RESEND_API_KEY   Resend API key
//   NOTIFY_TO        recipient address
//   NOTIFY_FROM      verified sender, e.g. "Inky's Space <inky@yourdomain.com>"
//   WEBHOOK_SECRET   shared secret; must match the webhook's x-webhook-secret header

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SITE_URL = "https://inky-s-space.vercel.app";

// Echo bodies are capped at 240 chars client-side, but the table is open to
// the anon key — anyone can POST a row directly. Clamp before it reaches an
// inbox so a spam insert can't mail us a megabyte.
const MAX_ECHO_CHARS = 500;
const MAX_TITLE_CHARS = 120;
const MAX_BODY_CHARS = 2000;

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(v: unknown, max: number) {
  const s = typeof v === "string" ? v : "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** First non-empty line, for when a poem has no title. */
function firstLine(body: string) {
  return body.split("\n").find((l) => l.trim()) || "untitled";
}

function wrap(heading: string, sub: string, quote: string, cta: string) {
  // Inline styles only — email clients strip <style> blocks. Colours mirror
  // the site so the mail feels like it came from the same place.
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#03050d;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:520px;margin:0 auto;background:#070a18;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#5b6488;margin-bottom:14px;">${esc(sub)}</div>
    <div style="font-size:22px;font-style:italic;color:#f4d58d;margin-bottom:18px;">${esc(heading)}</div>
    <div style="border-left:2px solid rgba(244,213,141,0.35);padding-left:14px;color:#e8edf7;font-size:15px;line-height:1.65;white-space:pre-wrap;">${esc(quote)}</div>
    <a href="${SITE_URL}/space" style="display:inline-block;margin-top:24px;padding:10px 20px;border:1px solid rgba(255,255,255,0.2);border-radius:999px;color:#e8edf7;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${esc(cta)}</a>
  </div>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  // The function is deployed with --no-verify-jwt so Supabase's webhook can
  // reach it, which means this shared secret is the only thing standing
  // between the internet and our inbox.
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-webhook-secret") !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const rec = payload.record;
  if (!rec) return new Response("ignored: no record", { status: 200 });

  let subject: string;
  let html: string;

  if (payload.table === "echoes" && payload.type === "INSERT") {
    const text = clamp(rec.text, MAX_ECHO_CHARS);
    if (!text.trim()) return new Response("ignored: empty echo", { status: 200 });

    subject = "an echo came back";
    html = wrap("someone answered a poem", "new echo", text, "open the space");
  } else if (payload.table === "poems") {
    const before = payload.old_record?.published_at ?? null;
    const after = rec.published_at ?? null;

    // Only the moment a poem goes up. Ignores drafts, autosave keystrokes
    // (which UPDATE on every edit), and un-publishing.
    if (!(before === null && after !== null)) {
      return new Response("ignored: not a publish", { status: 200 });
    }

    const body = clamp(rec.body, MAX_BODY_CHARS);
    const title = clamp(rec.title, MAX_TITLE_CHARS).trim() || firstLine(body);

    subject = `a new star: ${title}`;
    html = wrap(title, "poem placed", body, "see it in the sky");
  } else {
    return new Response("ignored", { status: 200 });
  }

  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("NOTIFY_TO");
  const from = Deno.env.get("NOTIFY_FROM");
  if (!key || !to || !from) {
    console.error("missing RESEND_API_KEY / NOTIFY_TO / NOTIFY_FROM");
    return new Response("not configured", { status: 500 });
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    // Log and return 200 anyway: a non-2xx makes Supabase retry, and a bad
    // address or quota error would retry forever. The insert already
    // succeeded — a failed email must never look like a failed write.
    console.error("resend failed", res.status, await res.text());
    return new Response("email failed, logged", { status: 200 });
  }

  return new Response("sent", { status: 200 });
});
