import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Scene units are feet. The module axis runs along x at height AXIS_Y. */

export type DestinyMode = "assembled" | "cutaway" | "transport" | "door";
export type DestinyView = "overview" | "side" | "inside" | "top";
export type PartKind = "shell" | "cone" | "bulkhead" | "truss" | "stringer" | "wall" | "screen" | "floor" | "ceiling" | "base" | "cradle" | "hvac" | "ramp";

export type PartInfo = { kind: PartKind; name: string; qty: number; dims: [number, number, number]; fits: boolean; material: string };
export type LabelInfo = { id: string; text: string; sub: string; x: number; y: number; visible: boolean };

export type DestinyOptions = {
  onLabels?: (labels: LabelInfo[]) => void;
  onHover?: (hit: { part: PartInfo; x: number; y: number } | null) => void;
  onDoorPart?: (part: PartInfo | null) => void;
  onReady?: (parts: PartInfo[]) => void;
};

export type DestinyHandle = {
  setMode(mode: DestinyMode): void;
  setView(view: DestinyView): void;
  setSpin(on: boolean): void;
  resize(): void;
  dispose(): void;
};

export const DOOR = { w: 3, h: 7 };
/** The door stands in front of the shipping stacks; parts cross it along x. */
const DOOR_Z = 22;
const R = 7;
const AXIS_Y = 7.6;
const FLOOR_Y = 1.8;
const CEIL_Y = 8.8;
const HALF_W = 2.8;
const BARREL = 10;
const CONE = 4;
const CONE_R = 6.6;
const TRUSS_R = 6.5;
const RING_X = [-7.5, -2.5, 2.5, 7.5];

const NAMES: Record<PartKind, { name: string; material: string }> = {
  shell: { name: "Aluminum shell panel", material: "Bolted aluminum" },
  cone: { name: "End cone quarter", material: "Layered plywood, interlocking" },
  bulkhead: { name: "End bulkhead half", material: "Layered plywood" },
  truss: { name: "Truss ring quarter", material: "Southern Yellow Pine" },
  stringer: { name: "Truss stringer", material: "Southern Yellow Pine" },
  wall: { name: "Corridor wall half", material: "Hinged panel, folds flat" },
  screen: { name: "Touchscreen", material: "55-inch display" },
  floor: { name: "Floor panel", material: "Plywood, rubber top" },
  ceiling: { name: "Ceiling panel with lights", material: "Panel with LED strips" },
  base: { name: "Base platform section", material: "Wood with sheet-metal skin" },
  cradle: { name: "Cradle wedge", material: "Wood" },
  hvac: { name: "HVAC unit", material: "Packaged air handler" },
  ramp: { name: "Ramp section", material: "Plywood, non-slip top" },
};

