import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildModel, type ObjectSlug } from "./models";

export type Stage = { resize(): void; setActive(active: boolean): void; dispose(): void };

/** A small studio for one project object: soft key light, contact shadow, slow turntable. */
export function createStage(host: HTMLElement, slug: ObjectSlug, still: boolean): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  scene.add(new THREE.HemisphereLight(0xe4ecff, 0x2a2d33, 0.6));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
  key.position.set(5, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc0ff, 1.1);
  rim.position.set(-6, 4, -7);
  scene.add(rim);

  const model = buildModel(slug);
  scene.add(model.group);
  model.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model.group);
  const sphere = box.getBoundingSphere(new THREE.Sphere());

  const space = slug === "iss-wifi";
  if (!space) {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(sphere.radius * 3, 48), new THREE.ShadowMaterial({ opacity: 0.32 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = box.min.y - 0.001;
    floor.receiveShadow = true;
    scene.add(floor);
  } else {
    const n = 900;
    const pos = new Float32Array(n * 3);
    let s = 7;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1;
      const t = r() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      pos.set([rr * Math.cos(t) * 60, u * 60, rr * Math.sin(t) * 60], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8d2e6, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = space ? Math.PI - 0.35 : Math.PI / 2 - 0.08;
  controls.target.copy(sphere.center);
  if (window.matchMedia("(pointer: coarse)").matches) renderer.domElement.style.touchAction = "pan-y";

  // Swing gently around the model's best angle instead of spinning it edge-on; a drag hands over control.
  const home = new THREE.Spherical().setFromVector3(model.view);
  const orbit = new THREE.Spherical();
  let held = false;
  let dist = 10;
  controls.addEventListener("start", () => (held = true));

  let active = false;
  let raf = 0;
  const t0 = performance.now();

  function place(t: number) {
    orbit.set(dist, home.phi + (still ? 0 : Math.sin(t * 0.31) * 0.05), home.theta + (still ? 0 : Math.sin(t * 0.42) * 0.4));
    camera.position.setFromSpherical(orbit).add(controls.target);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    model.update?.(still ? 0.8 : t);
    if (!held) place(t);
    controls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the bounding sphere in whichever field of view is narrower.
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    dist = (sphere.radius * (model.fit ?? 1.05)) / Math.sin(Math.min(vfov, hfov) / 2);
    if (held) camera.position.sub(controls.target).setLength(dist).add(controls.target);
    else place((performance.now() - t0) / 1000);
    camera.updateProjectionMatrix();
    if (!active) renderer.render(scene, camera);
  }

  resize();

  return {
    resize,
    setActive(next: boolean) {
      if (next === active) return;
      active = next;
      if (active) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    },
    dispose() {
      cancelAnimationFrame(raf);
      controls.dispose();
      model.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
