// Two-layer presentation, same as the film:
//   world  (crisp, 1 world px = 1 canvas px) -> scaled up with nearest-neighbour onto #view
//   gworld (soft light, half-res)            -> blurred into #glowv at WORLD resolution (cheap), which
//                                               CSS stretches smoothly and screen-blends. Blurring a
//                                               small canvas instead of a full-screen CSS filter keeps
//                                               the GPU (and your laptop) cool.
// The camera follows a target with a soft lerp and clamps to the room.

import { PX, mk } from './pixel';
import { clamp } from './math';

export interface Camera { x: number; y: number; w: number; h: number; sc: number }

export const WMAX = 1200, HMAX = 800;
/** How many world pixels tall we try to show. Smaller = chunkier pixels. */
const TARGET_H = 320, TARGET_W = 360, TARGET_W_PORTRAIT = 200;
/** CSS px reserved at the bottom for the emote + chat bar. */
const BOTTOM_UI_CSS = 110;

export class Renderer {
  readonly world = mk(WMAX, HMAX);
  readonly wctx = this.world.getContext('2d')!;
  readonly gworld = mk(WMAX / 2, HMAX / 2);
  readonly gctx = this.gworld.getContext('2d')!;
  readonly vx: CanvasRenderingContext2D;
  readonly gvx: CanvasRenderingContext2D;
  cam: Camera = { x: 0, y: 0, w: 480, h: 270, sc: 4 };
  dpr = 1;
  cssW = 1;
  cssH = 1;

  constructor(readonly view: HTMLCanvasElement, readonly glowv: HTMLCanvasElement, readonly stage: HTMLElement) {
    this.vx = view.getContext('2d')!;
    this.gvx = glowv.getContext('2d')!;
    this.wctx.imageSmoothingEnabled = false;
    this.gctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    PX.ctx = this.wctx;
    PX.glow = this.gctx;
    glowv.style.opacity = '0.85';
    this.layout();
    addEventListener('resize', () => this.layout());
  }

  layout(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const rc = this.stage.getBoundingClientRect();
    this.cssW = Math.max(1, rc.width);
    this.cssH = Math.max(1, rc.height);
    this.view.width = Math.max(1, Math.round(this.cssW * this.dpr)); this.view.height = Math.max(1, Math.round(this.cssH * this.dpr));
    // integer device-pixel scale keeps every world pixel a perfect square
    const portrait = this.view.height > this.view.width * 1.2;
    const sc = Math.max(1, Math.round(Math.min(this.view.height / TARGET_H, this.view.width / (portrait ? TARGET_W_PORTRAIT : TARGET_W))));
    this.cam.sc = sc;
    this.cam.w = this.view.width / sc;
    this.cam.h = this.view.height / sc;
    // glow canvas: 1 canvas px = 1 world px, stretched by CSS to exactly the view's scale
    this.glowv.width = Math.ceil(this.cam.w) + 2;
    this.glowv.height = Math.ceil(this.cam.h) + 2;
    this.glowv.style.width = (this.glowv.width * sc / this.dpr) + 'px';
    this.glowv.style.height = (this.glowv.height * sc / this.dpr) + 'px';
  }

  /** Move the camera toward a focus point (feet), framing it in the lower-middle. `top` pins the view's top edge instead. */
  follow(fx: number, fy: number, rw: number, rh: number, dt: number, snap = false, top?: number): void {
    const c = this.cam;
    // frame the feet ~72% down the area above the chat bar (sets extend below the walkable
    // floor so the bar never covers your feet, even at the bottom edge)
    const pad = BOTTOM_UI_CSS / (c.sc / this.dpr), H = rh;
    const tx = fx - c.w / 2, ty = top ?? fy - (c.h - pad) * 0.72;
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    c.x += (tx - c.x) * k;
    c.y += (ty - c.y) * k;
    c.x = c.w <= rw ? clamp(c.x, 0, rw - c.w) : (rw - c.w) / 2;
    c.y = c.h <= H ? clamp(c.y, 0, H - c.h) : (H - c.h) / 2;
  }

  begin(): void {
    this.gctx.globalCompositeOperation = 'source-over';
    this.gctx.setTransform(1, 0, 0, 1, 0, 0);
    this.gctx.clearRect(0, 0, this.gworld.width, this.gworld.height);
    this.gctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    this.gctx.globalCompositeOperation = 'lighter';
    this.wctx.setTransform(1, 0, 0, 1, 0, 0);
    this.wctx.globalAlpha = 1;
    PX.ctx = this.wctx;
    PX.emit = false;
    PX.fl = 0;
  }

  present(rw: number, rh: number, fillTop: string, fillLow: string): void {
    const { vx, gvx, cam } = this, sc = cam.sc, cw = this.view.width, ch = this.view.height;
    vx.imageSmoothingEnabled = false;
    vx.fillStyle = fillLow; vx.fillRect(0, 0, cw, ch);
    if (cam.y < 0) { vx.fillStyle = fillTop; vx.fillRect(0, 0, cw, Math.ceil(-cam.y * sc)); }
    const sx0 = Math.max(0, Math.floor(cam.x)), sy0 = Math.max(0, Math.floor(cam.y));
    const sx1 = Math.min(rw, Math.ceil(cam.x + cam.w) + 1), sy1 = Math.min(rh, Math.ceil(cam.y + cam.h) + 1);
    const dx = Math.round((sx0 - cam.x) * sc), dy = Math.round((sy0 - cam.y) * sc);
    vx.drawImage(this.world, sx0, sy0, sx1 - sx0, sy1 - sy0, dx, dy, (sx1 - sx0) * sc, (sy1 - sy0) * sc);
    gvx.globalCompositeOperation = 'source-over';
    gvx.clearRect(0, 0, this.glowv.width, this.glowv.height);
    gvx.imageSmoothingEnabled = true;
    gvx.filter = 'blur(1px)'; // ~1 world px, same softness the old full-screen CSS blur gave
    gvx.drawImage(this.gworld, sx0 / 2, sy0 / 2, (sx1 - sx0) / 2, (sy1 - sy0) / 2, sx0 - cam.x, sy0 - cam.y, sx1 - sx0, sy1 - sy0);
    gvx.filter = 'none';
  }

  /** World -> CSS pixel position inside the stage. */
  toScreen(x: number, y: number): [number, number] {
    const k = this.cam.sc / this.dpr;
    return [(x - this.cam.x) * k, (y - this.cam.y) * k];
  }
  /** CSS pixel -> world. */
  toWorld(px: number, py: number): [number, number] {
    const k = this.cam.sc / this.dpr;
    return [px / k + this.cam.x, py / k + this.cam.y];
  }
}
