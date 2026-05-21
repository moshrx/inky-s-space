-- Migration: drop the `emotion` column from poems.
-- Run once in Supabase SQL Editor after deploying the no-emotions client.

alter table poems
  drop column if exists emotion;

-- Verify
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'poems'
order by ordinal_position;
