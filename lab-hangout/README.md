# Lab Hangout

A multiplayer pixel hangout. Pick a colour, a hat and an outfit for your little lab critter
(or Clawd), then walk around **the Lab**, **the Square**, **the Cinema** and **the Dev Den**, chat in speech
bubbles and emote with everyone else who's online.

Eight rooms: **the Lab**, **the Square**, **the Cinema**, **the Dev Den**, **the Rooftop Garden**,
**the Crypt**, **the Stage** and **the Pier**. Things to do: sit on sofas, benches, cinema seats
and hammocks; get coffee, popcorn, soda and marshmallows (roast them on the bonfire); draw on
the Lab's shared whiteboard; play SLOP INVADERS on the arcade cabinet; change the jukebox
track for the whole room; dance, plonk down on the floor or pick from the emote wheel; feed
the pigeons; watch the film (two films, everyone sees the same frame); take a photo-booth
strip and save it; play musical chairs and tag; throw coffee at the slop invasion; find
constellations and light fireworks on the roof; push stone blocks to open the Crypt (there's
a crown in it); jam on keys, drums, bass and mic at the Stage; go fishing off the Pier.
Click the HERE/ONLINE pill to see who's online in every room and join them. Upstairs in the Dev Den:
code at a desk (a typing game that makes commits), break the build and fix it at the server
rack, hit DEPLOY, move notes on the kanban board, talk to the rubber duck, and work along
with the shared pomodoro while it rains. NPCs (Prof. Fizz, Gus, the
Usher, Sage, Fern, DJ Spin, Old Salt) go about their day, and the Square, roof and pier turn
from night to day every 20 minutes.

Built with Vite + TypeScript + Canvas 2D, plus Supabase Realtime for multiplayer. Every
pixel is drawn in code, with no image files.

## Quick start (no server needed)

```bash
npm install
npm run dev
```

The page opens at http://localhost:5173 in **LOCAL mode**:
- Open a second tab and the two tabs see each other.
- Add `?bots=5` to the URL to fill the room with wandering demo critters.

## Controls

| | Desktop | Phone |
|---|---|---|
| Walk | WASD / arrow keys, or click the floor | tap the floor |
| Go through a door | walk up into it, or click it | tap the door |
| Chat | Enter, type, Enter | tap the chat bar |
| Use things (sit, coffee, popcorn, arcade, whiteboard, jukebox, photo booth, talk to NPCs, feed pigeons) | walk up and press E, or click it | tap it |
| Sip / eat what you're holding | Q | SIP / EAT button |
| Emote | 1 wave · 2 hop · 3 yay · 4 huh? · 5 idea | emote buttons |
| Dance / sit on the floor (until you move) | 6 / 7 | DANCE / SIT buttons |
| Emote wheel (8 more emotes) | R, then 1-8 | MORE button |
| Play an instrument at the Stage | 1-8 while at it | pads |
| Push a stone block (Crypt) | walk into it | walk into it |
| Arcade | ←/→ move, Space fire, Esc quit | ◀ FIRE ▶ buttons |
| Change your look | **Look** button | **Look** button |

## Going online with Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run `supabase/migrations/0001_profiles.sql`.
   This creates the `profiles` table with row-level security.
3. **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins**.
4. **Project Settings → API**: copy the Project URL and the anon (or "publishable") key.
5. `cp .env.example .env.local` and fill in both values. Never use the service_role/secret key.
6. Restart `npm run dev`. The start screen should say **ONLINE · connected to Supabase**.
   Open it in two different browsers to check.

What happens under the hood:
- **Anonymous auth** gives each visitor an id.
- **Presence** tracks who's in each room.
- **Broadcast** carries movement (about 9 updates a second while walking, plus what you're
  using/holding), chat, emotes, whiteboard strokes and small room state (jukebox, high score).
- **Postgres** stores only your name and look.

Each broadcast is delivered to everyone in the room, so message volume grows fast with
crowd size. Check your plan's Realtime quotas before sharing it widely.

## Security setup (invite-only world)

Run these in the Supabase **SQL Editor**, in order (all safe to re-run):
1. `supabase/migrations/0001_profiles.sql`
2. `supabase/migrations/0002_security.sql`: members, private channels, server-side chat with
   filter + rate limits, reports, auto-mute, bans
3. `supabase/migrations/0003_tokens.sql`: server-owned tokens (coins + daily bonus)

Then:
- Set the invite code: `select public.set_invite_code('something-long-and-secret');`
  Share it with testers; they type it once on the start screen.
- **Realtime → Settings**: switch OFF **Allow public access** (only private channels work now).
- Optional CAPTCHA: create a Turnstile widget in Cloudflare (add `localhost` and your Vercel
  domain), put the **site key** in `VITE_TURNSTILE_SITE_KEY` and the **secret key** in Supabase
  **Auth → Attack Protection → CAPTCHA**. Turn both on together: with CAPTCHA on in Supabase but
  no site key in the app, new visitors can't sign in.

Moderation, from the SQL editor:
- Reports: `select * from private.reports order by at desc;` (includes the player's last chat lines)
- Ban / unban: `select public.ban_player('<user id>', 'reason');` / `select public.unban_player('<user id>');`
- Add a filtered word: `insert into private.banned_words values ('regex');`
- Chat log: `select * from private.chat_log order by at desc limit 100;`
- Public launch: `select public.set_world_open(true);` lets everyone in without a code.

## Deploying

This is a static site. `npm run build` outputs `dist/`. On **Vercel**: import the repo, set the root
directory to `lab-hangout` (framework preset: Vite), and add `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` (and `VITE_TURNSTILE_SITE_KEY`) as environment variables. The invite
code keeps the world private, whatever Vercel plan you're on. Before going public, read "Known limitations" in `CLAUDE.md`
(private channels, CAPTCHA on sign-in, moderation).

## Roadmap

See `docs/ROADMAP.md`.

## Project layout

See `CLAUDE.md` for the full map, the networking contract and conventions. See
`docs/ART_STYLE.md` for the rules that keep the pixel-art look consistent. Both are written
so you can hand the project to Claude Code in VS Code and keep building.

## Status

- Tested in a browser in LOCAL mode:
  - moving between rooms
  - two-tab multiplayer: join, leave, chat and emotes
  - bots
  - the mobile layout
- The SQL and its RLS policies were checked against Postgres.
- The Supabase transport is typechecked against `@supabase/supabase-js` v2, and the
  fallback to LOCAL mode works when Supabase can't be reached.
- Not yet run against a live Supabase project. Follow the steps above and test it with two
  browsers first.

## Credits

- The rendering approach, palette, lab and city-square sets, and the voxel creations are
  adapted from the pixel-art film "Claw'd Labs, Part 0" by its original creator. Ask them
  for permission before you publish this publicly, and credit them.
- The default player character (the lab critter) is an original design for this project.
- The optional **Clawd** body is Anthropic's mascot, included deliberately for private use.
  It's Anthropic's IP: before publishing this publicly, get written permission from
  Anthropic or remove that option. The project uses no Anthropic logos or wordmarks.
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and
  [VT323](https://fonts.google.com/specimen/VT323) (SIL Open Font License), loaded from
  Google Fonts.
