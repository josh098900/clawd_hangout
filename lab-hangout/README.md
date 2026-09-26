# Lab Hangout

A multiplayer pixel hangout. Pick a colour, a hat and an outfit for your little lab critter
(or Clawd), then walk around **the Lab**, **the Square**, **the Cinema** and **the Dev Den**, chat in speech
bubbles and emote with everyone else who's online.

Thirteen rooms: **the Lab**, **the Square**, **the Cinema**, **the Dev Den**, **the Rooftop Garden**,
**the Crypt**, **the Stage**, **the Pier**, **the Arcade**, **the Subway** (two stations and the train)
and **the Park**. Things to do: sit on sofas, benches, cinema seats
and hammocks; get coffee, popcorn, soda and marshmallows (roast them on the bonfire); draw on
the Lab's shared whiteboard; play SLOP INVADERS on the arcade cabinet; change the jukebox
track for the whole room; dance, plonk down on the floor or pick from the emote wheel; feed
the pigeons; watch the film (two films, everyone sees the same frame); take a photo-booth
strip and save it; play musical chairs and tag; throw coffee at the slop invasion; find
constellations and light fireworks on the roof; push stone blocks to open the Crypt (there's
a crown in it); jam on keys, drums, bass and mic at the Stage; go fishing off the Pier.
Down the neon stairwell on the Square is **the Arcade**: spend tokens on the claw machine (13
prizes: hats, face items, outfits and pets like a cat, a crab and a ghost), play 2-player Pong
while everyone watches it live on the cabinet, and check your collection at the prize counter.
Start a round of **hide and seek** across every room from the sign on the Square. Click a player
to FOLLOW them (even through doors); wave next to someone who's waving for a HIGH FIVE.
Decorate your own desk in the Dev Den (the DESK STUFF shelf).
Down the green-railed stairs on the Square is **the Subway**: a train pulls in every two minutes
(everyone sees the same train), you board through its open doors and ride together past the
city skyline to **the Park**: row a boat on the pond, feed the ducks, fly a kite on the shared
wind, grab a hot dog, picnic, listen to the bandstand, and build castles in the shared sandbox.
Every hour from :30 to :40 there's a **fishing contest** at the Pier: the biggest catch wins tokens
and the TROPHY ANGLER badge (the scoreboard at the end of the pier keeps score).
Every day there are **three daily quests** (the same for everyone, new at midnight UTC) worth
tokens, and **badges** for big milestones that show on your player card: click the QUESTS pill.
Up on the Rooftop is the **community garden**: buy a seed, plant it in a free bed, and it grows
in real time over hours. Anyone can water anyone's plant (and gets a token for helping), a plant
left dry for a day wilts, and you harvest it for tokens (sometimes with a rare glowing moonflower
seed in the soil).
Every October it's **Halloween**: pumpkins, cobwebs, bats and fog everywhere; knock on the 8
pumpkin doors around the world for tokens (or a trick that turns you into a ghost), and all 8 in a
day wins a costume; light the haunted Crypt's candles in the old scroll's order for the pumpkin
head; BOO the ghost tells spooky stories on the Square.
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
| The city map: see where everyone is, go anywhere (the Station and the Moon still need their ride) | M, or the **MAP** button; E at a map board (the Square's kiosk, a Subway poster, the Station's chart) | **MAP** button (bottom), tap a place, then GO |
| Chat | Enter, type, Enter | tap the chat bar |
| Use things (sit, coffee, popcorn, arcade, whiteboard, jukebox, photo booth, talk to NPCs, feed pigeons) | walk up and press E, or click it | tap it |
| Sip / eat what you're holding | Q | SIP / EAT button |
| Emote | 1 wave · 2 hop · 3 yay · 4 huh? · 5 idea | emote buttons |
| Dance / sit on the floor (until you move) | 6 / 7 | DANCE / SIT buttons |
| Emote wheel (8 more emotes) | R, then 1-8 | MORE button |
| Play an instrument at the Stage | 1-8 while at it | pads |
| Push a stone block (Crypt) | walk into it | walk into it |
| Arcade | ←/→ move, Space fire, Esc quit | ◀ FIRE ▶ buttons |
| Pong | W/S or ↑/↓ | drag on the court |
| Row a boat (Park) | walk on the water; E at the dock to get out | tap the water |
| Put a kite away | Q | PUT AWAY button |
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
4. `supabase/migrations/0004_accounts.sql`: saves, the prize inventory, guest → account merging
5. `supabase/migrations/0005_servers.sql`: LAB 1-3 with a 12-player cap each. **This renames the
   Realtime channels, so push the matching game build straight after running it** (players on an
   old build can't join rooms until they reload).
6. `supabase/migrations/0006_arcade.sql`: the claw machine
7. `supabase/migrations/0007_halloween.sql`: seasons, trick-or-treat, October-only claw prizes
8. `supabase/migrations/0008_gardens.sql`: the Rooftop's community garden
9. `supabase/migrations/0009_quests.sql`: daily quests and badges
10. `supabase/migrations/0010_fishing.sql`: the hourly fishing contest (the server rolls every catch)
11. `supabase/migrations/0011_weather.sql`: shared weather (rain waters the Rooftop gardens), the group-dance quest and badges
12. `supabase/migrations/0012_diner.sql`: the Diner's tips (capped), its daily quest and the HEAD CHEF badge
13. `supabase/migrations/0013_karts.sql`: the Kart Track and TANK DUEL quests and badges
14. `supabase/migrations/0014_apartments.sql`: THE LOFTS: furniture you buy, your flat's layout, doors (locked / friends / open), house parties, and private flat channels
15. `supabase/migrations/0015_space.sql`: the Space Station: the hydroponic trays (STAR MELONS), the COMET BLOOM seed for the roof garden, spacewalk pay (capped), the space quests and the ASTRONAUT badge
16. `supabase/migrations/0016_karaoke.sql`: karaoke tips on the Stage (capped per song and per day)
17. `supabase/migrations/0017_photos.sql`: the Lab's PHOTO WALL (pinned strips, owner review, hearts, the flat PHOTO FRAME).
    Then make yourself the moderator once: `select public.make_admin('the-email-you-log-in-with');`
18. `supabase/migrations/0018_winter.sql`: WINTER (on by itself 1 Dec - 6 Jan): the present hunt, advent calendar, tree ornaments,
    Santa's sleigh presents, Secret Santa gifts, winter claw prizes and furniture. Try it early with
    `select public.set_season('winter');` and switch back to the date with `select public.set_season(null);`
19. `supabase/migrations/0019_moon.sql`: THE MOON: the Moon Base's ASSAY machine (moon rocks pay 1, MOON CRYSTALS 3, capped;
    the 5th crystal brings the MOON ROVER pet), the Moon quests and the MOONWALKER badge
