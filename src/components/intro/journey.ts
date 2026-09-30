import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { EARTH_KM, PATCHES, STEPS, type CamKey, type Look } from "./journey-data";
import { PAKISTAN_BORDER } from "./pakistan-border";

export type PinState = "current" | "visited" | "hidden";
export type PinInfo = { x: number; y: number; visible: boolean; state: PinState };
export type JourneyFrame = { pins: PinInfo[]; lat: number; lon: number; altitudeKm: number };

export type JourneyOptions = {
  quality: "high" | "low";
  /** URL prefix for the texture folder. */
  textureBase: string;
  onFrame?: (info: JourneyFrame) => void;
};

export type JourneyHandle = {
  goTo(step: number): void;
  setPointer(nx: number, ny: number): void;
  resize(width: number, height: number): void;
  setActive(active: boolean): void;
  dispose(): void;
};

const DEG = Math.PI / 180;
const R = 1000;
const KM = R / EARTH_KM;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function lerpAngle(a: number, b: number, t: number) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
}

/** Unit vector for a latitude/longitude, matching three.js SphereGeometry UVs. */
function dirOf(lat: number, lon: number, out = new THREE.Vector3()) {
  const theta = (90 - lat) * DEG;
  const phi = (lon + 180) * DEG;
  return out.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
}

function latLonOf(v: THREE.Vector3): [number, number] {
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y))) / DEG;
  let lon = Math.atan2(v.z, -v.x) / DEG - 180;
  if (lon < -180) lon += 360;
  return [lat, lon];
}

function slerpDir(a: THREE.Vector3, b: THREE.Vector3, t: number, out = new THREE.Vector3()) {
  const omega = a.angleTo(b);
  if (omega < 1e-6) return out.copy(a);
  const s = Math.sin(omega);
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - t) * omega) / s)
    .addScaledVector(b, Math.sin(t * omega) / s)
    .normalize();
}

/** Initial great-circle bearing from a to b, in degrees clockwise from north. */
function bearing(a: THREE.Vector3, b: THREE.Vector3) {
  const [la1, lo1] = latLonOf(a);
  const [la2, lo2] = latLonOf(b);
  const p1 = la1 * DEG;
  const p2 = la2 * DEG;
  const dl = (lo2 - lo1) * DEG;
  return Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG;
}

const keyOf = (i: number): CamKey => ({ lat: STEPS[i].lat, lon: STEPS[i].lon, ...STEPS[i].cam });

function mixLook(a: Look, b: Look, t: number): Look {
  const m3 = (x: [number, number, number], y: [number, number, number]): [number, number, number] => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
  return {
    glow: m3(a.glow, b.glow),
    sky: m3(a.sky, b.sky),
    space: m3(a.space, b.space),
    tint: m3(a.tint, b.tint),
    exposure: lerp(a.exposure, b.exposure, t),
    lights: lerp(a.lights, b.lights, t),
    stars: lerp(a.stars, b.stars, t),
    margin: lerp(a.margin, b.margin, t),
    azimuth: lerpAngle(a.azimuth, b.azimuth, t),
  };
}

const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
const tT = new THREE.Vector3();

/** Camera between two keys: slerped target, log-scaled height, and a climb for long flights. */
function travel(a: CamKey, b: CamKey, u: number): { key: CamKey; hump: number } {
  const e = easeInOut(u);
  dirOf(a.lat, a.lon, tA);
  dirOf(b.lat, b.lon, tB);
  const distKm = tA.angleTo(tB) * EARTH_KM;
  const hump = Math.min(12000, distKm * 0.62);
  const w = Math.sin(Math.PI * u);
  slerpDir(tA, tB, e, tT);
  const [lat, lon] = latLonOf(tT);
  const k = Math.min(1, hump / 900);
  const h = Math.exp(lerp(Math.log(a.h), Math.log(b.h), e)) + hump * Math.pow(w, 1.3);
  const d = lerp(a.d, b.d, e) * (1 - w * k);
  let heading = lerpAngle(a.heading, b.heading, e);
  if (k > 0 && tT.angleTo(tB) > 1e-4) heading = lerpAngle(heading, bearing(tT, tB), Math.min(1, w * 1.6) * k);
  return { key: { lat, lon, h, d, heading }, hump: w * k };
}

