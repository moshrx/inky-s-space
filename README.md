# Inky's Night

A small sky for poems. A two-room poetry portfolio:

- **`/inky`** — the writing room. Dark canvas, minimal editor, drafts float as "unplaced stars" in the sidebar. Tag each poem with an emotion. Press **Place this star** to publish it into the public sky.
- **`/stars`** — the public night sky. A pannable, zoomable starmap where every poem is a star, color-coded by emotion. Click a star to read. Leave **echoes** — small comments that orbit the poem like moons. Poems written in the same week are joined by faint constellation lines. The newest poem glows brighter for 24 hours as **Tonight's Sky**. **Random Star** sends you flying to a poem you haven't found yet.

No likes. No counts. No metrics. Just the sky and what people leave in it.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Tech

- Next.js 14 (App Router)
- Framer Motion
- Tailwind
- SVG starmap with pointer-event pan/zoom and a canvas starfield background
- LocalStorage for persistence (the `lib/usePoems` hook is the only storage seam — swap it for Supabase later without touching the rest of the app)

## Files of note

- `app/page.tsx` — the door, two portals
- `app/inky/page.tsx` — writing room
- `app/stars/page.tsx` — the sky
- `components/Starmap.tsx` — the interactive starmap (pan/zoom, twinkle, constellations, fly-to)
- `components/Starfield.tsx` — the breathing background (always-on, has shooting stars)
- `components/PoemModal.tsx` — open-poem view with orbiting echoes
- `lib/usePoems.ts` — single source of truth for poems & echoes
- `types/poem.ts` — emotion meta lives here (color, glow, whisper line)