20. `supabase/migrations/0020_map.sql`: THE CITY MAP's EXPLORER badge (visit every place on the map). The map
    itself needs nothing from the server

Then:
- Set the invite code: `select public.set_invite_code('something-long-and-secret');`
  Share it with testers; they type it once on the start screen.
- **Realtime → Settings**: switch OFF **Allow public access** (only private channels work now).

### CAPTCHA (Cloudflare Turnstile), for guest sign-ins
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → **Add widget**. Name it
   "Lab Hangout", add hostnames `localhost` and your Vercel domain (e.g. `lab-hangout.vercel.app`),
   widget mode **Managed**, then **Create**. Copy the **Site Key** and the **Secret Key**.
2. **Vercel** → your project → **Settings → Environment Variables** → add
   `VITE_TURNSTILE_SITE_KEY` = the site key (all environments). Put the same line in `.env.local`.
3. **Supabase** → **Authentication → Attack Protection** → enable **CAPTCHA protection**, provider
   **Turnstile**, paste the **secret** key, **Save**.
4. **Vercel** → **Deployments** → ⋯ on the latest → **Redeploy** (env vars only apply to new builds).

Do steps 2-4 together: with CAPTCHA on in Supabase but no site key in the app, new guests can't
sign in. Logging in with Discord/Google doesn't use the CAPTCHA.

### Logging in with Discord and Google (optional: guests work without it)
Guests are saved in their browser only. Logging in keeps tokens, prizes, friends and unlocks on
any device, and a guest who logs in keeps everything they had. You need your Supabase callback
URL: **Authentication → Sign In / Providers → Discord** shows it (it looks like
`https://<project-ref>.supabase.co/auth/v1/callback`).

Discord:
1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New
   Application** → name it → **OAuth2** → **Redirects** → **Add Redirect** → paste the callback URL
   → **Save Changes**. Copy the **Client ID**, then **Reset Secret** and copy the **Client Secret**.
2. Supabase → **Authentication → Sign In / Providers → Discord** → enable, paste both → **Save**.

