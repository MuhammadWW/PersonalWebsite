/**
 * Steps for the intro map. Each scroll gesture moves one step: the camera flies to the next place and
 * the sky switches to that step's look.
 */

type RGB = [number, number, number];

export type Look = {
  /** Twilight glow along the horizon. */
  glow: RGB;
  /** Atmosphere colour on the day side. */
  sky: RGB;
  /** Colour washed into the dark sky above the horizon. */
  space: RGB;
  /** Overall colour grade. */
  tint: RGB;
  exposure: number;
  lights: number;
  stars: number;
  /** Sun position: degrees below the visible horizon (negative is above) and degrees left/right of the view. */
  margin: number;
  azimuth: number;
};

/** Look target on the ground, camera height above it and ground distance behind it (km), heading (deg). */
export type CamKey = { lat: number; lon: number; h: number; d: number; heading: number };

export type Step = { id: string; pin?: string; name: string; lat: number; lon: number; cam: Omit<CamKey, "lat" | "lon">; look: Look };

const BASE: Look = {
  glow: [1, 0.45, 0.2],
  sky: [0.22, 0.46, 1],
  space: [0.02, 0.03, 0.06],
  tint: [1, 1, 1],
  exposure: 1,
  lights: 0.8,
  stars: 1,
  margin: 6,
  azimuth: 0,
};
const look = (o: Partial<Look>): Look => ({ ...BASE, ...o });

export const STEPS: Step[] = [
  {
    id: "title",
    name: "Start",
    lat: 27,
    lon: 69,
    cam: { h: 17000, d: 0, heading: 0 },
    look: look({ glow: [1, 0.5, 0.22], space: [0.03, 0.03, 0.07], margin: -4 }),
  },
  {
    id: "pakistan",
    pin: "Pakistan",
    name: "Pakistan",
    lat: 29.9,
    lon: 69.6,
    cam: { h: 950, d: 1350, heading: 20 },
    look: look({ glow: [1, 0.42, 0.14], space: [0.12, 0.05, 0.03], tint: [1.05, 0.98, 0.9], margin: 2.5, azimuth: -55 }),
  },
  {
    id: "houston",
    pin: "Houston",
    name: "Houston",
    lat: 29.76,
    lon: -95.37,
    cam: { h: 200, d: 390, heading: 25 },
    look: look({ glow: [0.3, 0.45, 1], space: [0.02, 0.05, 0.13], tint: [0.94, 0.98, 1.07], margin: 11, lights: 0.85 }),
  },
  {
    id: "tamu",
    pin: "Texas A&M",
    name: "Texas A&M",
    lat: 30.615,
    lon: -96.34,
    cam: { h: 150, d: 300, heading: 128 },
    look: look({ glow: [0.9, 0.16, 0.28], space: [0.12, 0.02, 0.06], tint: [1.06, 0.95, 0.98], margin: 3, azimuth: 50 }),
  },
  {
    id: "hobby",
    pin: "Hobby Airport",
    name: "Southwest",
    lat: 29.645,
    lon: -95.279,
    cam: { h: 90, d: 200, heading: 40 },
    look: look({ glow: [1, 0.6, 0.24], space: [0.1, 0.06, 0.02], tint: [1.07, 1.0, 0.9], margin: 5, lights: 0.72, azimuth: -35 }),
  },
  {
    id: "jsc",
    pin: "Johnson Space Center",
    name: "NASA",
    lat: 29.559,
    lon: -95.09,
    cam: { h: 90, d: 200, heading: 70 },
    look: look({ glow: [0.2, 0.72, 1], space: [0.01, 0.08, 0.12], tint: [0.94, 1.02, 1.07], margin: 2.5, lights: 0.72, azimuth: 30 }),
  },
  {
    id: "maryland",
    pin: "Maryland",
    name: "HHS",
    lat: 39.07,
    lon: -77.12,
    cam: { h: 230, d: 450, heading: 30 },
    look: look({ glow: [0.58, 0.48, 1], space: [0.07, 0.04, 0.13], tint: [0.96, 0.96, 1.08], margin: 8, stars: 1.5 }),
  },
  {
    id: "plano",
    pin: "Plano",
    name: "JPMorgan Chase",
    lat: 33.08,
    lon: -96.83,
    cam: { h: 190, d: 370, heading: 5 },
    look: look({ glow: [0.35, 0.45, 0.95], space: [0.01, 0.02, 0.09], margin: 15, stars: 1.9 }),
  },
  {
    id: "redmond",
    pin: "Redmond",
    name: "Microsoft",
    lat: 47.64,
    lon: -122.13,
    cam: { h: 190, d: 370, heading: 340 },
    look: look({ glow: [0.18, 0.95, 0.68], space: [0.01, 0.09, 0.07], tint: [0.94, 1.04, 1.0], margin: 4, azimuth: -45 }),
  },
  {
    id: "bastrop",
    pin: "Bastrop",
    name: "SpaceX",
    lat: 30.11,
    lon: -97.32,
    cam: { h: 170, d: 330, heading: 85 },
    look: look({ glow: [1, 0.74, 0.42], space: [0.1, 0.07, 0.04], tint: [1.05, 1.0, 0.94], margin: 1.2 }),
  },
  {
    id: "launch",
    name: "Launch",
    lat: 29.2,
    lon: -89.5,
    cam: { h: 260, d: 900, heading: 86 },
    look: look({ glow: [1, 0.5, 0.22], space: [0.05, 0.04, 0.09], margin: 0.6 }),
  },
  {
    id: "orbit",
    name: "Orbit",
    lat: 28.45,
    lon: -80.6,
    cam: { h: 408, d: 1450, heading: 88 },
    look: look({ glow: [1, 0.66, 0.34], space: [0.02, 0.03, 0.07], margin: -5 }),
  },
];

export const EARTH_KM = 6371;

/** Night-map crops layered over the global map, coarse to fine. Bounds: west, south, east, north. */
export const PATCHES: { file: string; small?: string; bounds: [number, number, number, number] }[] = [
  { file: "us.jpg", small: "us-sm.jpg", bounds: [-128, 22, -64, 52] },
  { file: "pakistan.jpg", bounds: [60, 20, 78, 37] },
  { file: "karachi.jpg", bounds: [65.5, 23.5, 69, 26.3] },
  { file: "texas.jpg", bounds: [-99, 28.5, -94, 34] },
  { file: "maryland.jpg", bounds: [-78.5, 38.2, -75.8, 40] },
  { file: "seattle.jpg", bounds: [-123.3, 46.9, -121.2, 48.3] },
];