function durationFor(a: CamKey, b: CamKey) {
  const distKm = dirOf(a.lat, a.lon, tA).angleTo(dirOf(b.lat, b.lon, tB)) * EARTH_KM;
  const zoom = Math.abs(Math.log(b.h / a.h));
  return Math.min(1.7, 0.85 + Math.min(0.75, distKm / 12000) + Math.min(0.4, zoom * 0.1));
}

/* --------------------------------- shaders -------------------------------- */

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uP0;
  uniform sampler2D uP1;
  uniform sampler2D uP2;
  uniform sampler2D uP3;
  uniform sampler2D uP4;
  uniform sampler2D uP5;
  uniform vec4 uRect[6];
  uniform float uHas[6];
  uniform float uHasTex;
  uniform float uLights;
  uniform vec3 uSunDir;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  vec3 layer(vec3 base, sampler2D tex, vec4 r, float has) {
    vec2 q = (vUv - r.xy) / (r.zw - r.xy);
    float edge = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float w = has * smoothstep(0.0, 0.08, edge);
    return mix(base, texture2D(tex, clamp(q, 0.0, 1.0)).rgb, w);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.14, 0.22, ndl);
    vec3 dayTex = mix(vec3(0.05, 0.11, 0.2), texture2D(uDay, vUv).rgb, uHasTex);
    vec3 nightTex = texture2D(uNight, vUv).rgb * uHasTex;
    nightTex = layer(nightTex, uP0, uRect[0], uHas[0]);
    nightTex = layer(nightTex, uP1, uRect[1], uHas[1]);
    nightTex = layer(nightTex, uP2, uRect[2], uHas[2]);
    nightTex = layer(nightTex, uP3, uRect[3], uHas[3]);
    nightTex = layer(nightTex, uP4, uRect[4], uHas[4]);
    nightTex = layer(nightTex, uP5, uRect[5], uHas[5]);
    vec3 lit = dayTex * (0.04 + max(ndl, 0.0) * 1.3);
    float lights = smoothstep(0.28, 0.9, nightTex.r) * smoothstep(0.18, 0.75, nightTex.g);
    vec3 night = nightTex * 0.26 + vec3(0.004, 0.007, 0.014) + vec3(1.0, 0.7, 0.4) * pow(lights, 1.25) * uLights;
    vec3 col = mix(night, lit, day);
    vec3 v = normalize(cameraPosition - vPosW);
    float ocean = smoothstep(0.02, -0.05, dayTex.g - dayTex.b) * uHasTex;
    vec3 hv = normalize(uSunDir + v);
    col += vec3(1.0, 0.86, 0.68) * pow(max(dot(n, hv), 0.0), 70.0) * ocean * day * 0.55;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 haze = mix(uWarm, uCool, smoothstep(0.0, 0.35, ndl));
    col = mix(col, haze * smoothstep(-0.18, 0.12, ndl), rim * 0.65);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vPosW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// Brightness follows the ray's tangent height above the surface, so the limb is a thin exponential band.
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform float uR;
  uniform float uH;
  varying vec3 vPosW;
  void main() {
    vec3 rd = normalize(vPosW - cameraPosition);
    vec3 cp = cameraPosition + rd * max(-dot(cameraPosition, rd), 0.0);
    float h = max(length(cp) - uR, 0.0);
    float sunSide = dot(normalize(cp), uSunDir);
    float dens = exp(-h / uH);
    float lit = smoothstep(-0.22, 0.08, sunSide);
    float twilight = 1.0 - smoothstep(-0.02, 0.4, sunSide);
    vec3 warm = mix(uWarm, mix(uWarm, vec3(1.0, 0.86, 0.62), 0.45), smoothstep(0.0, 2.2 * uH, h));
    vec3 col = mix(uCool, warm, twilight * exp(-h / (2.6 * uH)));
    float fwd = pow(max(dot(rd, uSunDir), 0.0), 6.0);
    vec3 glow = col * dens * lit * (0.9 + fwd * 3.0);
    glow += vec3(0.3, 0.85, 0.45) * exp(-pow((h - 6.8 * uH) / (0.5 * uH), 2.0)) * (1.0 - lit) * 0.06;
    glow += uCool * 0.09 * dens * (1.0 - lit);
    gl_FragColor = vec4(glow, 1.0);
  }