Google:
1. [console.cloud.google.com](https://console.cloud.google.com) → create a project → **APIs &
   Services → OAuth consent screen**: External, app name, your email → save (add your testers'
   emails under **Test users** while it's in testing).
2. **Credentials → Create credentials → OAuth client ID** → **Web application** → under
   **Authorized redirect URIs** add the callback URL → **Create**. Copy the Client ID and secret.
3. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste both → **Save**.

Then in Supabase:
- **Authentication → URL Configuration**: **Site URL** = your Vercel URL; **Redirect URLs** →
  add `http://localhost:5173/**` and `https://<your-vercel-domain>/**`.
- **Authentication → Sign In / Providers** (user signups section): turn on **Allow manual linking**
  (that's what lets a guest attach Discord/Google to their existing player).
- Tell the game which buttons to show: `VITE_AUTH_PROVIDERS=discord,google` in Vercel and
  `.env.local` (just `discord` if you only set that one up), then redeploy.

### Servers
Players pick a server after the start screen (the busiest one with room is suggested). Anyone idle for 10 minutes (no key, click, tap or mouse move) gets a 60-second "still there?" warning and is then taken off the server to free the seat; one click rejoins. Each is a
separate copy of the world with its own cap, enforced by the database. From the SQL editor:
- Change a cap: `update private.servers set cap = 20 where id = 'one';`
- Add a server: `insert into private.servers (id, name, cap, sort) values ('four', 'LAB 4', 12, 4);`
- Who's where: `select * from private.seats where seen > now() - interval '90 seconds';`
- Share a direct link to a server: `https://<your-domain>/?server=two`

Realtime message budget: Supabase counts every message once when sent and once per player who
receives it. The Free plan allows 100 a second (2M a month), which is about 6 people walking
around one room at once; Pro allows 500 a second, enough for a full server of 12. The game
already slows its movement updates in busy rooms.

Moderation, from the SQL editor:
- Reports: `select * from private.reports order by at desc;` (includes the player's last chat lines)
- Ban / unban: `select public.ban_player('<user id>', 'reason');` / `select public.unban_player('<user id>');`
- Add a filtered word: `insert into private.banned_words values ('regex');`
- Chat log: `select * from private.chat_log order by at desc limit 100;`
- Claw odds: `update private.claw_prizes set weight = 2 where item = 'hat:10';`
- Fishing contests: `select * from private.contest_results order by contest desc;`
- Quests: `select * from private.quest_days order by day desc;` · change the pool's odds with
  `update private.quest_pool set weight = 0 where id = 'pong';` (0 = never picked)
- Garden: `select * from public.plots;` · seed prices and times: `update private.seeds set cost = 3 where id = 0;` (keep `SEEDS` in `src/world/garden.ts` in step)
- Seasons switch on by date (October = Halloween). To preview one early for everyone:
  `select public.set_season('halloween');`, and `select public.set_season(null);` to go back to
  the date (don't forget, or it stays Halloween into November). `?season=halloween` in the URL
  previews the decorations in your own browser only.
- Public launch: `select public.set_world_open(true);` lets everyone in without a code.

## Tests

```bash
npm run test:sql     # every migration run twice on a throwaway local Postgres, then the SQL suites in tests/sql (~5 s)
npm run test:smoke   # every room in normal / winter / halloween dressing + a two-player check, in headless Chrome (~2 min)
npm run test:lists   # the game's copies of the claw prizes, fish, seeds, furniture prices, quests and weather match the database
npm run test:golden  # fingerprints of everything the game draws (clocks frozen): a refactor must not change any
npm test             # typecheck + all of them
```

- `test:sql` needs Postgres 14 or newer installed (`brew install postgresql@14`). It never touches Supabase:
  `tests/sql/stubs.sql` stands in for Supabase's auth and realtime. `npm run test:sql -- 18` runs just
  the suites whose name contains `18`.
- `test:smoke` uses your installed Google Chrome (set `CHROME_PATH` if it lives somewhere unusual), and
  runs the game in LOCAL mode.
- `test:golden` compares with `tests/golden/baseline.json`. When a change is *meant* to change how something
  looks, check it with your own eyes, then `npm run test:golden -- --update` saves the new baseline.
- A new migration gets a matching suite, `tests/sql/NN_name.sql`, which prints `PASS ...` / `FAIL ...` notices
  (copy the `pg_temp.ok` helper from any suite).

## Deploying

This is a static site. `npm run build` outputs `dist/`. On **Vercel**: import the repo, set the root
directory to `lab-hangout` (framework preset: Vite), and add `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` (and `VITE_TURNSTILE_SITE_KEY`, `VITE_AUTH_PROVIDERS`) as environment variables. The invite
code keeps the world private, whatever Vercel plan you're on. Before going public, read "Known limitations" in `CLAUDE.md`
(private channels, CAPTCHA on sign-in, moderation).

## Roadmap

See `docs/ROADMAP.md`.

## Project layout

See `CLAUDE.md` for the full map, the networking contract and conventions. See
`docs/ART_STYLE.md` for the rules that keep the pixel-art look consistent. Both are written
so you can hand the project to Claude Code in VS Code and keep building.

## Status

- Live on Vercel + Supabase (invite-only), played online with a friend.
- Every change is play-tested headlessly in LOCAL mode (two-tab multiplayer, bots, all rooms at
  60 fps) and every migration is run twice against a local Postgres with PASS/FAIL checks
  (RLS, rate limits, merge rules, the seat cap, claw odds and payments).
- Needs a live check after setup: Turnstile, Discord/Google login and guest linking (these only
  work on the real domain with the keys in place).

## Credits

- The rendering approach, palette, lab and city-square sets, and the voxel creations are
  adapted, with permission, from the pixel-art film "Claw'd Labs, Part 0" by its original
  creator. Thank you!
- The default player character (the lab critter) is an original design for this project.
- The optional **Clawd** body is Anthropic's mascot, used with Anthropic's permission. The
  project uses no Anthropic logos or wordmarks.
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and
  [VT323](https://fonts.google.com/specimen/VT323) (SIL Open Font License), loaded from
  Google Fonts.
