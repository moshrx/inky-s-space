-- Database Webhooks for the `notify` edge function.
--
-- The dashboard's "Database Webhooks" UI is just a wrapper around pg_net +
-- triggers; this does the same thing directly, which is handy because the
-- Webhooks page keeps moving between dashboard versions.
--
-- Run once in the Supabase SQL Editor. Safe to re-run: the drops make it
-- idempotent.
--
-- BEFORE RUNNING: replace YOUR_WEBHOOK_SECRET below with the value of the
-- WEBHOOK_SECRET function secret. It is deliberately not committed — this repo
-- is public, and that secret is the only thing guarding the function endpoint.
-- Retrieve it from your own records, or rotate with:
--   supabase secrets set WEBHOOK_SECRET="$(openssl rand -hex 24)"
-- and update both triggers below to match.

-- pg_net powers the outbound HTTP call. Enabling it is what the dashboard's
-- "Enable webhooks" button does.
create extension if not exists pg_net with schema extensions;

-- Re-running should not stack duplicate triggers (which would mean duplicate
-- emails), so clear any previous version first.
drop trigger if exists notify_echo on echoes;
drop trigger if exists notify_poem on poems;

-- INSERT on echoes  → a reader left an echo
create trigger notify_echo
  after insert on echoes
  for each row
  execute function supabase_functions.http_request(
    'https://cnkmlqaazxozwtjfhqgb.supabase.co/functions/v1/notify',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"YOUR_WEBHOOK_SECRET"}',
    '{}',
    '5000'
  );

-- UPDATE on poems → the function itself filters to the single
-- published_at null → timestamp transition, so autosave keystrokes and
-- post-publish edits do not send mail. Deliberately NOT "after insert":
-- every poem is created as a draft, so an insert is never a publish.
create trigger notify_poem
  after update on poems
  for each row
  execute function supabase_functions.http_request(
    'https://cnkmlqaazxozwtjfhqgb.supabase.co/functions/v1/notify',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"YOUR_WEBHOOK_SECRET"}',
    '{}',
    '5000'
  );

-- Verify: expect exactly two rows, notify_echo and notify_poem.
select
  trigger_name,
  event_object_table as table_name,
  event_manipulation as event
from information_schema.triggers
where trigger_name in ('notify_echo', 'notify_poem')
order by trigger_name;
