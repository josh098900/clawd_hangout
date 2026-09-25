// Small math kit, ported 1:1 from the original film so motion feels identical.

/** Deterministic hash noise in [0,1). Use this (never Math.random) for anything baked into a set. */
export const h1 = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** 0..1 progress of t through [a,b], clamped. */
export const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a), 0, 1);

export const eOut = (u: number): number => 1 - Math.pow(1 - u, 3);
export const eIn = (u: number): number => u * u * u;
export const eIO = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** Ease-out with overshoot ("back"). The house style for anything that pops in. */
export const eOB = (u: number): number => {
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};
/** A half-sine hump: 0 at t0, 1 in the middle, 0 at t0+d. */
export const bump = (t: number, t0: number, d: number): number =>
  t < t0 || t > t0 + d ? 0 : Math.sin(((t - t0) / d) * Math.PI);
