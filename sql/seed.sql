-- Run this ONCE in the Supabase SQL Editor after schema.sql,
-- to populate the sky with sample poems and echoes.

-- Poems
insert into poems (id, title, body, emotion, created_at, updated_at, published_at, x, y, depth) values
  ('SEED-SMALLHRS', 'Small Hours',
   'I keep a room
for the things I cannot say —
the lamp left on,
the chair pulled back,
a window the wind
forgets to close.',
   'quiet',
   extract(epoch from now() - interval '0 days')::bigint * 1000,
   extract(epoch from now() - interval '0 days')::bigint * 1000,
   extract(epoch from now() - interval '0 days')::bigint * 1000,
   -820, -340, 0.78),

  ('SEED-TIDEKNWS', 'What the Tide Knows',
   'I asked the sea
where it kept its grief.
It answered
by returning —
again, and again,
and again.',
   'drift',
   extract(epoch from now() - interval '2 days')::bigint * 1000,
   extract(epoch from now() - interval '2 days')::bigint * 1000,
   extract(epoch from now() - interval '2 days')::bigint * 1000,
   640, 410, 0.62),

  ('SEED-MATCH', 'Match',
   'Strike me
against whatever is left
of your tenderness —
let us see
which of us
burns first.',
   'fire',
   extract(epoch from now() - interval '4 days')::bigint * 1000,
   extract(epoch from now() - interval '4 days')::bigint * 1000,
   extract(epoch from now() - interval '4 days')::bigint * 1000,
   -310, 580, 0.85),

  ('SEED-AFTRCALL', 'After the Call',
   'Your voice,
still warm
in the shape of my ear,
like a coat
the room forgot
to take off.',
   'longing',
   extract(epoch from now() - interval '6 days')::bigint * 1000,
   extract(epoch from now() - interval '6 days')::bigint * 1000,
   extract(epoch from now() - interval '6 days')::bigint * 1000,
   1080, -180, 0.48),

  ('SEED-ANCHOR', 'The Anchor Speaks',
   'I do not move
because you needed
something
that would not.',
   'anchor',
   extract(epoch from now() - interval '8 days')::bigint * 1000,
   extract(epoch from now() - interval '8 days')::bigint * 1000,
   extract(epoch from now() - interval '8 days')::bigint * 1000,
   220, -720, 0.92);

-- Echoes
insert into echoes (id, poem_id, text, created_at, angle, radius) values
  ('SEED-E1', 'SEED-SMALLHRS', 'I read this twice. the second time, slower.',
   extract(epoch from now())::bigint * 1000 - 3600000, 1.2, 48),
  ('SEED-E2', 'SEED-SMALLHRS', 'the lamp left on — oh.',
   extract(epoch from now())::bigint * 1000 - 7200000, 3.1, 55),
  ('SEED-E3', 'SEED-TIDEKNWS', 'again and again and again 🌊',
   extract(epoch from now())::bigint * 1000 - 9600000, 0.4, 42),
  ('SEED-E4', 'SEED-MATCH', 'this one stings in the best way',
   extract(epoch from now())::bigint * 1000 - 14400000, 4.8, 60),
  ('SEED-E5', 'SEED-AFTRCALL', 'the coat the room forgot. i''m gonna think about that all night',
   extract(epoch from now())::bigint * 1000 - 18000000, 2.6, 52);
