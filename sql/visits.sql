-- Visit log. Run this in the Supabase SQL Editor.
--
-- Deliberately coarse. This answers "how much is the sky being visited, and
-- what are people reading" — it is not built to identify or re-identify any
-- individual visitor. See app/api/visit/route.ts for what is and isn't stored.

create table if not exists visits (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  path text not null,
  -- 'load' (first paint) or 'reload'. Distinguishes a fresh arrival from
  -- someone refreshing the same page.
  kind text not null default 'load' check (kind in ('load', 'reload')),
  -- Coarse referrer host only ('instagram.com'), never the full URL, which
  -- can carry search terms and identifiers in its query string.
  referrer_host text,
  -- Bucketed device class parsed server-side: 'mobile' | 'tablet' | 'desktop'
  -- | 'bot' | 'unknown'. The raw User-Agent string is NOT stored: it is
  -- specific enough to act as a partial fingerprint.
  device text,
  -- Country from the CDN's geo header, when present. Country only — no city,
  -- no region, no coordinates.
  country text
  -- Intentionally absent: IP address, IP hash, session/visitor id, cookie,
  -- canvas or font fingerprint, screen metrics, timezone. Adding any of those
  -- turns an aggregate counter into per-person tracking of people reading
  -- poetry anonymously, which is a different feature with different consent
  -- obligations.
);

create index if not exists idx_visits_created_at on visits(created_at desc);

alter table visits enable row level security;

-- No policies granted to anon: the anon key can neither read nor write this
-- table. Inserts happen server-side in app/api/visit through DATABASE_URL,
-- which bypasses RLS. This keeps the log out of reach of the browser.
