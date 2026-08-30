-- Adds per-visitor identification to the visit log.
-- Run after sql/visits.sql, in the Supabase SQL Editor.

-- A per-day, per-visitor pseudonymous id: HMAC(daily_salt, ip + user-agent).
-- The salt rotates every day and is never stored alongside the hash, so the
-- value cannot be reversed into an IP, and the same person on two different
-- days produces two unrelated ids. That is the deliberate limit: it answers
-- "how many distinct people came today, and what did each of them read",
-- and it cannot answer "is this the same person who visited last month".
alter table visits add column if not exists visitor_hash text;

-- Day rollups are served by idx_visits_created_at (from visits.sql) combined
-- with this one; date_trunc on timestamptz is not IMMUTABLE, so it cannot be
-- indexed directly.
create index if not exists idx_visits_visitor_hash on visits(visitor_hash);
