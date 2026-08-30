import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// What this route stores, and what it deliberately does not.
//
// Stores: path, load-vs-reload, referrer *host*, a bucketed device class,
// country, and a per-day pseudonymous visitor id.
//
// Does not store: the raw IP or the raw User-Agent string. The visitor id is
// an HMAC of both under a salt that rotates daily and is never persisted next
// to the hash, so it identifies a visitor *within* a day and becomes an
// unrelated value the next day. Same-person-across-months is deliberately not
// answerable: people leave echoes here anonymously, and a permanent id would
// let any future reader of this table tie an echo to a returning device.
//
// Failures are swallowed. A logging problem must never break the sky.

function deviceClass(ua: string): string {
  const s = ua.toLowerCase();
  if (!s) return "unknown";
  if (/bot|crawl|spider|slurp|preview|fetch|monitor|headless/.test(s)) return "bot";
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(s)) return "mobile";
  return "desktop";
}

// Days are reckoned in the site owner's timezone so that "a day" in the
// dashboard means a day as they actually lived it.
const SITE_TZ = "America/Halifax";

// The daily salt. Held in memory only, regenerated when the UTC day rolls
// over, and never written to the database. A serverless cold start makes a
// fresh salt, which splits one visitor into two ids for that day — an
// undercount of returning visitors, which is the direction we want to err.
// Set VISIT_SALT_SECRET to make ids stable across instances within a day.
let saltDay = "";
let saltValue = "";

function dailySalt(): string {
  // Halifax, not UTC: the salt boundary is also the boundary at which a
  // visitor gets a new id, so rolling it at 21:00 local would split an
  // ordinary evening reader into two "people". en-CA gives YYYY-MM-DD.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: SITE_TZ });
  if (today !== saltDay) {
    saltDay = today;
    saltValue =
      process.env.VISIT_SALT_SECRET
        ? createHmac("sha256", process.env.VISIT_SALT_SECRET).update(today).digest("hex")
        : randomBytes(32).toString("hex");
  }
  return saltValue;
}

// Pseudonymous, per-day. Truncated to 128 bits: still collision-free at this
// scale, and shorter to eyeball in the dashboard.
function visitorHash(ip: string, ua: string): string | null {
  if (!ip) return null;
  return createHmac("sha256", dailySalt()).update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}

// Trust order matters: x-forwarded-for is client-settable unless a proxy
// overwrites it. On Vercel x-real-ip is set by the platform, so prefer it.
function clientIp(h: Headers): string {
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}

// Full referrer URLs leak search queries and campaign identifiers. The host
// alone still answers "where did they come from".
function referrerHost(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "").slice(0, 120) || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Honour Do Not Track / Global Privacy Control. Both are an explicit
    // statement from the visitor that they don't want to be counted, and the
    // cost of respecting them is a slightly lower number on a personal site.
    const h = request.headers;
    if (h.get("dnt") === "1" || h.get("sec-gpc") === "1") {
      return NextResponse.json({ ok: true });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty or malformed beacon body: still worth counting as a bare visit.
    }

    const path =
      typeof body.path === "string" && body.path.startsWith("/")
        ? body.path.slice(0, 200)
        : "/";
    const kind = body.kind === "reload" ? "reload" : "load";

    const ua = h.get("user-agent") ?? "";

    await query(
      `insert into visits (path, kind, referrer_host, device, country, visitor_hash)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        path,
        kind,
        referrerHost(typeof body.referrer === "string" ? body.referrer : ""),
        deviceClass(ua),
        // Vercel sets x-vercel-ip-country; the header is absent locally.
        h.get("x-vercel-ip-country")?.slice(0, 2) ?? null,
        visitorHash(clientIp(h), ua),
      ],
    );
  } catch (err) {
    console.error("POST /api/visit failed:", err);
  }

  // Always 200, always empty. The client neither waits for nor reacts to this.
  return NextResponse.json({ ok: true });
}
