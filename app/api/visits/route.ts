import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// All dates shown to the reader are in this zone, matching the day boundary
// the visitor ids rotate on (see app/api/visit/route.ts). The database stores
// timestamptz in UTC; only presentation is converted. Constant, never user
// input, so interpolating it into SQL is safe.
const SITE_TZ = "America/Halifax";

// Read side of the visit log. Gated by STATS_PASSWORD, which is checked here
// on the server — unlike the /inky lock, whose password is compiled into the
// client bundle and is therefore readable by anyone who opens devtools. That
// is an accepted trade-off for the writing UI; it is not an acceptable one
// for visitor data, so this route does its own check.

function authorized(request: Request): boolean {
  const expected = process.env.STATS_PASSWORD;
  // No password configured = closed, not open. Failing open here would expose
  // the whole log on any deploy that forgot the env var.
  if (!expected) return false;

  const given = request.headers.get("x-stats-password") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Compare in constant time; bail on length first since timingSafeEqual
  // throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Bots and non-Malaysian traffic are excluded everywhere below: this admin
    // view is scoped to Malaysian visits only.
    const visitFilter = "device <> 'bot' and country = 'MY'";
    const [totals, daily, paths, referrers, devices, countries, visitors] =
      await Promise.all([
        query(`select
                 count(*)::int as views,
                 count(distinct visitor_hash)::int as visitors,
                 count(*) filter (where kind = 'reload')::int as reloads,
                 count(*) filter (where created_at > now() - interval '24 hours')::int as views_24h,
                 count(distinct visitor_hash) filter (where created_at > now() - interval '24 hours')::int as visitors_24h
               from visits where ${visitFilter}`),

        query(`select to_char(created_at at time zone '${SITE_TZ}', 'YYYY-MM-DD') as day,
                 count(*)::int as views,
                 count(distinct visitor_hash)::int as visitors
               from visits
               where ${visitFilter} and created_at > now() - interval '30 days'
               group by day order by day desc`),

        query(`select path,
                 count(*)::int as views,
                 count(distinct visitor_hash)::int as visitors
               from visits where ${visitFilter}
               group by path order by views desc limit 20`),

        query(`select coalesce(referrer_host, 'direct') as source,
                 count(*)::int as views
               from visits where ${visitFilter}
               group by source order by views desc limit 20`),

        query(`select device, count(*)::int as views
               from visits where ${visitFilter}
               group by device order by views desc`),

        query(`select coalesce(country, 'unknown') as country,
                 count(*)::int as views
               from visits where ${visitFilter}
               group by country order by views desc limit 20`),

        // Raw visit log: keep repeated visits from the same device visible.
        query(`select
                 to_char(created_at at time zone '${SITE_TZ}', 'YYYY-MM-DD HH24:MI:SS') as seen_at,
                 left(coalesce(visitor_hash, ''), 8) as id,
                 path,
                 kind,
                 coalesce(referrer_host, 'direct') as source,
                 device,
                 coalesce(country, '') as country
               from visits
               where ${visitFilter}
               order by created_at desc
               limit 500`),
      ]);

    return NextResponse.json({
      totals: totals[0] ?? {},
      daily,
      paths,
      referrers,
      devices,
      countries,
      visitors,
    });
  } catch (err) {
    console.error("GET /api/visits failed:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
