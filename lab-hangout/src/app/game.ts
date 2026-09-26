// What the features (src/features/*) need from the game itself: who you are, the room, the network, the people
// around, and a few things to do. main.ts fills it in once at start-up (with getters, so it always shows the
// current room / player), and the features read it through `game`. Features never import main.ts.

import type { Avatar, EmoteKind } from '../entities/avatar';
import type { Input } from '../engine/input';
import type { Npcs } from '../game/npcs';
import type { Renderer } from '../engine/renderer';
import type { Using } from '../entities/avatar';
import type { LobbyPerson, StateVal, Transport } from '../net/transport';
import type { Room } from '../world/room';

export interface Game {
  readonly net: Transport;
  /** You. */
  readonly me: Avatar;
  /** The room you're in. */
  readonly room: Room;
  /** Everyone else in this room (players and bots), by id. */
  readonly others: Map<string, Avatar>;
  /** In the world (past the start screen). */
  readonly playing: boolean;
  /** Everyone else online on this server, whatever room they're in. */
  readonly lobby: LobbyPerson[];
  /** Your token balance (as last heard from the server). */
  readonly tokens: number;
  readonly input: Input;
  readonly npcs: Npcs;
  /** Walking through a door to another room (mid-fade). */
  readonly switching: boolean;
  /** Changing your look (the start screen is up). */
  readonly editing: boolean;
  /** A touch screen (the hints say TAP, not PRESS E). */
  readonly isTouch: boolean;
  /** Your drift velocity while weightless (world px / s): the jetpack pushes it. */
  readonly zv: { x: number; y: number };
  /** The screen: the camera, and world <-> screen positions. */
  readonly R: Renderer;
  /** What kind of spot someone is using right now (null = none). */
  usingOf(av: Avatar): Using;
  /** Step off the spot you're using (back to where you stand to use it). */
  leaveSpot(): void;
  /** Emote (unless you only just did): true if it happened. */
  emote(kind: EmoteKind): boolean;
  /** Put on something you own ('slot:index'), and cheer. */
  wear(item: string): void;
  /** onClose for a panel opened from spot i: hand the keys back to walking and step off the spot. */
  closeSpot(i: number): () => void;
  /** Forget where you tapped to walk to. */
  clearTap(): void;
  /** Ask the server to do something to a shared thing, one at a time per `what`; then `ok` and refresh(true), or say why not. */
  serverDo<T>(what: string, act: () => Promise<T>, ok: (r: T) => void, refresh: (bump?: boolean) => void): void;
  /** Send your position, hands and pose again right away (after changing what you hold, your pose...). */
  sendMe(): void;
  /** Share a room value (newest wins; newcomers are caught up). */
  setState(v: StateVal): void;
  setTokens(n: number): void;
  /** Emote even if you only just did (a win, a prize): skips the cooldown. */
  celebrate(kind?: EmoteKind): void;
  /** A little "+1" floating up from (x, y) (over your head by default). */
  floatText(text: string, x?: number, y?: number, t0?: number): void;
  /** Everyone in this room: you (when playing), the other players and bots, and the NPCs here. */
  everyone(): Avatar[];
  /** Someone who's only just arrived and isn't drawn yet. */
  hidden(av: Avatar, t: number): boolean;
  /** A season's collect-them-all prize: a new item (celebrate!), or 5 tokens if you already have them all. */
  seasonPrize(prize: string | null, all: string, what: string): void;
}

export let game: Game;
export function setGame(g: Game): void { game = g; }

/** The page's element for a CSS selector. */
export const $ = <T extends HTMLElement>(q: string): T => document.querySelector(q) as T;
/** A phone-width screen (the same width the stylesheet switches at). */
export const narrow = (): boolean => innerWidth < 560;
/** Seconds on the page's clock. */
export const now = (): number => performance.now() / 1000;
/** Error -> readable text, and with a capital letter for a toast. */
export const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
export const cap = (m: string): string => (m ? m[0].toUpperCase() + m.slice(1) : m);
