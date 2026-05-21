-- Run this in the Supabase SQL Editor.
-- Drop the old tables first if you ran an earlier version of this schema.

drop table if exists echoes;
drop table if exists poems;

-- Poems table — no user_id, no auth dependency.
-- The /inky password lock controls who can write through the UI; RLS is
-- intentionally permissive because this is a single-author personal site
-- and you accepted the client-side-only protection trade-off.
create table poems (
  id text primary key,
  title text not null default '',
  body text not null default '',
  emotion text not null check (emotion in ('longing', 'quiet', 'fire', 'drift', 'anchor')),
  created_at bigint not null,
  updated_at bigint not null,
  published_at bigint,
  x double precision,
  y double precision,
  depth double precision
);

-- Echoes — visitor comments. Anonymous, no user_id.
create table echoes (
  id text primary key,
  poem_id text references poems(id) on delete cascade not null,
  text text not null,
  created_at bigint not null,
  angle double precision not null,
  radius double precision not null
);

-- Indexes
create index idx_poems_published_at on poems(published_at);
create index idx_echoes_poem_id on echoes(poem_id);

-- Enable RLS AFTER tables exist
alter table poems enable row level security;
alter table echoes enable row level security;

-- POEMS policies
-- Public can read published poems
create policy "anyone reads published poems"
  on poems for select
  using (published_at is not null);

-- The anon key can also read drafts — needed because the /inky UI reads
-- everything (drafts + published) for the same author. The password lock
-- on the UI is what restricts this; the database is open.
create policy "anon reads drafts"
  on poems for select
  using (true);

-- Writes are open to the anon key. The UI password lock guards this.
create policy "anon writes poems"
  on poems for insert
  with check (true);

create policy "anon updates poems"
  on poems for update
  using (true);

create policy "anon deletes poems"
  on poems for delete
  using (true);

-- ECHOES policies — fully open: anyone reads, anyone writes
create policy "anyone reads echoes"
  on echoes for select
  using (true);

create policy "anyone writes echoes"
  on echoes for insert
  with check (true);

create policy "anyone deletes echoes"
  on echoes for delete
  using (true);
