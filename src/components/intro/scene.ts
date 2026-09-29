import * as THREE from "three";

export type ScreenPoint = { x: number; y: number; visible: boolean };

export type IntroSceneOptions = {
  /** `gulfNight` is a sharper crop of the night map covering GULF_RECT. */
  textures: { day: string; night: string; gulfNight?: string };
  quality: "high" | "low";
  onFrame?: (info: { houston: ScreenPoint; altitudeKm: number }) => void;
};

export type IntroSceneHandle = {
  setProgress(p: number): void;
  setPointer(nx: number, ny: number): void;
  resize(width: number, height: number): void;
  setActive(active: boolean): void;
  dispose(): void;
};

const DEG = Math.PI / 180;
const EARTH_R = 1000;
const HOUSTON = { lat: 29.76, lon: -95.37 };
const GULF_RECT = { lon0: -112, lon1: -78, lat0: 16, lat1: 42 };

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function smooth(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type GroundKey = {
  p: number;
  zenith: string;
  horizon: string;
  ground: string;
  fog: string;
  fogDensity: number;
  sun: string;
  sunElevation: number;
  glow: number;
  hemi: number;
  cloud: string;
  cloudShade: string;
  lights: number;
};

const GROUND_KEYS: GroundKey[] = [
  { p: 0.0, zenith: "#101722", horizon: "#4e5c6f", ground: "#1d242e", fog: "#435063", fogDensity: 0.00058, sun: "#ff9a5c", sunElevation: -7, glow: 0.35, hemi: 0.34, cloud: "#6a7684", cloudShade: "#2c3441", lights: 1 },
  { p: 0.3, zenith: "#1d2b40", horizon: "#a8907f", ground: "#2a313b", fog: "#7c7674", fogDensity: 0.00052, sun: "#ffa66b", sunElevation: -2, glow: 0.8, hemi: 0.5, cloud: "#a59891", cloudShade: "#5b5557", lights: 0.6 },
  { p: 0.48, zenith: "#3a5f8c", horizon: "#e2c8ae", ground: "#62676e", fog: "#d8d0c8", fogDensity: 0.0006, sun: "#ffbf8a", sunElevation: 1.2, glow: 1.05, hemi: 0.85, cloud: "#efe3d8", cloudShade: "#a89d97", lights: 0 },
  { p: 0.72, zenith: "#1c4b86", horizon: "#f1c796", ground: "#9aa1aa", fog: "#e3ddd6", fogDensity: 0.0001, sun: "#ffdcb3", sunElevation: 3.8, glow: 1.3, hemi: 1.05, cloud: "#fff4e8", cloudShade: "#a19ea8", lights: 0 },
  { p: 1.0, zenith: "#08162d", horizon: "#86a2c3", ground: "#7d8c9f", fog: "#b3c4d6", fogDensity: 0.00006, sun: "#ffffff", sunElevation: 7, glow: 0.95, hemi: 1.0, cloud: "#f3f6fa", cloudShade: "#a3abb7", lights: 0 },
];

type CamKey = { p: number; pos: [number, number, number]; pitch: number };

const CAM_KEYS: CamKey[] = [
  { p: 0.0, pos: [0, 40, 0], pitch: -2 },
  { p: 0.3, pos: [0, 48, -130], pitch: 0 },
  { p: 0.44, pos: [18, 640, -380], pitch: 9 },
  { p: 0.53, pos: [36, 1120, -540], pitch: 2.5 },
  { p: 0.75, pos: [60, 2300, -900], pitch: -7 },
  { p: 1.0, pos: [80, 3800, -1300], pitch: -3 },
];

function segment<T extends { p: number }>(keys: T[], p: number): [T, T, number] {
  if (p <= keys[0].p) return [keys[0], keys[0], 0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p <= b.p) return [a, b, (p - a.p) / (b.p - a.p)];
  }
  const last = keys[keys.length - 1];
  return [last, last, 0];
}

function sunDirection(elevationDeg: number, azimuthDeg: number, out: THREE.Vector3) {
  const el = elevationDeg * DEG;
  const az = azimuthDeg * DEG;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

/** Direction on a three.js SphereGeometry for a given latitude/longitude. */
function latLonToDir(lat: number, lon: number) {
  const theta = (90 - lat) * DEG;
  const phi = (lon + 180) * DEG;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).normalize();
}

function makeCloudTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const blobs: { x: number; y: number; r: number }[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * 0.22;
    blobs.push({ x: 0.5 + Math.cos(a) * d * 1.4, y: 0.52 + Math.sin(a) * d * 0.7, r: 0.12 + rnd() * 0.14 });
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      let density = 0;
      for (const b of blobs) {
        const dx = (u - b.x) / b.r;
        const dy = (v - b.y) / b.r;
        density += Math.exp(-(dx * dx + dy * dy) * 1.6);
      }
      const edge = smooth(0.5, 0.2, Math.hypot(u - 0.5, (v - 0.5) * 1.35));
      const a = clamp01(density * 0.55) * edge;
      const light = clamp01(0.45 + (1 - v) * 0.7 + density * 0.08);
      const i = (y * size + x) * 4;
      data[i] = Math.round(light * 255);
      data[i + 1] = data[i];
      data[i + 2] = data[i];
      data[i + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.flipY = true;
  return tex;
}

function lattice(height: number, base: number, levels: number): Float32Array {
  const pts: number[] = [];
  const legs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let i = 0; i < levels; i++) {
    const t0 = i / levels;
    const t1 = (i + 1) / levels;
    const w0 = base * (1 - t0 * 0.82);
    const w1 = base * (1 - t1 * 0.82);
    const y0 = t0 * height;
    const y1 = t1 * height;
    for (let k = 0; k < 4; k++) {
      const [ax, az] = legs[k];
      const [bx, bz] = legs[(k + 1) % 4];
      pts.push(ax * w0, y0, az * w0, ax * w1, y1, az * w1);
      pts.push(ax * w0, y0, az * w0, bx * w1, y1, bz * w1);
      pts.push(ax * w1, y1, az * w1, bx * w1, y1, bz * w1);
    }
  }
  return new Float32Array(pts);
}

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uGlow;
  uniform float uCity;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.42));
    col += vec3(1.0, 0.52, 0.22) * uCity * exp(-max(h, 0.0) * 22.0);
    col = mix(col, uGround, smoothstep(0.0, -0.06, h));
    float s = max(dot(d, uSunDir), 0.0);
    vec3 flatD = normalize(vec3(d.x, 0.0001, d.z));
    vec3 flatS = normalize(vec3(uSunDir.x, 0.0001, uSunDir.z));
    float band = exp(-abs(h - uSunDir.y * 0.5) * 9.0) * pow(max(dot(flatD, flatS), 0.0), 4.0);
    col += uSunColor * (pow(s, 1800.0) * 8.0 + pow(s, 48.0) * 0.45 * uGlow + pow(s, 6.0) * 0.16 * uGlow + band * 0.32 * uGlow);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const CLOUD_VERT = /* glsl */ `
  attribute vec3 offset;
  attribute float scale;
  attribute float rot;
  attribute float alpha;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vUv = uv;
    vAlpha = alpha;
    vec4 center = modelViewMatrix * vec4(offset, 1.0);
    float c = cos(rot);
    float s = sin(rot);
    vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * scale;
    vec4 mv = center + vec4(q.x, q.y * 0.62, 0.0, 0.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float a = t.a * vAlpha * uOpacity * smoothstep(12.0, 140.0, vDepth);
    if (a < 0.004) discard;
    vec3 col = mix(uShade, uLit, t.r);
    float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, a);
  }
`;

const LIGHT_VERT = /* glsl */ `
  attribute vec3 aEnd;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uFogDensity;
  varying vec3 vColor;
  varying float vFog;
  varying float vEnergy;
  void main() {
    vec3 p = mix(position, aEnd, fract(aPhase + uTime * aSpeed));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = -mv.z;
    float s = aSize * uScale / d;
    float sz = clamp(s, 2.0, 7.0);
    vEnergy = clamp(s / sz, 0.45, 1.0);
    gl_PointSize = sz * uPixelRatio;
    vFog = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`;

// Sub-2px lights are drawn at 2px and dimmed instead, so they don't vanish between pixel centres.
const LIGHT_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uFogColor;
  varying vec3 vColor;
  varying float vFog;
  varying float vEnergy;
  void main() {
    float a = 1.0 - smoothstep(0.35, 1.0, length(gl_PointCoord - 0.5) * 2.0);
    gl_FragColor = vec4(mix(vColor, uFogColor, vFog * 0.6) * a * vEnergy * uOpacity * (1.0 - vFog * 0.55), 1.0);
  }