`;

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const QUAD_FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uExposure;
  uniform vec3 uTint;
  uniform vec3 uSpace;
  varying vec2 vUv;
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 toSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }
  void main() {
    vec3 hdr = texture2D(tScene, vUv).rgb * uExposure;
    float lum = dot(hdr, vec3(0.2126, 0.7152, 0.0722));
    hdr += uSpace * (1.0 - smoothstep(0.0, 0.12, lum)) * smoothstep(0.15, 1.0, vUv.y) * 1.3;
    vec3 col = toSrgb(clamp(aces(hdr) * uTint, 0.0, 1.0));
    vec2 q = vUv - 0.5;
    col *= 1.0 - dot(q, q) * 0.5;
    vec2 px = vUv * uRes;
    float n = fract(sin(dot(px + fract(uTime) * 97.13, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.026;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------------------------------- scene --------------------------------- */

export function createJourney(canvas: HTMLCanvasElement, options: JourneyOptions): JourneyHandle {
  const high = options.quality === "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, high ? 1.6 : 1);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x05070b, 1);

  let width = canvas.clientWidth || window.innerWidth;
  let height = canvas.clientHeight || window.innerHeight;

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: high ? 4 : 0, depthBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80000);

  /* earth */
  const loader = new THREE.TextureLoader();
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const warm = new THREE.Color();
  const cool = new THREE.Color();
  const earthUniforms = {
    uDay: { value: blank as THREE.Texture },
    uNight: { value: blank as THREE.Texture },
    uP0: { value: blank as THREE.Texture },
    uP1: { value: blank as THREE.Texture },
    uP2: { value: blank as THREE.Texture },
    uP3: { value: blank as THREE.Texture },
    uP4: { value: blank as THREE.Texture },
    uP5: { value: blank as THREE.Texture },
    uRect: {
      value: PATCHES.map(({ bounds: [w, s, e, n] }) => new THREE.Vector4((w + 180) / 360, (s + 90) / 180, (e + 180) / 360, (n + 90) / 180)),
    },
    uHas: { value: PATCHES.map(() => 0) },
    uHasTex: { value: 0 },
    uLights: { value: 0.8 },
    uSunDir: { value: new THREE.Vector3(0, 0, -1) },
    uWarm: { value: warm },
    uCool: { value: cool },
  };
  const textures: THREE.Texture[] = [];
  const prep = (tex: THREE.Texture) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(tex);
    return tex;
  };
  let base = 0;
  const onBase = (key: "uDay" | "uNight") => (tex: THREE.Texture) => {
    earthUniforms[key].value = prep(tex);
    base += 1;
    if (base === 2) earthUniforms.uHasTex.value = 1;
  };
  const url = (file: string) => `${options.textureBase}/${file}`;
  loader.load(url(high ? "night/world-4k.jpg" : "night/world-2k.jpg"), onBase("uNight"));
  loader.load(url(high ? "earth-day.jpg" : "earth-day-sm.jpg"), onBase("uDay"));
  [1, 2, 0, 3, 4, 5].forEach((i, n) => {
    const patch = PATCHES[i];
    window.setTimeout(
      () =>
        loader.load(url(`night/${!high && patch.small ? patch.small : patch.file}`), (tex) => {
          (earthUniforms[`uP${i}` as "uP0"] as { value: THREE.Texture }).value = prep(tex);
          earthUniforms.uHas.value[i] = 1;
        }),
      n * 120,
    );
  });

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, high ? 256 : 144, high ? 160 : 96),
    new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: earthUniforms }),
  );
  scene.add(earth);

  const atmoUniforms = { uSunDir: { value: new THREE.Vector3() }, uWarm: { value: warm }, uCool: { value: cool }, uR: { value: R }, uH: { value: 2.2 } };
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.025, 160, 110),
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: atmoUniforms,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );

  /* stars follow the camera so they never parallax */
  const starMat = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, depthTest: false, depthWrite: false });
  const stars = (() => {
    const count = high ? 3200 : 1600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    let s = 99;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      const u = r() * 2 - 1;
      const t = r() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      pos.set([rr * Math.cos(t) * 40000, u * 40000, rr * Math.sin(t) * 40000], i * 3);
      const b = 0.25 + Math.pow(r(), 6) * 0.9;
      col.set([b * 0.92, b * 0.95, b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, starMat);
    pts.renderOrder = -10;
    pts.frustumCulled = false;
    return pts;
  })();
  scene.add(stars);

  /* routes between pinned stops, drawn flat on the map as the camera flies them */
  const pinSteps = STEPS.map((s, i) => (s.pin ? i : -1)).filter((i) => i >= 0);
  const routeMats: { mat: LineMaterial; px: number }[] = [];
  const routes = pinSteps.slice(0, -1).map((from, r) => {
    const a = dirOf(STEPS[from].lat, STEPS[from].lon);
    const b = dirOf(STEPS[pinSteps[r + 1]].lat, STEPS[pinSteps[r + 1]].lon);
    const distKm = a.angleTo(b) * EARTH_KM;
    const n = Math.max(12, Math.min(320, Math.round(distKm / 30)));
    const pts: number[] = [];
    const v = new THREE.Vector3();
    for (let k = 0; k <= n; k++) {
      slerpDir(a, b, k / n, v).multiplyScalar(R + 1.5 * KM);
      pts.push(v.x, v.y, v.z);
    }
    const geo = new LineGeometry();
    geo.setPositions(pts);
    const mats = ([7, 2.2] as const).map((lw) => {
      const mat = new LineMaterial({ color: 0xff8a3d, linewidth: lw, transparent: true, opacity: 0, depthWrite: false });
      routeMats.push({ mat, px: lw });
      const line = new Line2(geo, mat);
      line.frustumCulled = false;
      scene.add(line);
      return mat;
    });
    return { geo, mats, segments: n, from: a, to: b, arrive: pinSteps[r + 1], progress: 0, focus: 0 };
  });

  /* Pakistan's border, lit while the opening steps are on screen */
  const borderGeo = new LineGeometry();
  borderGeo.setPositions(PAKISTAN_BORDER.flatMap(([lon, lat]) => dirOf(lat, lon).multiplyScalar(R + 1 * KM).toArray()));
  const borderMats = ([6, 1.8] as const).map((lw) => {
    const mat = new LineMaterial({ color: 0xffd2a8, linewidth: lw, transparent: true, opacity: 0, depthWrite: false });
    routeMats.push({ mat, px: lw });
    const line = new Line2(borderGeo, mat);
    line.frustumCulled = false;
    scene.add(line);
    return mat;
  });
  let borderShow = 0;

  const tipGeo = new THREE.BufferGeometry();
  tipGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
  const tipMat = new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.5, 1.0), size: 9, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  const tip = new THREE.Points(tipGeo, tipMat);
  tip.frustumCulled = false;
  scene.add(tip);

  /* sun */
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 4.2) }));
  scene.add(sunGlow);
  const glareTex = (() => {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.min(1, Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2));
        const a = Math.pow(1 - d, 3) * 0.55 + Math.exp(-d * 16) * 0.45;
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = Math.round(clamp01(a) * 255);
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  })();
  const glareMat = new THREE.SpriteMaterial({ map: glareTex, color: new THREE.Color(1.6, 1.32, 1.0), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  const glare = new THREE.Sprite(glareMat);
  glare.scale.setScalar(7000);
  scene.add(glare);

  /* a Starlink train above the horizon from orbit */
  const trainCount = 22;
  const trainPos = new Float32Array(trainCount * 3);
  const trainGeo = new THREE.BufferGeometry();
  trainGeo.setAttribute("position", new THREE.BufferAttribute(trainPos, 3));
  const trainMat = new THREE.PointsMaterial({ color: 0xf3efe6, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  const train = new THREE.Points(trainGeo, trainMat);
  train.frustumCulled = false;
  scene.add(train);

  /* composite */
  const quadUniforms = {
    tScene: { value: rt.texture },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uExposure: { value: 1 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uSpace: { value: new THREE.Vector3() },
  };
  const compositeScene = new THREE.Scene();
  const compositeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: QUAD_FRAG, uniforms: quadUniforms, depthTest: false, depthWrite: false }),
  );
  quad.frustumCulled = false;
  compositeScene.add(quad);

  const pinNormals = pinSteps.map((i) => dirOf(STEPS[i].lat, STEPS[i].lon));
  const pinPoints = pinNormals.map((n) => n.clone().multiplyScalar(R + 0.3));
  const houstonPin = pinSteps.findIndex((i) => STEPS[i].id === "houston");

  /* ---------------------------------- state --------------------------------- */

  let step = 0;
  let fromKey: CamKey = keyOf(0);
  let toKey: CamKey = keyOf(0);
  let fromLook: Look = STEPS[0].look;
  let toLook: Look = STEPS[0].look;
  let t0 = performance.now();
  let duration = 1;
  let lastKey: CamKey = keyOf(0);
  let lastLook: Look = STEPS[0].look;
  let pointerX = 0;
  let pointerY = 0;
  let px = 0;
  let py = 0;
  let active = true;
  let raf = 0;
  let last = performance.now();
  const clock0 = last;

  const T = new THREE.Vector3();
  const G = new THREE.Vector3();
  const north = new THREE.Vector3();
  const east = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const up = new THREE.Vector3();
  const look = new THREE.Vector3();
  const fh = new THREE.Vector3();
  const sun = new THREE.Vector3();
  const right = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);

  function placeCamera(k: CamKey, lk: Look, hump: number) {
    const heading = (k.heading + px * 1.5) * DEG;
    dirOf(k.lat, k.lon, T);
    north.copy(Y).addScaledVector(T, -T.y).normalize();
    east.crossVectors(north, T).normalize();
    fwd.copy(north).multiplyScalar(Math.cos(heading)).addScaledVector(east, Math.sin(heading));
    const a = (k.d * (1 + py * 0.04)) / EARTH_KM;
    G.copy(T).multiplyScalar(Math.cos(a)).addScaledVector(fwd, -Math.sin(a)).normalize();
    camera.position.copy(G).multiplyScalar(R + k.h * KM);
    const oblique = smooth(0.05, 0.45, k.d / Math.max(1, k.h));
    up.copy(fwd).multiplyScalar(1 - oblique).addScaledVector(G, oblique).normalize();
    camera.up.copy(up);
    look.copy(T).multiplyScalar(R);
    camera.lookAt(look);

    // The sun sits `margin` degrees below the visible horizon, `azimuth` degrees off the view direction.
    fh.copy(look).sub(camera.position);
    fh.addScaledVector(G, -fh.dot(G));
    if (fh.lengthSq() < 1e-6) fh.copy(fwd);
    fh.normalize().applyAxisAngle(G, -lk.azimuth * DEG);
    const altUnits = camera.position.length() - R;
    const dip = Math.acos(R / (R + altUnits));
    const elev = -dip - (lk.margin - hump * 9) * DEG;
    sun.copy(fh).multiplyScalar(Math.cos(elev)).addScaledVector(G, Math.sin(elev)).normalize();
    earthUniforms.uSunDir.value.copy(sun);
    atmoUniforms.uSunDir.value.copy(sun);
    sunGlow.position.copy(sun).multiplyScalar(30000).add(camera.position);
    glare.position.copy(sun).multiplyScalar(29000).add(camera.position);
    camera.near = Math.max(0.05, altUnits * 0.05);
    stars.position.copy(camera.position);
    return altUnits / KM;
  }

  function applyLook(lk: Look) {
    warm.setRGB(lk.glow[0], lk.glow[1], lk.glow[2]);
    cool.setRGB(lk.sky[0], lk.sky[1], lk.sky[2]);
    earthUniforms.uLights.value = lk.lights;
    quadUniforms.uExposure.value = lk.exposure;
    quadUniforms.uTint.value.set(lk.tint[0], lk.tint[1], lk.tint[2]);
    quadUniforms.uSpace.value.set(lk.space[0], lk.space[1], lk.space[2]);
    starMat.opacity = Math.min(1, 0.7 * lk.stars);
    starMat.size = 1.7 * (lk.stars > 1 ? 1 + (lk.stars - 1) * 0.35 : 1);
    const sunUp = smooth(0.5, -3, lk.margin);
    glareMat.opacity = sunUp * 0.9;
  }

  function updateRoutes(dt: number) {
    let tipShown = false;
    routes.forEach((r) => {
      const target = step >= r.arrive ? 1 : 0;
      const rate = dt / Math.max(0.5, duration * 0.9);
      r.progress = target > r.progress ? Math.min(target, r.progress + rate) : Math.max(target, r.progress - rate * 2);
      r.geo.instanceCount = Math.floor(easeInOut(r.progress) * r.segments);
      // Only the leg into the current stop stays bright; earlier legs fade back.
      r.focus += ((r.arrive === step ? 1 : 0) - r.focus) * (1 - Math.exp(-dt * 4));
      r.mats[0].opacity = lerp(0.05, 0.18, r.focus);
      r.mats[1].opacity = lerp(0.28, 0.95, r.focus);
      if (!tipShown && r.progress > 0.002 && r.progress < 0.998) {
        slerpDir(r.from, r.to, easeInOut(r.progress), tmp).multiplyScalar(R + 1.5 * KM);
        const pos = tipGeo.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, tmp.x, tmp.y, tmp.z);
        pos.needsUpdate = true;
        tipShown = true;
      }
    });
    tipMat.opacity = tipShown ? 1 : 0;
  }

  function updateTrain(time: number, show: number) {
    trainMat.opacity = 0.85 * show;
    if (show <= 0) return;
    right.crossVectors(fh, G).normalize();
    const v = tmp.copy(fh).multiplyScalar(Math.cos(25 * DEG)).addScaledVector(right, Math.sin(25 * DEG)).normalize();
    const rs = R + 550 * KM;
    const a0 = 0.13 + ((time * 0.004) % 0.1);
    for (let i = 0; i < trainCount; i++) {
      const a = a0 - i * 0.0045;
      trainPos[i * 3] = (G.x * Math.cos(a) + v.x * Math.sin(a)) * rs;
      trainPos[i * 3 + 1] = (G.y * Math.cos(a) + v.y * Math.sin(a)) * rs;
      trainPos[i * 3 + 2] = (G.z * Math.cos(a) + v.z * Math.sin(a)) * rs;
    }
    trainGeo.attributes.position.needsUpdate = true;
  }

  const projected = new THREE.Vector3();
  function pins(): PinInfo[] {
    const current = STEPS[step].id === "title" ? 0 : pinSteps.indexOf(step);
    const orbiting = step > pinSteps[pinSteps.length - 1];
    return pinSteps.map((stepIndex, i) => {
      let state: PinState = "hidden";
      if (orbiting) state = i === houstonPin ? "current" : "visited";
      else if (i === current) state = "current";
      else if (stepIndex < step) state = "visited";
      const P = pinPoints[i];
      const facing = tmp.copy(camera.position).sub(P).normalize().dot(pinNormals[i]) > 0.01;
      projected.copy(P).project(camera);
      const visible = facing && projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05;
      return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, visible, state };
    });
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = (now - clock0) / 1000;
    px += (pointerX - px) * (1 - Math.exp(-dt * 3));
    py += (pointerY - py) * (1 - Math.exp(-dt * 3));

    const u = clamp01((now - t0) / 1000 / duration);
    const { key, hump } = travel(fromKey, toKey, u);
    const lk = mixLook(fromLook, toLook, easeInOut(u));
    // Idle drift once the camera has arrived.
    const settle = smooth(0.85, 1, u);
    key.heading += Math.sin(time * 0.12) * 2.5 * settle;
    key.h *= 1 + Math.sin(time * 0.09) * 0.02 * settle;
    lastKey = key;
    lastLook = lk;

    applyLook(lk);
    const altKm = placeCamera(key, lk, hump);
    camera.updateProjectionMatrix();
    updateRoutes(dt);
    borderShow += ((step <= 1 ? 1 : 0) - borderShow) * (1 - Math.exp(-dt * 3));
    borderMats[0].opacity = 0.2 * borderShow;
    borderMats[1].opacity = 0.9 * borderShow;
    updateTrain(time, STEPS[step].id === "orbit" ? smooth(0.4, 1, u) : 0);

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    quadUniforms.uTime.value = time;
    renderer.setRenderTarget(null);
    renderer.render(compositeScene, compositeCam);

    options.onFrame?.({ pins: pins(), lat: key.lat, lon: key.lon, altitudeKm: altKm });
  }

  function resize(w: number, h: number) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    const pw = Math.floor(width * dpr);
    const ph = Math.floor(height * dpr);
    rt.setSize(pw, ph);
    quadUniforms.uRes.value.set(pw, ph);
    // Shift the look target off-centre so the text column stays clear of it.
    if (width / height < 0.8) {
      const full = height * 1.24;
      camera.fov = (2 * Math.atan(Math.tan(29 * DEG) * (full / height))) / DEG;
      camera.aspect = width / full;
      camera.setViewOffset(width, full, 0, 0, width, height);
    } else {
      const full = width * 1.24;
      camera.fov = 42;
      camera.aspect = full / height;
      camera.setViewOffset(full, height, 0, 0, width, height);
    }
    camera.updateProjectionMatrix();
    routeMats.forEach(({ mat, px: lw }) => {
      mat.resolution.set(pw, ph);
      mat.linewidth = lw * dpr;
    });
  }

  resize(width, height);
  raf = requestAnimationFrame(frame);

  return {
    goTo(next: number) {
      const i = Math.max(0, Math.min(STEPS.length - 1, next));
      if (i === step) return;
      fromKey = { ...lastKey };
      fromLook = lastLook;
      toKey = keyOf(i);
      toLook = STEPS[i].look;
      duration = durationFor(fromKey, toKey);
      t0 = performance.now();
      step = i;
    },
    setPointer(nx: number, ny: number) {
      pointerX = Math.max(-1, Math.min(1, nx));
      pointerY = Math.max(-1, Math.min(1, ny));
    },
    resize,
    setActive(next: boolean) {
      if (next === active) return;
      active = next;
      if (active) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    },
    dispose() {
      cancelAnimationFrame(raf);
      active = false;
      rt.dispose();
      glareTex.dispose();
      textures.forEach((t) => t.dispose());
      routes.forEach((r) => r.geo.dispose());
      borderGeo.dispose();
      [scene, compositeScene].forEach((s) =>
        s.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        }),
      );
      renderer.dispose();
    },
  };
}
