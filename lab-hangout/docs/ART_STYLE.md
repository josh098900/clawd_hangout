# Art style bible

The look comes from a short pixel-art film ("Claw'd Labs, Part 0"). This game reuses its
rendering method, palette, sets and motion rules. Anything new should look like it was in
that film. When in doubt, open `src/world/lab.ts` and copy how things there are drawn.

## 1. Everything is hard pixel rectangles

- The only crisp drawing primitive is `r(x, y, w, h, colour)` in `src/engine/pixel.ts`. It
  snaps to whole pixels. `line`, `disc`, `oval`, `ring`, `spr`, `txt` are all built from `r`.
- No anti-aliasing, no `arc()`/`stroke()` on the crisp layer, no gradients on the crisp
  layer, no image smoothing, no sub-pixel positions. (The sky "gradient" is 4px bands of `r`.)
- No bitmap image files for world art. If you need a sprite, write it as ASCII rows and use
  `spr(rows, map, x, y)`, or build it from `r` calls like the critter.
- Scenery randomness comes from `h1(n)` (deterministic hash), **never `Math.random()`**, so
  sets look identical every load and on every player's screen.

## 2. Two layers: crisp + glow

| Layer | Resolution | Drawn with | What goes here |
|---|---|---|---|
| crisp (`world`) | 1 world px = 1 canvas px, upscaled with nearest-neighbour by an integer | `r` and friends | every solid thing |
| glow (`gworld`) | half-res, CSS `blur()` + `mix-blend-mode: screen` | `G`, `Gd`, `Gline` | light only: lamp cones, neon halos, bulb glows, searchlights |

Light is **never** drawn on the crisp layer. If something glows, draw its solid pixels
with `lit(() => …)` (self-lit, ignores night tint) *and* add a soft `Gd`/`G` on the
glow layer. Keep glow alpha low (0.05–0.4). Stacking many weak glows looks better than one
strong one (see the lamp cones: 12 rects at 0.05).

## 3. Light model

- `PX.dim` (0..1) fades normal pixels toward `NIGHT`. The lab is 0, the square is 0.1.
- `PX.fl` + `PX.flc` tint everything toward a flash colour (lasers, lightning). Unused for
  now. Good for future events.
- `lit(fn)` / `PX.emit = true` marks pixels as light sources: neon, screens, antenna bulbs,
  confetti, sparkles, pop-up text.
- Fixed light direction: **top-left**. Highlights (`hi`) go on top rows and left edges;
  shadows (`lo`) on right edges and bottoms. The voxel shading (top ×1.18, front ×1, right
  ×0.68) follows the same rule. Don't mirror sprites to face left, because that flips the
  light. Shift eyes/details with `dir` instead (see `critter.ts`).

## 4. Palette

All colours are tokens in `src/engine/palette.ts` (`K` = night/city/props, `LK` = lab).
Add new tokens there. To vary a token, use `shade(c, k)` or `M(a, b, t)` instead of
inventing a new hex. Signature accents: cyan `#5FE7FF`, magenta `#FF5FD2`, gold `#FFD65A`,
the warm orange `#D97757` (UI), neon green EXIT `#7CF29C`.

## 5. Characters

- Players are the **lab critter** by default: an original design (round body, antenna
  bulb, two feet, blush, belly patch). There is also an optional **Clawd** body
  (Anthropic's mascot, included deliberately for private use; see CLAUDE.md). It is a
  flat block on a 3px grid with no antenna or mouth, so its eyes, arms and legs carry
  every pose. Don't add any other existing characters.
- Built at 1x in local sprite space (feet at 0,0), then given the 1px dark outline
  (`#160C2C`) with `outline()`, then stamped with the film's transform:
  `sx = 1/sqrt(sy)` (volume-preserving squash) and lean as a shear.
- New accessories go in `composeCritter` and must fit inside the 60×72 sprite box. Add
  the option to the `HATS`/`FACES`/`FITS` list (the index goes over the network).
- Name tags use the 3×5 pixel font via `txtOutlined`. Speech uses the DOM `.bub` style
  (VT323, white box, 3px ink border, stepped tail).

## 6. Motion rules (from the film's constraint sheet)

- **Anticipation**: a small squash before a hop (`hop` emote).
- **Overshoot/settle**: pop-ins use `eOB`; stops use a damped wobble
  (`-0.09·e^(-9u)·cos(22u)`).
- **Squash on impact**: every landing squashes.
- **Secondary motion**: the antenna trails behind the walk direction and wobbles on stop.
  Scarves flutter the same way.
- Idle life: slow breathing (`sy` ±2%), random blinks, steam from mugs, flickering neon.
  Every set needs at least 3 small idle animations.
- Time-based, not frame-based: all animation is a function of `a` (seconds).

## 7. Sets (rooms)

- Side-on view with a walkable floor band. Walls and props against the wall are baked into
  `room.bg` once. Anything animated goes in `drawBack(a)`. Anything you can walk behind
  or in front of is a `Prop` with a base `y` so it depth-sorts with players, plus a
  blocker rect in `blockers`.
- Make the set taller than the walkable floor (the lab floor tiles continue 68px below the
  walkable band) so the chat bar never hides anyone's feet.
- Doors: a `trigger` rect at the top edge of the floor (walk up into it) plus a
  clickable `area` over the door's picture.

- **The Square by day** is a second baked backdrop using the `DK` tokens, cross-faded over
  the night one by `dayness()`. Glow is scaled down with `PX.gmul` in daylight; dawn/dusk add
  a warm wash. Keep new Square art readable in both.
- **The Cinema** uses the `CK` tokens (velvet red, gold, dark panels). The film is drawn
  inside the screen rect with `lit()` (it's a light source) and throws its colour into the
  room on the glow layer. The house lights (sconces, `dimNow`) dim while it plays.

## 8. UI chrome

Titles use Press Start 2P with the stepped orange drop shadow. Small text and chat use
VT323. Panels are dark translucent with a 3px coloured edge (left or bottom). Buttons are
blurred "pills". Room names slide in on the angled name plate (`.plate.lab` cyan,
`.plate.plaza` gold/purple). Keep it that small. The world is the show.
