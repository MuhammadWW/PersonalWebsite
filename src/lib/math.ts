export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Hermite smoothstep between edge0 and edge1 (edges may be descending). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Linear position of x inside [a, b], clamped to 0..1. */
export function progressIn(x: number, a: number, b: number): number {
  return clamp((x - a) / (b - a));
}

/** Visibility window: fades in over [start, start+fadeIn], out over [end-fadeOut, end]. */
export function windowed(x: number, start: number, end: number, fadeIn = 0.03, fadeOut = 0.03): number {
  const inV = fadeIn <= 0 ? (x >= start ? 1 : 0) : smoothstep(start, start + fadeIn, x);
  const outV = fadeOut <= 0 ? (x <= end ? 1 : 0) : 1 - smoothstep(end - fadeOut, end, x);
  return Math.min(inV, outV);
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