`;

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
  uniform sampler2D uNightHi;
  uniform vec4 uHiRect;
  uniform float uHasTex;
  uniform float uHasHi;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.14, 0.22, ndl);
    vec3 dayTex = mix(vec3(0.05, 0.11, 0.2), texture2D(uDay, vUv).rgb, uHasTex);
    vec3 nightTex = texture2D(uNight, vUv).rgb * uHasTex;
    vec2 hq = (vUv - uHiRect.xy) / (uHiRect.zw - uHiRect.xy);
    float hiEdge = min(min(hq.x, 1.0 - hq.x), min(hq.y, 1.0 - hq.y));
    nightTex = mix(nightTex, texture2D(uNightHi, clamp(hq, 0.0, 1.0)).rgb, uHasHi * uHasTex * smoothstep(0.0, 0.12, hiEdge));
    vec3 lit = dayTex * (0.04 + max(ndl, 0.0) * 1.3);
    float lights = smoothstep(0.34, 0.86, nightTex.r) * smoothstep(0.22, 0.72, nightTex.g);
    vec3 night = nightTex * 0.2 + vec3(0.004, 0.007, 0.014) + vec3(1.0, 0.74, 0.46) * lights * 1.2;
    vec3 col = mix(night, lit, day);
    vec3 v = normalize(cameraPosition - vPosW);
    float ocean = smoothstep(0.02, -0.05, dayTex.g - dayTex.b) * uHasTex;
    vec3 hv = normalize(uSunDir + v);
    col += vec3(1.0, 0.86, 0.68) * pow(max(dot(n, hv), 0.0), 70.0) * ocean * day * 0.55;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 haze = mix(vec3(1.0, 0.45, 0.2), vec3(0.32, 0.55, 1.0), smoothstep(0.0, 0.35, ndl));
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
    vec3 warm = mix(vec3(1.0, 0.28, 0.08), vec3(1.0, 0.66, 0.34), smoothstep(0.0, 2.2 * uH, h));
    vec3 col = mix(vec3(0.22, 0.46, 1.0), warm, twilight * exp(-h / (2.6 * uH)));
    float fwd = pow(max(dot(rd, uSunDir), 0.0), 6.0);
    vec3 glow = col * dens * lit * (0.9 + fwd * 3.0);
    glow += vec3(0.3, 0.85, 0.45) * exp(-pow((h - 6.8 * uH) / (0.5 * uH), 2.0)) * (1.0 - lit) * 0.06;
    glow += vec3(0.02, 0.035, 0.08) * dens * (1.0 - lit);
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
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform float uUseA;
  uniform float uUseB;
  uniform vec2 uRes;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uRing;
  uniform float uTime;
  uniform float uExposure;
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
    vec2 px = vUv * uRes;
    float d = distance(px, uCenter * uRes);
    float m = 1.0 - smoothstep(uRadius - 1.5, uRadius + 1.5, d);
    m = uUseA < 0.5 ? 1.0 : (uUseB < 0.5 ? 0.0 : m);
    vec3 a = uUseA > 0.5 ? texture2D(tA, vUv).rgb : vec3(0.0);
    vec3 b = uUseB > 0.5 ? texture2D(tB, vUv).rgb : vec3(0.0);
    vec3 col = toSrgb(aces(mix(a, b, m) * uExposure));
    float ring = (1.0 - smoothstep(0.0, 1.4, abs(d - uRadius))) * uRing;
    float ring2 = (1.0 - smoothstep(0.0, 1.0, abs(d - uRadius - 9.0))) * uRing * 0.35;
    col = mix(col, vec3(0.97, 0.95, 0.92), clamp(ring + ring2, 0.0, 1.0));
    vec2 q = vUv - 0.5;
    col *= 1.0 - dot(q, q) * 0.5;
    float n = fract(sin(dot(px + fract(uTime) * 97.13, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.028;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createIntroScene(canvas: HTMLCanvasElement, options: IntroSceneOptions): IntroSceneHandle {
  const high = options.quality === "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, high ? 1.6 : 1);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0b0e12, 1);

  let width = canvas.clientWidth || window.innerWidth;
  let height = canvas.clientHeight || window.innerHeight;

  const rtOpts = { type: THREE.HalfFloatType, samples: high ? 4 : 0, depthBuffer: true };
  const rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts);

  /* ------------------------------ ground scene ------------------------------ */

  const ground = new THREE.Scene();
  const fog = new THREE.FogExp2(0x435063, 0.0006);
  ground.fog = fog;
  const camG = new THREE.PerspectiveCamera(52, width / height, 0.5, 60000);

  const skyUniforms = {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
    uGlow: { value: 1 },
    uCity: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40000, 48, 24),
    new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  ground.add(sky);

  const groundMat = new THREE.MeshBasicMaterial({ color: 0x161b21 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000), groundMat);
  plane.rotation.x = -Math.PI / 2;
  ground.add(plane);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.4);
  ground.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
  ground.add(sunLight);

  const buildingMat = new THREE.MeshLambertMaterial({ color: 0x1c2229 });
  const buildingCount = high ? 190 : 110;
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildingMat, buildingCount);
  const lightPositions: number[] = [];
  {
    const m = new THREE.Matrix4();
    let s = 42;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < buildingCount; i++) {
      const downtown = i < buildingCount * 0.45;
      const x = downtown ? (r() - 0.5) * 520 + 90 : (r() - 0.5) * 3200;
      const z = downtown ? -2050 - r() * 420 : -900 - r() * 2600;
      const h = downtown ? 60 + Math.pow(r(), 1.8) * 290 : 8 + r() * 26;
      const w = downtown ? 22 + r() * 34 : 18 + r() * 40;
      m.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w * (0.7 + r() * 0.6)));
      buildings.setMatrixAt(i, m);
      const lights = downtown ? Math.floor(h / 12) : 1;
      for (let k = 0; k < lights; k++) {
        if (r() < 0.55) lightPositions.push(x + (r() - 0.5) * w * 0.9, 4 + r() * (h - 6), z + w * 0.5 + 0.5);
      }
    }
    buildings.instanceMatrix.needsUpdate = true;
  }
  ground.add(buildings);

  const cityLightsMat = new THREE.PointsMaterial({ color: 0xffc27a, size: 2, sizeAttenuation: false, transparent: true, opacity: 1, fog: false, depthWrite: false });
  const cityLightsGeo = new THREE.BufferGeometry();
  cityLightsGeo.setAttribute("position", new THREE.Float32BufferAttribute(lightPositions, 3));
  ground.add(new THREE.Points(cityLightsGeo, cityLightsMat));

  const lightUniforms = {
    uTime: { value: 0 },
    uScale: { value: 900 },
    uPixelRatio: { value: dpr },
    uFogDensity: { value: 0.0006 },
    uFogColor: { value: new THREE.Color() },
    uOpacity: { value: 1 },
  };
  {
    const start: number[] = [];
    const end: number[] = [];
    const color: number[] = [];
    const size: number[] = [];
    const phase: number[] = [];
    const speed: number[] = [];
    let s = 777;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const sodium = new THREE.Color("#ff9f4a").multiplyScalar(2.2);
    const led = new THREE.Color("#ffe2bd").multiplyScalar(1.8);
    const head = new THREE.Color("#fff3dc").multiplyScalar(2.6);
    const tail = new THREE.Color("#ff2a14").multiplyScalar(2.2);
    type V3 = [number, number, number];
    const push = (a: V3, c: THREE.Color, sz: number, b: V3 = a, ph = 0, sp = 0) => {
      start.push(...a);
      end.push(...b);
      color.push(c.r, c.g, c.b);
      size.push(sz);
      phase.push(ph);
      speed.push(sp);
    };
    const inView = (x: number, z: number) => Math.abs(x) < 80 + -z * 0.98;
    const keep = high ? 1 : 0.5;
    for (let z = -70; z > -5200; z -= 55 + r() * 30) {
      const density = 0.65 * keep * (z < -2600 ? 0.6 : 1);
      for (let x = -3600; x < 3600; x += 26) {
        if (!inView(x, z) || r() > density) continue;
        push([x + (r() - 0.5) * 3, 6, z + (r() - 0.5) * 2], r() < 0.62 ? sodium : led, 0.55);
      }
    }
    for (let x = -3600; x < 3600; x += 70 + r() * 50) {
      for (let z = -60; z > -5200; z -= 30) {
        if (!inView(x, z) || r() > 0.55 * keep) continue;
        push([x + (r() - 0.5) * 2, 6, z + (r() - 0.5) * 3], r() < 0.62 ? sodium : led, 0.55);
      }
    }
    const freeways: [number, number, number, number, boolean][] = [
      [-30, -40, 70, -2150, true],
      [-2400, -380, 2600, -760, false],
      [-1900, -120, -10, -2250, true],
    ];
    for (const [x0, z0, x1, z1, radial] of freeways) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const nx = -(z1 - z0) / len;
      const nz = (x1 - x0) / len;
      for (let d = 0; d < len; d += 28) {
        const t = d / len;
        for (const side of [-1, 1]) push([mix(x0, x1, t) + nx * side * 9, 10, mix(z0, z1, t) + nz * side * 9], sodium, 0.7);
      }
      const cars = Math.round((len / 16) * keep);
      for (let i = 0; i < cars; i++) {
        const outbound = i % 2 === 0;
        const lane = (outbound ? 1 : -1) * (2.5 + (i % 4 < 2 ? 0 : 3.5));
        const a: V3 = [x0 + nx * lane, 1, z0 + nz * lane];
        const b: V3 = [x1 + nx * lane, 1, z1 + nz * lane];
        const lamp = radial ? (outbound ? tail : head) : r() < 0.5 ? tail : head;
        push(outbound ? a : b, lamp, 0.6, outbound ? b : a, r(), (24 + r() * 10) / len);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(start, 3));
    geo.setAttribute("aEnd", new THREE.Float32BufferAttribute(end, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(color, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    geo.setAttribute("aSpeed", new THREE.Float32BufferAttribute(speed, 1));
    const streetLights = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: LIGHT_VERT,
        fragmentShader: LIGHT_FRAG,
        uniforms: lightUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    streetLights.frustumCulled = false;
    ground.add(streetLights);
  }

  const steelMat = new THREE.LineBasicMaterial({ color: 0x2a3038, transparent: true, opacity: 0.9 });
  const mastGeo = new THREE.BufferGeometry();
  mastGeo.setAttribute("position", new THREE.BufferAttribute(lattice(170, 6, 18), 3));
  const masts: THREE.LineSegments[] = [];
  for (const [x, z, s] of [
    [150, -620, 1],
    [-420, -1300, 1.25],
    [760, -1700, 1.4],
  ] as const) {
    const mast = new THREE.LineSegments(mastGeo, steelMat);
    mast.position.set(x, 0, z);
    mast.scale.setScalar(s);
    ground.add(mast);
    masts.push(mast);
  }
  const beaconMat = new THREE.PointsMaterial({ color: 0xff3a2a, size: 5, sizeAttenuation: false, transparent: true, opacity: 1, fog: false, depthWrite: false });
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute("position", new THREE.Float32BufferAttribute(masts.flatMap((mst) => [mst.position.x, 170 * mst.scale.y + 2, mst.position.z]), 3));
  ground.add(new THREE.Points(beaconGeo, beaconMat));

  const cloudTex = makeCloudTexture();
  const cloudCount = high ? 620 : 280;
  const cloudGeo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  cloudGeo.index = quad.index;
  cloudGeo.setAttribute("position", quad.getAttribute("position"));
  cloudGeo.setAttribute("uv", quad.getAttribute("uv"));
  {
    const offsets = new Float32Array(cloudCount * 3);
    const scales = new Float32Array(cloudCount);
    const rots = new Float32Array(cloudCount);
    const alphas = new Float32Array(cloudCount);
    let s = 1234;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < cloudCount; i++) {
      const far = r();
      offsets[i * 3] = (r() - 0.5) * (5200 + far * 9000);
      offsets[i * 3 + 1] = 780 + r() * 230;
      offsets[i * 3 + 2] = 1500 - far * far * 12500;
      scales[i] = (320 + r() * 620) * (1 + far * 1.6);
      rots[i] = (r() - 0.5) * 0.5;
      alphas[i] = 0.55 + r() * 0.45;
    }
    cloudGeo.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3));
    cloudGeo.setAttribute("scale", new THREE.InstancedBufferAttribute(scales, 1));
    cloudGeo.setAttribute("rot", new THREE.InstancedBufferAttribute(rots, 1));
    cloudGeo.setAttribute("alpha", new THREE.InstancedBufferAttribute(alphas, 1));
    cloudGeo.instanceCount = cloudCount;
  }
  const cloudUniforms = {
    uMap: { value: cloudTex },
    uLit: { value: new THREE.Color() },
    uShade: { value: new THREE.Color() },
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.0006 },
    uOpacity: { value: 1 },
  };
  const clouds = new THREE.Mesh(
    cloudGeo,
    new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, uniforms: cloudUniforms, transparent: true, depthWrite: false }),
  );
  clouds.frustumCulled = false;
  ground.add(clouds);

  /* ------------------------------- orbit scene ------------------------------ */

  const orbit = new THREE.Scene();
  const camO = new THREE.PerspectiveCamera(42, width / height, 1, 90000);
  const camP = new THREE.PerspectiveCamera(30, 1, 1, 90000);

  const orbitAltitude = 0.075;
  camO.position.set(0, EARTH_R * (1 + orbitAltitude), 0);
  const horizonDip = Math.acos(1 / (1 + orbitAltitude));
  const sunO = new THREE.Vector3(0, -Math.sin(horizonDip + 1.4 * DEG), -Math.cos(horizonDip + 1.4 * DEG)).normalize();

  const loader = new THREE.TextureLoader();
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const earthUniforms = {
    uDay: { value: blank as THREE.Texture },
    uNight: { value: blank as THREE.Texture },
    uNightHi: { value: blank as THREE.Texture },
    uHiRect: {
      value: new THREE.Vector4(
        (GULF_RECT.lon0 + 180) / 360,
        (GULF_RECT.lat0 + 90) / 180,
        (GULF_RECT.lon1 + 180) / 360,
        (GULF_RECT.lat1 + 90) / 180,
      ),
    },
    uHasTex: { value: 0 },
    uHasHi: { value: 0 },
    uSunDir: { value: sunO.clone() },
  };
  let loaded = 0;
  const onTex = (key: "uDay" | "uNight") => (tex: THREE.Texture) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    earthUniforms[key].value = tex;
    loaded += 1;
    if (loaded === 2) earthUniforms.uHasTex.value = 1;
  };
  loader.load(options.textures.day, onTex("uDay"));
  loader.load(options.textures.night, onTex("uNight"));
  if (options.textures.gulfNight) {
    loader.load(options.textures.gulfNight, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      earthUniforms.uNightHi.value = tex;
      earthUniforms.uHasHi.value = 1;
    });
  }

  const earthGroup = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, high ? 160 : 96, high ? 110 : 64),
    new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: earthUniforms }),
  );
  earthGroup.add(earth);
  const atmoUniforms = { uSunDir: { value: sunO.clone() }, uR: { value: EARTH_R }, uH: { value: 2.2 } };
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.025, 160, 110),
    new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: atmoUniforms,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  orbit.add(earthGroup, atmosphere);

  const houstonLocal = latLonToDir(HOUSTON.lat, HOUSTON.lon);
  const houstonTarget = new THREE.Vector3(0, Math.cos(13 * DEG), -Math.sin(13 * DEG)).normalize();
  const houstonNorthWorld = new THREE.Vector3();
  {
    // Face east toward the sunrise: local east -> screen forward, local north -> screen left.
    const upL = houstonLocal.clone();
    const northL = latLonToDir(HOUSTON.lat + 0.5, HOUSTON.lon).sub(latLonToDir(HOUSTON.lat - 0.5, HOUSTON.lon));
    northL.addScaledVector(upL, -northL.dot(upL)).normalize();
    const eastL = new THREE.Vector3().crossVectors(northL, upL).normalize();
    const upT = houstonTarget.clone();
    const eastT = new THREE.Vector3(0, 0, -1);
    eastT.addScaledVector(upT, -eastT.dot(upT)).normalize();
    const northT = new THREE.Vector3().crossVectors(upT, eastT).normalize();
    const mL = new THREE.Matrix4().makeBasis(eastL, northL, upL);
    const mT = new THREE.Matrix4().makeBasis(eastT, northT, upT);
    earthGroup.quaternion.setFromRotationMatrix(mT.multiply(mL.transpose()));
    houstonNorthWorld.copy(northT);
  }

  {
    const starCount = high ? 2600 : 1400;
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    let s = 99;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < starCount; i++) {
      const u = r() * 2 - 1;
      const t = r() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      pos.set([rr * Math.cos(t) * 50000, u * 50000, rr * Math.sin(t) * 50000], i * 3);
      const b = 0.25 + Math.pow(r(), 6) * 0.9;
      col.set([b * 0.92, b * 0.95, b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    orbit.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false })));
  }

  const trainCount = 22;
  const trainGeo = new THREE.BufferGeometry();
  const trainPos = new Float32Array(trainCount * 3);
  trainGeo.setAttribute("position", new THREE.BufferAttribute(trainPos, 3));
  const trainMat = new THREE.PointsMaterial({ color: 0xf3efe6, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false });
  const train = new THREE.Points(trainGeo, trainMat);
  train.frustumCulled = false;
  orbit.add(train);

  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(260, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 4.2), transparent: true, opacity: 1 }),
  );
  orbit.add(sunGlow);

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
  const glareMat = new THREE.SpriteMaterial({
    map: glareTex,
    color: new THREE.Color(1.6, 1.32, 1.0),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const glare = new THREE.Sprite(glareMat);
  glare.scale.setScalar(7000);
  orbit.add(glare);

  const houstonWorld = new THREE.Vector3();
  const houstonNormal = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function aimPortholeCamera() {
    houstonNormal.copy(houstonLocal).applyQuaternion(earthGroup.quaternion).normalize();
    houstonWorld.copy(houstonNormal).multiplyScalar(EARTH_R);
    camP.position.copy(houstonNormal).multiplyScalar(EARTH_R * 1.5).addScaledVector(houstonNorthWorld, -EARTH_R * 0.16);
    camP.up.copy(houstonNorthWorld);
    camP.lookAt(houstonWorld);
  }
  aimPortholeCamera();

  /* ------------------------------- composite -------------------------------- */

  const quadUniforms = {
    tA: { value: rtA.texture },
    tB: { value: rtB.texture },
    uUseA: { value: 1 },
    uUseB: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uRadius: { value: 0 },
    uRing: { value: 0 },
    uTime: { value: 0 },
    uExposure: { value: 1 },
  };
  const compositeScene = new THREE.Scene();
  const compositeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const compositeQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: QUAD_FRAG, uniforms: quadUniforms, depthTest: false, depthWrite: false }),
  );
  compositeQuad.frustumCulled = false;
  compositeScene.add(compositeQuad);

  /* --------------------------------- state ---------------------------------- */

  let target = 0;
  let current = 0;
  let pointerX = 0;
  let pointerY = 0;
  let px = 0;
  let py = 0;
  let active = true;
  let raf = 0;
  let last = performance.now();
  const clock0 = last;

  const cA = new THREE.Color();
  const cB = new THREE.Color();
  const sunDir = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function lerpColor(out: THREE.Color, a: string, b: string, t: number) {
    cA.set(a);
    cB.set(b);
    return out.copy(cA).lerp(cB, t);
  }

  function applyGround(p: number, time: number) {
    const [a, b, tRaw] = segment(GROUND_KEYS, p);
    const t = tRaw * tRaw * (3 - 2 * tRaw);
    lerpColor(skyUniforms.uZenith.value, a.zenith, b.zenith, t);
    lerpColor(skyUniforms.uHorizon.value, a.horizon, b.horizon, t);
    lerpColor(skyUniforms.uGround.value, a.ground, b.ground, t);
    lerpColor(skyUniforms.uSunColor.value, a.sun, b.sun, t);
    skyUniforms.uGlow.value = mix(a.glow, b.glow, t);
    sunDirection(mix(a.sunElevation, b.sunElevation, t), 14, sunDir);
    skyUniforms.uSunDir.value.copy(sunDir);

    lerpColor(groundMat.color, a.ground, b.ground, t);
    lerpColor(fog.color, a.fog, b.fog, t);
    const [ck, dk, ctRaw] = segment(CAM_KEYS, p);
    const ct = ctRaw * ctRaw * (3 - 2 * ctRaw);
    camPos.set(mix(ck.pos[0], dk.pos[0], ct), mix(ck.pos[1], dk.pos[1], ct), mix(ck.pos[2], dk.pos[2], ct));
    camPos.y += Math.sin(time * 0.45) * (camPos.y < 60 ? 0.05 : 1.5);
    const inCloud = smooth(700, 820, camPos.y) * (1 - smooth(980, 1100, camPos.y));
    fog.density = mix(a.fogDensity, b.fogDensity, t) + inCloud * 0.0105;
    lerpColor(cloudUniforms.uLit.value, a.cloud, b.cloud, t);
    lerpColor(cloudUniforms.uShade.value, a.cloudShade, b.cloudShade, t);
    if (inCloud > 0) fog.color.lerp(cloudUniforms.uLit.value, inCloud * 0.85);
    cloudUniforms.uFogColor.value.copy(fog.color);
    cloudUniforms.uFogDensity.value = fog.density * 0.55;

    hemi.intensity = mix(a.hemi, b.hemi, t);
    hemi.color.copy(skyUniforms.uZenith.value).lerp(skyUniforms.uHorizon.value, 0.5);
    hemi.groundColor.copy(groundMat.color);
    sunLight.color.copy(skyUniforms.uSunColor.value);
    sunLight.intensity = Math.max(0, sunDir.y + 0.05) * 3;
    sunLight.position.copy(sunDir).multiplyScalar(1000);

    const lights = mix(a.lights, b.lights, t);
    cityLightsMat.opacity = lights;
    lightUniforms.uOpacity.value = lights;
    skyUniforms.uCity.value = lights * 0.035;
    lightUniforms.uTime.value = time;
    lightUniforms.uFogDensity.value = fog.density;
    lightUniforms.uFogColor.value.copy(fog.color);
    beaconMat.opacity = (Math.sin(time * 3.1) > 0.35 ? 1 : 0.06) * Math.max(lights, 0.2) * (camPos.y < 1200 ? 1 : 0);
    steelMat.color.copy(groundMat.color).multiplyScalar(0.7);
    buildingMat.color.copy(groundMat.color).multiplyScalar(0.92);

    const pitch = mix(ck.pitch, dk.pitch, ct) * DEG + py * 0.9 * DEG;
    const yaw = px * 1.6 * DEG;
    camG.position.copy(camPos);
    sky.position.copy(camPos);
    lookTarget.set(Math.sin(yaw) * 100, Math.tan(pitch) * 100, -Math.cos(yaw) * 100).add(camPos);
    camG.lookAt(lookTarget);
    return camPos.y;
  }

  function applyOrbit(p: number, time: number) {
    const rise = smooth(0.9, 1.0, p);
    const sunAngle = mix(horizonDip / DEG + 1.5, 16.5, rise) * DEG;
    sunO.set(0, -Math.sin(sunAngle), -Math.cos(sunAngle)).normalize();
    earthUniforms.uSunDir.value.copy(sunO);
    atmoUniforms.uSunDir.value.copy(sunO);
    sunGlow.position.copy(sunO).multiplyScalar(30000);
    glare.position.copy(sunO).multiplyScalar(29000);
    glareMat.opacity = smooth(0.91, 0.99, p);

    const tilt = mix(20.8, 15.5 - rise * 1.5, smooth(0.8, 0.93, p)) * DEG + py * 0.6 * DEG;
    const yaw = px * 1.4 * DEG;
    tmp.set(Math.sin(yaw), -Math.tan(tilt), -Math.cos(yaw)).normalize().multiplyScalar(100).add(camO.position);
    camO.up.set(0, 1, 0);
    camO.lookAt(tmp);

    const phase = time * 0.018;
    for (let i = 0; i < trainCount; i++) {
      const a = phase - i * 0.0042;
      const rr = EARTH_R * 1.095;
      trainPos[i * 3] = Math.sin(a * 6.2832 + 1.1) * rr * 0.32;
      trainPos[i * 3 + 1] = Math.cos(a * 6.2832 + 1.1) * rr * 0.04 + rr * 0.985;
      trainPos[i * 3 + 2] = -rr * 0.18 - Math.cos(a * 6.2832 + 1.1) * rr * 0.12;
    }
    trainGeo.attributes.position.needsUpdate = true;
    trainMat.opacity = 0.85 * smooth(0.9, 0.97, p);
  }

  function houstonScreen(): ScreenPoint {
    const cam = camO;
    const toCam = tmp.copy(cam.position).sub(houstonWorld);
    const facing = toCam.normalize().dot(houstonNormal) > 0.02;
    const v = houstonWorld.clone().project(cam);
    const visible = facing && v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, visible };
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = (now - clock0) / 1000;
    current += (target - current) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - current) < 0.00005) current = target;
    px += (pointerX - px) * (1 - Math.exp(-dt * 3));
    py += (pointerY - py) * (1 - Math.exp(-dt * 3));
    const p = current;

    const portrait = width / height < 0.8;
    const minDim = Math.min(width, height);
    const portIn = smooth(0.195, 0.235, p);
    const portOut = 1 - smooth(0.3, 0.335, p);
    const port = Math.min(portIn, portOut);
    const launch = smooth(0.755, 0.9, p);
    const fullR = Math.hypot(width, height) * 0.52;

    let radius = 0;
    let ring = 0;
    let usePorthole = false;
    if (p < 0.5) {
      const finalR = (portrait ? 0.3 : 0.17) * minDim;
      radius = finalR * port;
      ring = port * 0.9;
      usePorthole = true;
      const u = portrait ? 0.5 : 0.74;
      const v = portrait ? 0.36 : 0.53;
      quadUniforms.uCenter.value.set(u, v);
      if (radius > 0.5) {
        // Put Houston on the porthole's centre at a fixed angular radius, whatever the viewport.
        const cx = u * width;
        const cy = (1 - v) * height;
        const fullW = 2 * Math.max(cx, width - cx);
        const fullH = 2 * Math.max(cy, height - cy);
        camP.fov = (2 * Math.atan((Math.tan(7.5 * DEG) * fullH) / 2 / finalR)) / DEG;
        camP.aspect = fullW / fullH;
        camP.setViewOffset(fullW, fullH, fullW / 2 - cx, fullH / 2 - cy, width, height);
      }
    } else {
      radius = fullR * Math.pow(launch, 1.4);
      ring = launch > 0 ? (1 - launch) * 0.9 : 0;
      quadUniforms.uCenter.value.set(0.5, 0.5);
    }
    const needA = !(p >= 0.5 && launch >= 0.999);
    const needB = radius > 0.5;

    const camY = applyGround(p, time);
    if (needB) applyOrbit(p, time);

    if (needA) {
      renderer.setRenderTarget(rtA);
      renderer.render(ground, camG);
    }
    if (needB) {
      renderer.setRenderTarget(rtB);
      renderer.render(orbit, usePorthole ? camP : camO);
    }
    quadUniforms.uUseA.value = needA ? 1 : 0;
    quadUniforms.uUseB.value = needB ? 1 : 0;
    quadUniforms.uRadius.value = radius * dpr;
    quadUniforms.uRing.value = ring;
    quadUniforms.uTime.value = time;
    renderer.setRenderTarget(null);
    renderer.render(compositeScene, compositeCam);

    const groundKm = camY * 0.001 * (1 + smooth(40, 1000, camY) * 1.2);
    const altitudeKm = p < 0.755 ? groundKm : mix(groundKm, 408, smooth(0.755, 0.97, p));
    options.onFrame?.({ houston: p > 0.9 ? houstonScreen() : { x: 0, y: 0, visible: false }, altitudeKm });
  }

  function resize(w: number, h: number) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    const pw = Math.floor(width * dpr);
    const ph = Math.floor(height * dpr);
    rtA.setSize(pw, ph);
    rtB.setSize(pw, ph);
    quadUniforms.uRes.value.set(pw, ph);
    camG.aspect = width / height;
    camG.fov = width / height < 0.8 ? 64 : 52;
    camG.updateProjectionMatrix();
    lightUniforms.uScale.value = height / 2 / Math.tan((camG.fov * DEG) / 2);
    camO.aspect = width / height;
    camO.fov = width / height < 0.8 ? 58 : 42;
    camO.updateProjectionMatrix();
  }

  resize(width, height);
  raf = requestAnimationFrame(frame);

  return {
    setProgress(p: number) {
      target = clamp01(p);
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
      rtA.dispose();
      rtB.dispose();
      cloudTex.dispose();
      glareTex.dispose();
      [ground, orbit, compositeScene].forEach((scene) =>
        scene.traverse((obj) => {
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