export function fitsDoor(dims: [number, number, number]) {
  const [a, b] = [...dims].sort((x, y) => x - y);
  return a <= DOOR.w && b <= DOOR.h;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------ canvas textures ----------------------------- */

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function woodTexture(base: string, grain: string, seed: number, plies = false) {
  const rnd = seeded(seed);
  const tex = canvasTexture(512, 512, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = grain;
      c.globalAlpha = 0.08 + rnd() * 0.16;
      c.lineWidth = 1 + rnd() * 2.5;
      c.beginPath();
      const y = rnd() * 512;
      c.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) c.lineTo(x, y + Math.sin(x * 0.012 + i) * (4 + rnd() * 8));
      c.stroke();
    }
    if (plies) {
      c.globalAlpha = 0.35;
      c.fillStyle = "#6d4a26";
      for (let y = 0; y < 512; y += 22) c.fillRect(0, y, 512, 2);
    }
    c.globalAlpha = 1;
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function brushedTexture() {
  const rnd = seeded(5);
  const tex = canvasTexture(
    256,
    256,
    (c) => {
      c.fillStyle = "#8a8a8a";
      c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 700; i++) {
        c.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},0.05)`;
        c.fillRect(0, rnd() * 256, 256, 1);
      }
    },
    false,
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function screenTexture(kind: number) {
  return canvasTexture(640, 368, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 368);
    g.addColorStop(0, "#0b1a2e");
    g.addColorStop(1, "#06101d");
    c.fillStyle = g;
    c.fillRect(0, 0, 640, 368);
    c.font = "600 22px sans-serif";
    c.fillStyle = "#9ec3ff";
    c.fillText(["U.S. LABORATORY · DESTINY", "GROUND TRACK", "RACK LOCATIONS", "LIFE ON THE STATION"][kind], 28, 44);
    c.fillStyle = "#ff8a3d";
    c.fillRect(28, 56, 60, 3);
    if (kind === 0) {
      c.strokeStyle = "#cfe0ff";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(110, 200);
      c.lineTo(150, 150);
      c.lineTo(470, 150);
      c.lineTo(510, 200);
      c.lineTo(470, 250);
      c.lineTo(150, 250);
      c.closePath();
      c.stroke();
      for (let i = 0; i < 6; i++) c.strokeRect(170 + i * 50, 165, 40, 70);
      c.font = "500 20px sans-serif";
      c.fillStyle = "#e6eeff";
      c.fillText("Launched on STS-98, February 2001", 28, 316);
      c.fillStyle = "#8fa6c8";
      c.fillText("8.5 m long · 4.3 m across", 28, 344);
    } else if (kind === 1) {
      c.strokeStyle = "#1d3452";
      c.lineWidth = 1;
      for (let x = 28; x <= 612; x += 48) {
        c.beginPath();
        c.moveTo(x, 80);
        c.lineTo(x, 340);
        c.stroke();
      }
      for (let y = 80; y <= 340; y += 52) {
        c.beginPath();
        c.moveTo(28, y);
        c.lineTo(612, y);
        c.stroke();
      }
      c.strokeStyle = "#ff8a3d";
      c.lineWidth = 3;
      c.beginPath();
      for (let x = 28; x <= 612; x += 4) {
        const y = 210 + Math.sin((x - 28) * 0.017) * 90;
        if (x === 28) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(356, 210 + Math.sin(328 * 0.017) * 90, 8, 0, Math.PI * 2);
      c.fill();
    } else if (kind === 2) {
      for (let i = 0; i < 24; i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        c.fillStyle = i % 5 === 0 ? "#ff8a3d" : i % 3 === 0 ? "#3f7ad6" : "#1f3a5e";
        c.fillRect(40 + col * 96, 84 + row * 66, 84, 54);
      }
    } else {
      const bars = [0.8, 0.55, 0.9, 0.4, 0.7, 0.62];
      bars.forEach((b, i) => {
        c.fillStyle = i === 2 ? "#ff8a3d" : "#3f7ad6";
        c.fillRect(48 + i * 92, 320 - b * 220, 60, b * 220);
      });
    }
  });
}

/* ------------------------------- geometry kit ------------------------------- */

/** Arc of a (possibly tapered) tube around the x axis, centred on +y, recentred on its bounding box. */
function arcShell(r0: number, r1: number, length: number, arcDeg: number, thickness: number, segs = 20) {
  const outer = new THREE.CylinderGeometry(r1, r0, length, segs, 1, true, -((arcDeg / 2) * Math.PI) / 180, (arcDeg * Math.PI) / 180);
  outer.rotateZ(-Math.PI / 2);
  // Rotate so the arc is centred on +y (cylinder theta 0 points at +z after the z rotation).
  outer.rotateX(-Math.PI / 2);
  const inner = new THREE.CylinderGeometry(r1 - thickness, r0 - thickness, length, segs, 1, true, -((arcDeg / 2) * Math.PI) / 180, (arcDeg * Math.PI) / 180);
  inner.rotateZ(-Math.PI / 2);
  inner.rotateX(-Math.PI / 2);
  const flip = inner.index!;
  for (let i = 0; i < flip.count; i += 3) {
    const a = flip.getX(i);
    flip.setX(i, flip.getX(i + 2));
    flip.setX(i + 2, a);
  }
  const merged = mergeTwo(outer, inner);
  merged.computeBoundingBox();
  const c = new THREE.Vector3();
  merged.boundingBox!.getCenter(c);
  merged.translate(-c.x, -c.y, -c.z);
  merged.computeVertexNormals();
  return { geo: merged, offset: c };
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const pos = [...(a.getAttribute("position").array as Float32Array), ...(b.getAttribute("position").array as Float32Array)];
  const uv = [...(a.getAttribute("uv").array as Float32Array), ...(b.getAttribute("uv").array as Float32Array)];
  const na = a.getAttribute("position").count;
  const idx = [...Array.from(a.index!.array), ...Array.from(b.index!.array).map((i) => i + na)];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Quarter ring of square timber around the x axis, centred on +y. */
function trussQuarter() {
  const g = new THREE.TorusGeometry(TRUSS_R, 0.32, 4, 28, Math.PI / 2 - 0.05);
  g.rotateZ(Math.PI / 4 + 0.025);
  g.rotateY(Math.PI / 2);
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox!.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  return { geo: g, offset: c };
}

/** Half bulkhead (z >= 0 side) with a notch for the corridor, thickness along x. */
function bulkheadHalf() {
  const s = new THREE.Shape();
  const top = CEIL_Y - AXIS_Y;
  const bot = FLOOR_Y - AXIS_Y;
  s.moveTo(0, CONE_R);
  s.absarc(0, 0, CONE_R, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(0, bot);
  s.lineTo(HALF_W, bot);
  s.lineTo(HALF_W, top);
  s.lineTo(0, top);
  s.lineTo(0, CONE_R);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 28 });
  // Shape x -> world z, shape y -> world y, extrusion -> world x.
  g.rotateY(-Math.PI / 2);
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox!.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  return { geo: g, offset: c };
}

function cradleWedge() {
  const s = new THREE.Shape();
  const z0 = 1.6;
  const z1 = 5.2;
  const ySurf = (z: number) => AXIS_Y - Math.sqrt(R * R - z * z);
  s.moveTo(z0, 0.6);
  s.lineTo(z1, 0.6);
  s.lineTo(z1, ySurf(z1));
  for (let z = z1; z >= z0; z -= 0.2) s.lineTo(z, ySurf(z));
  s.lineTo(z0, 0.6);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false });
  g.rotateY(-Math.PI / 2);
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox!.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  return { geo: g, offset: c };
}

/* ---------------------------------- scene ---------------------------------- */

type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
type Part = { mesh: THREE.Object3D; kind: PartKind; a: Pose; t: Pose; delay: number; extents: THREE.Vector3 };

export function createDestiny(host: HTMLElement, options: DestinyOptions = {}): DestinyHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
  camera.position.set(34, 22, 36);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.target.set(0, 5.5, 0);
  controls.autoRotateSpeed = 0.55;
  if (window.matchMedia("(pointer: coarse)").matches) renderer.domElement.style.touchAction = "pan-y";

  /* lights */
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2d33, 0.55));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.4);
  key.position.set(26, 40, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -36;
  key.shadow.camera.right = 36;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -30;
  key.shadow.camera.far = 120;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc0ff, 0.9);
  rim.position.set(-30, 18, -28);
  scene.add(rim);
  const inner: THREE.PointLight[] = [];
  for (const x of [-6, 0, 6]) {
    const l = new THREE.PointLight(0xfff4e6, 3.2, 14, 1.6);
    l.position.set(x, CEIL_Y - 0.6, 0);
    scene.add(l);
    inner.push(l);
  }

  /* ground */
  const groundTex = canvasTexture(1024, 1024, (c) => {
    const g = c.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, "#2a2e36");
    g.addColorStop(0.7, "#1a1d23");
    g.addColorStop(1, "rgba(18,19,24,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = "rgba(255,255,255,0.05)";
    c.lineWidth = 1;
    for (let i = 0; i <= 1024; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 1024);
      c.stroke();
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(1024, i);
      c.stroke();
    }
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ map: groundTex, transparent: true, roughness: 0.95, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* materials */
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 60);
  const clipList = [clip];
  const brushed = brushedTexture();
  const aluminum = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.34, roughnessMap: brushed, side: THREE.DoubleSide, clippingPlanes: clipList });
  const plywood = new THREE.MeshStandardMaterial({ map: woodTexture("#c9975f", "#7a5128", 11, true), roughness: 0.72, side: THREE.DoubleSide, clippingPlanes: clipList });
  const pine = new THREE.MeshStandardMaterial({ map: woodTexture("#e0b36c", "#9c6b33", 23), roughness: 0.66, clippingPlanes: clipList });
  const panel = new THREE.MeshStandardMaterial({ color: 0xd9d6ce, roughness: 0.62, clippingPlanes: clipList });
  const bezel = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.4, metalness: 0.3, clippingPlanes: clipList });
  const screens = [0, 1, 2, 3].map(
    (k) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTexture(k), emissiveIntensity: 1.15, roughness: 0.25, clippingPlanes: clipList }),
  );
  const rubber = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.92 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.6 });
  const sheet = new THREE.MeshStandardMaterial({ color: 0xa7acb3, metalness: 0.85, roughness: 0.45, roughnessMap: brushed });
  const baseWood = new THREE.MeshStandardMaterial({ map: woodTexture("#b88652", "#6f4a24", 31, true), roughness: 0.75 });
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff6e8, emissiveIntensity: 2.2, clippingPlanes: clipList });
  const hvacMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 0.6, roughness: 0.42 });
  const figureMat = new THREE.MeshStandardMaterial({ color: 0x5b616b, roughness: 0.8 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, metalness: 0.2 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x8b9097, metalness: 1, roughness: 0.3, clippingPlanes: clipList });

  const parts: Part[] = [];
  const hoverables: THREE.Object3D[] = [];
  const qRot = (axis: THREE.Vector3, angle: number) => new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);

  const add = (mesh: THREE.Object3D, kind: PartKind, pos: THREE.Vector3, quat: THREE.Quaternion, extents: THREE.Vector3) => {
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.kind = kind;
      }
    });
    scene.add(mesh);
    hoverables.push(mesh);
    const part: Part = { mesh, kind, a: { p: pos.clone(), q: quat.clone() }, t: { p: pos.clone(), q: quat.clone() }, delay: 0, extents };
    parts.push(part);
    return part;
  };
  const extentsOf = (g: THREE.BufferGeometry) => {
    g.computeBoundingBox();
    return g.boundingBox!.getSize(new THREE.Vector3());
  };

  /* shell: 6 panels around, 4 along the barrel */
  const shellArc = arcShell(R, R, 4.96, 59, 0.12);
  const boltGeo = new THREE.SphereGeometry(0.07, 6, 4);
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3 + Math.PI / 6;
    for (let j = 0; j < 4; j++) {
      const mesh = new THREE.Mesh(shellArc.geo, aluminum);
      const bolts = new THREE.InstancedMesh(boltGeo, boltMat, 12);
      const m4 = new THREE.Matrix4();
      for (let b = 0; b < 12; b++) {
        const side = b < 6 ? -1 : 1;
        const a = (-29.5 + (b % 6) * 11.8) * (Math.PI / 180);
        const y = Math.cos(a) * (R + 0.03) - shellArc.offset.y;
        const z = Math.sin(a) * (R + 0.03) - shellArc.offset.z;
        m4.makeTranslation(side * 2.42, y, z);
        bolts.setMatrixAt(b, m4);
      }
      mesh.add(bolts);
      const q = qRot(X, angle);
      const pos = new THREE.Vector3(-BARREL + 2.5 + j * 5, AXIS_Y, 0).add(shellArc.offset.clone().applyQuaternion(q));
      add(mesh, "shell", pos, q, extentsOf(shellArc.geo));
    }
  }

  /* end cones: 4 plywood quarters each */
  const coneArc = arcShell(R, CONE_R, CONE - 0.04, 89, 0.3, 16);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      // The canonical quarter tapers toward +x; the -x cone is the same piece turned around.
      const q = qRot(X, (k * Math.PI) / 2 + Math.PI / 4);
      if (side < 0) q.premultiply(qRot(Y, Math.PI));
      const pos = new THREE.Vector3(side * (BARREL + CONE / 2), AXIS_Y, 0).add(coneArc.offset.clone().applyQuaternion(q));
      add(new THREE.Mesh(coneArc.geo, plywood), "cone", pos, q, extentsOf(coneArc.geo));
    }
  }

  /* bulkheads with the corridor notch */
  const bulk = bulkheadHalf();
  for (const side of [-1, 1]) {
    for (const half of [1, -1]) {
      const q = half > 0 ? new THREE.Quaternion() : qRot(Y, Math.PI);
      const off = bulk.offset.clone();
      const pos = new THREE.Vector3(side * (BARREL + CONE) - side * 0.15, AXIS_Y + off.y, half * off.z);
      add(new THREE.Mesh(bulk.geo, plywood), "bulkhead", pos, q, extentsOf(bulk.geo));
    }
  }

  /* truss rings and stringers */
  const tq = trussQuarter();
  for (const x of RING_X) {
    for (let k = 0; k < 4; k++) {
      const q = qRot(X, (k * Math.PI) / 2);
      const pos = new THREE.Vector3(x, AXIS_Y, 0).add(tq.offset.clone().applyQuaternion(q));
      add(new THREE.Mesh(tq.geo, pine), "truss", pos, q, extentsOf(tq.geo));
    }
  }
  const stringerGeo = new THREE.BoxGeometry(2 * BARREL - 0.2, 0.42, 0.42);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const pos = new THREE.Vector3(0, AXIS_Y + Math.cos(a) * (TRUSS_R - 0.05), Math.sin(a) * (TRUSS_R - 0.05));
    add(new THREE.Mesh(stringerGeo, pine), "stringer", pos, qRot(X, a), extentsOf(stringerGeo));
  }

  /* corridor: floor, ceiling, walls, screens */
  const floorGeo = new THREE.BoxGeometry(4.96, 0.3, 2 * HALF_W);
  for (let j = 0; j < 4; j++) {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(floorGeo, rubber);
    g.add(slab);
    for (const zs of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(4.96, 0.02, 0.18), stripe);
      s.position.set(0, 0.16, zs * (HALF_W - 0.2));
      g.add(s);
    }
    add(g, "floor", new THREE.Vector3(-BARREL + 2.5 + j * 5, FLOOR_Y - 0.15, 0), new THREE.Quaternion(), extentsOf(floorGeo));
  }
  const ceilGeo = new THREE.BoxGeometry(9.96, 0.3, 2 * HALF_W + 0.6);
  for (const x of [-5, 5]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ceilGeo, panel));
    for (const zs of [-1, 1]) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.34), ledMat);
      led.position.set(0, -0.18, zs * 1.2);
      g.add(led);
    }
    add(g, "ceiling", new THREE.Vector3(x, CEIL_Y + 0.15, 0), new THREE.Quaternion(), extentsOf(ceilGeo));
  }
  const wallGeo = new THREE.BoxGeometry(4.96, CEIL_Y - FLOOR_Y, 0.3);
  const screenBox = new THREE.BoxGeometry(4, 2.3, 0.2);
  let screenIndex = 0;
  for (const zs of [-1, 1]) {
    for (let j = 0; j < 4; j++) {
      const x = -BARREL + 2.5 + j * 5;
      const wall = new THREE.Mesh(wallGeo, panel);
      add(wall, "wall", new THREE.Vector3(x, (FLOOR_Y + CEIL_Y) / 2, zs * (HALF_W + 0.15)), new THREE.Quaternion(), extentsOf(wallGeo));
      const mats = [bezel, bezel, bezel, bezel, screens[screenIndex % 4], bezel];
      const scr = new THREE.Mesh(screenBox, mats);
      const q = zs > 0 ? qRot(Y, Math.PI) : new THREE.Quaternion();
      add(scr, "screen", new THREE.Vector3(x, FLOOR_Y + 4.4, zs * (HALF_W - 0.12)), q, extentsOf(screenBox));
      screenIndex += 1;
    }
  }

  /* base platform, cradles, HVAC, ramp */
  const baseGeo = new THREE.BoxGeometry(6.96, 0.6, 12);
  for (let j = 0; j < 4; j++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(baseGeo, baseWood));
    const skin = new THREE.Mesh(new THREE.BoxGeometry(6.98, 0.2, 12.02), sheet);
    skin.position.y = -0.2;
    g.add(skin);
    add(g, "base", new THREE.Vector3(-10.5 + j * 7, 0.3, 0), new THREE.Quaternion(), extentsOf(baseGeo));
  }
  const wedge = cradleWedge();
  for (const x of RING_X) {
    for (const zs of [1, -1]) {
      const q = zs > 0 ? new THREE.Quaternion() : qRot(Y, Math.PI);
      add(new THREE.Mesh(wedge.geo, pine), "cradle", new THREE.Vector3(x, wedge.offset.y, zs * wedge.offset.z), q, extentsOf(wedge.geo));
    }
  }
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2), hvacMat);
    g.add(body);
    for (let i = 0; i < 7; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.04), bezel);
      slat.position.set(0, -0.7 + i * 0.22, 1.02);
      g.add(slat);
    }
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.4, 16), sheet);
    duct.rotation.z = Math.PI / 2;
    duct.position.set(2.8, 0.5, 0);
    g.add(duct);
    add(g, "hvac", new THREE.Vector3(-BARREL - CONE - 3.6, 1.1, -3.4), new THREE.Quaternion(), new THREE.Vector3(3, 2.2, 2));
  }
  const rampGeo = new THREE.BoxGeometry(7, 0.35, 2 * HALF_W);
  const slope = Math.atan2(FLOOR_Y, 14);
  for (let j = 0; j < 2; j++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(rampGeo, baseWood));
    const top = new THREE.Mesh(new THREE.BoxGeometry(7, 0.02, 2 * HALF_W - 0.4), rubber);
    top.position.y = 0.19;
    g.add(top);
    for (const zs of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.08), sheet);
      rail.position.set(0, 2.9, zs * (HALF_W - 0.1));
      g.add(rail);
      for (const px of [-3.3, 0, 3.3]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 0.08), sheet);
        post.position.set(px, 1.45, zs * (HALF_W - 0.1));
        g.add(post);
      }
    }
    const cx = BARREL + CONE + 3.5 + j * 7;
    const cy = FLOOR_Y - Math.tan(slope) * (3.5 + j * 7) - 0.1;
    add(g, "ramp", new THREE.Vector3(cx, cy, 0), qRot(new THREE.Vector3(0, 0, 1), -slope), extentsOf(rampGeo));
  }

  /* person for scale, and the door */
  const figure = new THREE.Group();
  const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 3.6, 6, 16), figureMat);
  bodyMesh.position.y = 2.42;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 14), figureMat);
  head.position.y = 5.5;
  figure.add(bodyMesh, head);
  figure.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  const FIGURE_AT = new THREE.Vector3(BARREL + CONE + 15.5, 0, 4.6);
  const FIGURE_DOOR = new THREE.Vector3(4.4, 0, DOOR_Z + 1.2);
  figure.position.copy(FIGURE_AT);
  scene.add(figure);

  const door = new THREE.Group();
  for (const zs of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, DOOR.h + 0.35, 0.35), doorMat);
    post.position.set(0, (DOOR.h + 0.35) / 2, zs * (DOOR.w / 2 + 0.175));
    door.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, DOOR.w + 0.7), doorMat);
  lintel.position.y = DOOR.h + 0.175;
  door.add(lintel);
  door.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  door.visible = false;
  scene.add(door);

  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xff5d4d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ghost = new THREE.Mesh(new THREE.RingGeometry(6.85, 7, 96), ghostMat);
  ghost.rotation.y = Math.PI / 2;
  ghost.position.set(0, R + 0.05, DOOR_Z);
  scene.add(ghost);

  /* ---------------------------- transport layout ---------------------------- */

  // Stacks laid out on the floor, each piece lying on its largest face.
  const kinds: PartKind[] = ["shell", "cone", "bulkhead", "truss", "stringer", "wall", "screen", "floor", "ceiling", "base", "cradle", "hvac", "ramp"];
  const stackSpots: Record<PartKind, [number, number, number]> = {
    shell: [-20, 0, -12],
    cone: [-7, 0, -12],
    bulkhead: [9, 0, -12],
    truss: [24, 0, -13.5],
    stringer: [-14, 0, -3],
    wall: [6, 0, -2],
    screen: [16, 0, -3],
    base: [26, 0, 0],
    floor: [-22, 0, 7],
    ceiling: [-10, 0, 8],
    ramp: [2, 0, 8],
    hvac: [12, 0, 8],
    cradle: [19, 0, 7],
  };
  /** Curved pieces nest, so their stacks rise by less than their height. */
  const nestStep: Partial<Record<PartKind, number>> = { shell: 0.22, cone: 0.45 };
  const flatQuat = (ext: THREE.Vector3) => {
    // Largest extent along x, smallest along y (lying flat).
    const axes = [0, 1, 2].sort((i, j) => ext.getComponent(j) - ext.getComponent(i));
    const target = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)];
    return basisQuat(axes, target);
  };
  const edgeQuat = (ext: THREE.Vector3) => {
    // Largest along x (through the door), middle along y (height), smallest along z (door width).
    const axes = [0, 1, 2].sort((i, j) => ext.getComponent(j) - ext.getComponent(i));
    const target = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    return basisQuat(axes, target);
  };
  function basisQuat(axes: number[], target: THREE.Vector3[]) {
    const cols = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    axes.forEach((axis, rank) => cols[axis].copy(target[rank]));
    const m = new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2]);
    if (m.determinant() < 0) {
      cols[axes[2]].multiplyScalar(-1);
      m.makeBasis(cols[0], cols[1], cols[2]);
    }
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }
  const perStack = new Map<PartKind, number>();
  const piles: Record<PartKind, number> = { shell: 24, cone: 8, bulkhead: 4, truss: 8, stringer: 4, wall: 8, screen: 8, floor: 4, ceiling: 2, base: 4, cradle: 4, hvac: 1, ramp: 2 };
  parts.forEach((part) => {
    const n = perStack.get(part.kind) ?? 0;
    perStack.set(part.kind, n + 1);
    const q = flatQuat(part.extents);
    const size = part.extents.clone().applyQuaternion(q);
    const thick = Math.abs(size.y) + 0.05;
    const step = nestStep[part.kind] ?? thick;
    const spot = stackSpots[part.kind];
    const pile = Math.floor(n / piles[part.kind]);
    const level = n % piles[part.kind];
    const pileStep = Math.abs(size.z) + 1;
    part.t = { p: new THREE.Vector3(spot[0], spot[1] + thick / 2 + level * step, spot[2] + pile * pileStep), q };
    part.delay = kinds.indexOf(part.kind) * 0.05 + (n % 6) * 0.015;
  });

  /* --------------------------------- labels --------------------------------- */

  const labelAnchors: { id: string; text: string; sub: string; at: THREE.Vector3; cutaway: boolean | null }[] = [
    { id: "shell", text: "Bolted aluminum shell", sub: "24 panels", at: new THREE.Vector3(-2.5, AXIS_Y + R, 0), cutaway: false },
    { id: "cone", text: "End cone", sub: "4 plywood quarters each", at: new THREE.Vector3(BARREL + 2, AXIS_Y + 5, -3.8), cutaway: null },
    { id: "truss", text: "Pine truss", sub: "4 rings, 4 segments each", at: new THREE.Vector3(-7.5, AXIS_Y + TRUSS_R * 0.7, -TRUSS_R * 0.7), cutaway: true },
    { id: "screen", text: "8 touchscreens", sub: "Rack-style exhibit panels", at: new THREE.Vector3(2.5, FLOOR_Y + 4.4, -HALF_W), cutaway: true },
    { id: "wall", text: "Hinged corridor walls", sub: "Fold flat to move", at: new THREE.Vector3(-5, FLOOR_Y + 6.3, -HALF_W), cutaway: true },
    { id: "base", text: "Base platform", sub: "Wood, sheet-metal skin", at: new THREE.Vector3(-12, 0.6, 6), cutaway: null },
    { id: "ramp", text: "Wheelchair ramp", sub: "Into the corridor", at: new THREE.Vector3(BARREL + CONE + 8, 1.2, HALF_W), cutaway: null },
    { id: "hvac", text: "HVAC", sub: "Air into the module", at: new THREE.Vector3(-BARREL - CONE - 3.6, 2.4, -3.4), cutaway: false },
  ];

  /* ---------------------------------- state --------------------------------- */

  let mode: DestinyMode = "assembled";
  let explode = 0;
  let explodeTarget = 0;
  let cut = 0;
  let cutTarget = 0;
  let doorClock = 0;
  let doorIndex = -1;
  let raf = 0;
  let last = performance.now();
  let disposed = false;
  let width = 1;
  let height = 1;
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  const tgtFrom = new THREE.Vector3();
  const tgtTo = new THREE.Vector3();
  let camT = 1;
  let fovTo = 36;
  let fovFrom = 36;

  const samples = kinds.map((k) => parts.find((p) => p.kind === k)!);
  const partInfo = (kind: PartKind): PartInfo => {
    const p = samples[kinds.indexOf(kind)];
    const e = p.extents;
    const dims = [e.x, e.y, e.z].map((v) => Math.round(v * 10) / 10).sort((a, b) => b - a) as [number, number, number];
    return { kind, ...NAMES[kind], qty: parts.filter((x) => x.kind === kind).length, dims, fits: fitsDoor(dims) };
  };
  const infos = kinds.map(partInfo);

  function flyTo(pos: THREE.Vector3, target: THREE.Vector3, fov: number, fit = true) {
    // Narrow viewers lose horizontal field of view, so back the camera off to keep the model in frame.
    const k = fit ? Math.min(2.3, Math.max(1, 1.3 / (width / height))) : 1;
    camFrom.copy(camera.position);
    tgtFrom.copy(controls.target);
    camTo.copy(pos).sub(target).multiplyScalar(k).add(target);
    tgtTo.copy(target);
    fovFrom = camera.fov;
    fovTo = fov;
    camT = 0;
  }

  const VIEWS: Record<DestinyView, () => [THREE.Vector3, THREE.Vector3, number]> = {
    overview: () =>
      mode === "transport" || mode === "door" ? [new THREE.Vector3(30, 40, 60), new THREE.Vector3(2, 1, 4), 40] : [new THREE.Vector3(40, 25, 46), new THREE.Vector3(3, 5, 0), 36],
    side: () => [new THREE.Vector3(0, 7.5, 62), new THREE.Vector3(0, 6, 0), 30],
    inside: () => [new THREE.Vector3(-12.5, FLOOR_Y + 5.3, 0.01), new THREE.Vector3(8, FLOOR_Y + 4.8, 0), 64],
    top: () => [new THREE.Vector3(0.01, 70, 0.02), new THREE.Vector3(0, 0, 0), 38],
  };
  let view: DestinyView = "overview";

  function setMode(next: DestinyMode) {
    mode = next;
    explodeTarget = next === "transport" || next === "door" ? 1 : 0;
    cutTarget = next === "cutaway" ? 1 : 0;
    door.visible = next === "transport" || next === "door";
    door.position.set(0, 0, DOOR_Z);
    doorClock = 0;
    doorIndex = -1;
    options.onDoorPart?.(null);
    if (next === "door") flyTo(new THREE.Vector3(-11, 7.5, DOOR_Z + 17), new THREE.Vector3(0.5, 3.6, DOOR_Z), 44);
    else if (view === "inside" && explodeTarget > 0) setView("overview");
    else {
      const [p, t, f] = VIEWS[view]();
      flyTo(p, t, f, view !== "inside");
    }
  }

  function setView(next: DestinyView) {
    view = next;
    const [p, t, f] = VIEWS[next]();
    flyTo(p, t, f, next !== "inside");
  }

  /* --------------------------------- hover ---------------------------------- */

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoverDirty = false;
  let pointerIn = false;
  let pointerPx = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointerPx = { x: e.clientX - r.left, y: e.clientY - r.top };
    ndc.set((pointerPx.x / r.width) * 2 - 1, -(pointerPx.y / r.height) * 2 + 1);
    pointerIn = true;
    hoverDirty = true;
  };
  const onLeave = () => {
    pointerIn = false;
    options.onHover?.(null);
  };
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerleave", onLeave);

  function hover() {
    if (!hoverDirty || !pointerIn) return;
    hoverDirty = false;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hoverables, true).filter((h) => !(cut > 0.02 && h.point.z > clip.constant + 0.01));
    const kind = hits[0]?.object.userData.kind as PartKind | undefined;
    options.onHover?.(kind ? { part: infos[kinds.indexOf(kind)], x: pointerPx.x, y: pointerPx.y } : null);
  }

  /* ---------------------------------- frame --------------------------------- */

  const tmpP = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const edgeQ = new Map<PartKind, THREE.Quaternion>(kinds.map((k) => [k, edgeQuat(samples[kinds.indexOf(k)].extents)]));

  function doorParade(dt: number) {
    if (mode !== "door" || explode < 0.98) return;
    const per = 2.6;
    doorClock += dt;
    const idx = Math.floor(doorClock / per) % (kinds.length + 1);
    const u = (doorClock % per) / per;
    if (idx !== doorIndex) {
      doorIndex = idx;
      options.onDoorPart?.(idx === 0 ? null : infos[idx - 1]);
    }
    ghostMat.opacity = idx === 0 ? Math.sin(Math.PI * clamp01(u * 1.2)) * 0.85 : 0;
    if (idx === 0) return;
    const part = samples[idx - 1];
    const ext = part.extents.clone().applyQuaternion(edgeQ.get(part.kind)!);
    const hh = Math.abs(ext.y) / 2 + 0.05;
    const x = -14 + ease(clamp01((u - 0.12) / 0.76)) * 28;
    const toEdge = ease(clamp01(u / 0.15));
    const back = ease(clamp01((u - 0.88) / 0.12));
    tmpP.set(x, hh, DOOR_Z);
    tmpQ.copy(part.t.q).slerp(edgeQ.get(part.kind)!, toEdge);
    part.mesh.position.lerpVectors(tmpP, part.t.p, back);
    part.mesh.quaternion.copy(tmpQ).slerp(part.t.q, back);
  }

  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const speed = dt / 1.6;
    explode = explodeTarget > explode ? Math.min(explodeTarget, explode + speed) : Math.max(explodeTarget, explode - speed);
    cut += (cutTarget - cut) * (1 - Math.exp(-dt * 5));
    clip.constant = cut > 0.001 ? 60 * (1 - ease(cut)) : 60;
    inner.forEach((l) => (l.intensity = explode > 0.2 ? 0 : 3.2));
    figure.position.lerpVectors(FIGURE_AT, FIGURE_DOOR, ease(clamp01(explode * 1.4)));

    for (const part of parts) {
      const u = ease(clamp01((explode * (1 + 0.8) - part.delay * 1.2) / 1));
      part.mesh.position.lerpVectors(part.a.p, part.t.p, u);
      part.mesh.position.y += Math.sin(Math.PI * u) * 4;
      part.mesh.quaternion.slerpQuaternions(part.a.q, part.t.q, u);
    }
    doorParade(dt);
    if (mode !== "door") ghostMat.opacity = 0;

    if (camT < 1) {
      camT = Math.min(1, camT + dt / 1.1);
      const e = ease(camT);
      camera.position.lerpVectors(camFrom, camTo, e);
      controls.target.lerpVectors(tgtFrom, tgtTo, e);
      camera.fov = fovFrom + (fovTo - fovFrom) * e;
      camera.updateProjectionMatrix();
    }
    controls.update();
    hover();
    renderer.render(scene, camera);

    if (options.onLabels) {
      const show = explode < 0.05 && camT > 0.9 && view !== "inside" && view !== "top";
      const cutaway = cut > 0.5;
      options.onLabels(
        labelAnchors.map((l) => {
          const v = l.at.clone().project(camera);
          const inMode = l.cutaway === null || l.cutaway === cutaway;
          return { id: l.id, text: l.text, sub: l.sub, x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, visible: show && inMode && v.z < 1 };
        }),
      );
    }
  }

  let framedAspect = 0;
  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (framedAspect && Math.abs(camera.aspect - framedAspect) > 0.2) {
      framedAspect = camera.aspect;
      if (mode === "door") setMode("door");
      else setView(view);
    }
  }

  resize();
  framedAspect = camera.aspect;
  setView("overview");
  camT = 1;
  camera.position.copy(camTo);
  controls.target.copy(tgtTo);
  raf = requestAnimationFrame(frame);
  options.onReady?.(infos);

  return {
    setMode,
    setView,
    setSpin(on: boolean) {
      controls.autoRotate = on;
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        const list = Array.isArray(mat) ? mat : mat ? [mat] : [];
        list.forEach((x) => {
          const std = x as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.emissiveMap?.dispose();
          std.roughnessMap?.dispose();
          x.dispose();
        });
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
