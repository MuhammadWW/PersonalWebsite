import * as THREE from "three";

export type ObjectSlug = "iss-wifi" | "audit-tool" | "report-exports" | "agents" | "mentorship-hub";
export const OBJECT_SLUGS: ObjectSlug[] = ["iss-wifi", "audit-tool", "report-exports", "agents", "mentorship-hub"];

/** `view` is the direction from the model toward the camera for its best angle; `fit` scales the framing. */
export type Model = { group: THREE.Group; view: THREE.Vector3; fit?: number; update?: (t: number) => void; dispose: () => void };

const ORANGE = 0xff7a1a;

function tex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function finish(group: THREE.Group, textures: THREE.Texture[], view: THREE.Vector3, update?: (t: number) => void): Model {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return {
    group,
    view: view.normalize(),
    update,
    dispose() {
      textures.forEach((t) => t.dispose());
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    },
  };
}

/* --------------------------------- the ISS --------------------------------- */

function iss(): Model {
  const g = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const cells = tex(256, 512, (c) => {
    c.fillStyle = "#3a2a14";
    c.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 16) {
      for (let x = 0; x < 256; x += 32) {
        const tone = 150 + ((x * 7 + y * 3) % 40);
        c.fillStyle = `rgb(${tone}, ${Math.round(tone * 0.62)}, ${Math.round(tone * 0.24)})`;
        c.fillRect(x + 1, y + 1, 30, 14);
      }
    }
    c.fillStyle = "#1c150c";
    c.fillRect(124, 0, 8, 512);
  });
  const lattice = tex(256, 64, (c) => {
    c.clearRect(0, 0, 256, 64);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 6;
    c.strokeRect(3, 3, 250, 58);
    for (let x = 0; x < 256; x += 32) {
      c.beginPath();
      c.moveTo(x, 3);
      c.lineTo(x + 32, 61);
      c.moveTo(x, 3);
      c.lineTo(x, 61);
      c.stroke();
    }
  });
  lattice.wrapS = THREE.RepeatWrapping;
  lattice.repeat.set(12, 1);
  const ribs = tex(256, 64, (c) => {
    c.fillStyle = "#ece9e2";
    c.fillRect(0, 0, 256, 64);
    c.fillStyle = "#cfcac0";
    for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 3, 64);
  });
  ribs.wrapS = THREE.RepeatWrapping;
  textures.push(cells, lattice, ribs);

  const metal = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.8, roughness: 0.35 });
  const truss = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.7, roughness: 0.4, map: lattice, alphaMap: lattice, alphaTest: 0.5, side: THREE.DoubleSide });
  const panel = new THREE.MeshStandardMaterial({ map: cells, metalness: 0.45, roughness: 0.32, side: THREE.DoubleSide });
  const shell = new THREE.MeshStandardMaterial({ map: ribs, roughness: 0.62 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.5 });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 0.36, 0.36), truss);
  beam.position.y = 0.55;
  g.add(beam);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(10.9, 0.12, 0.12), metal);
  spine.position.y = 0.55;
  g.add(spine);

  for (const x of [-4.95, -3.75, 3.75, 4.95]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6.4, 8), metal);
    mast.rotation.x = Math.PI / 2;
    mast.position.set(x, 0.55, 0);
    g.add(mast);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.3), panel);
      wing.rotation.set(-Math.PI / 2 + 0.55, 0, 0);
      wing.position.set(x, 0.55, side * 1.95);
      g.add(wing);
    }
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 1.5), white);
      rad.position.set(side * (1.35 + k * 0.7), 0.1, 0);
      rad.rotation.z = 0.2 * side;
      g.add(rad);
    }
  }

  const mod = (r: number, len: number, pos: THREE.Vector3, axis: "x" | "z") => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), shell);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    else m.rotation.z = Math.PI / 2;
    m.position.copy(pos);
    g.add(m);
    const capGeo = new THREE.SphereGeometry(r * 0.98, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, white);
      cap.scale.y = 0.35;
      if (axis === "z") {
        cap.rotation.x = (s * Math.PI) / 2;
        cap.position.set(pos.x, pos.y, pos.z + (s * len) / 2);
      } else {
        cap.rotation.z = (-s * Math.PI) / 2;
        cap.position.set(pos.x + (s * len) / 2, pos.y, pos.z);
      }
      g.add(cap);
    }
    return m;
  };
  const y = -0.15;
  const destiny = mod(0.42, 1.7, new THREE.Vector3(0, y, 0.3), "z");
  mod(0.42, 1.1, new THREE.Vector3(0, y, 1.85), "z");
  mod(0.4, 1.3, new THREE.Vector3(1.05, y, 1.85), "x");
  mod(0.44, 1.9, new THREE.Vector3(-1.25, y, 1.85), "x");
  mod(0.42, 0.9, new THREE.Vector3(0, y, -0.95), "z");
  mod(0.4, 1.9, new THREE.Vector3(0, y, -2.4), "z");
  mod(0.36, 2, new THREE.Vector3(0, y, -4.3), "z");
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), panel);
    w.rotation.x = -Math.PI / 2;
    w.position.set(side * 1.2, y, -4.6);
    g.add(w);
  }

  // Wi-Fi rings rising from the lab: the crew's network.
  const ringMat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const rings = [0, 1, 2].map(() => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 48, Math.PI * 0.7), ringMat.clone());
    ring.rotation.set(Math.PI / 2, 0, Math.PI * 0.65);
    ring.position.set(destiny.position.x, y + 0.2, destiny.position.z);
    g.add(ring);
    return ring;
  });
  g.rotation.set(0.2, -0.5, 0.06);
  g.scale.setScalar(0.62);
  const model = finish(g, textures, new THREE.Vector3(0.35, 0.42, 1), (t) => {
    rings.forEach((ring, i) => {
      const u = (t * 0.45 + i / 3) % 1;
      ring.scale.setScalar(0.8 + u * 2.6);
      ring.position.y = y + 0.25 + u * 0.9;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - u);
    });
  });
  model.fit = 0.8;
  return model;
}

/* ------------------------- datacenter under construction ------------------------ */

function datacenter(): Model {
  const g = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const facade = tex(512, 128, (c) => {
    c.fillStyle = "#e7e5df";
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = "#d3d0c8";
    for (let x = 0; x < 512; x += 24) c.fillRect(x, 0, 2, 128);
    c.fillStyle = "#3b4048";
    c.fillRect(0, 86, 512, 18);
    c.fillStyle = "#565c66";
    for (let x = 4; x < 512; x += 12) c.fillRect(x, 88, 6, 14);
  });
  textures.push(facade);
  const wall = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.7 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.6 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbfbcb4, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xa4452a, roughness: 0.55, metalness: 0.3 });
  const unit = new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: 0.5, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.6 });
  const crane = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45, metalness: 0.2 });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.2, 6), concrete);
  pad.position.y = -0.1;
  g.add(pad);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.3, 3.4), [wall, wall, roof, roof, wall, wall]);
  hall.position.set(-2, 0.65, 0);
  g.add(hall);
  for (let i = 0; i < 6; i++) {
    for (const z of [-0.8, 0.8]) {
      const chiller = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), unit);
      chiller.position.set(-3.8 + i * 0.72, 1.45, z);
      g.add(chiller);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20), dark);
      fan.position.set(-3.8 + i * 0.72, 1.61, z);
      g.add(fan);
    }
  }
  // Second hall going up: steel frame, part of it clad.
  const col = new THREE.BoxGeometry(0.1, 1.3, 0.1);
  const beamX = new THREE.BoxGeometry(0.9, 0.08, 0.08);
  const beamZ = new THREE.BoxGeometry(0.08, 0.08, 3.4);
  for (let i = 0; i < 4; i++) {
    for (const z of [-1.65, 0, 1.65]) {
      const c = new THREE.Mesh(col, steel);
      c.position.set(1.1 + i * 0.9, 0.65, z);
      g.add(c);
    }
    const bz = new THREE.Mesh(beamZ, steel);
    bz.position.set(1.1 + i * 0.9, 1.3, 0);
    g.add(bz);
    if (i < 3) {
      for (const z of [-1.65, 0, 1.65]) {
        const bx = new THREE.Mesh(beamX, steel);
        bx.position.set(1.55 + i * 0.9, 1.3, z);
        g.add(bx);
      }
    }
  }
  const clad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 3.4), [wall, wall, roof, roof, wall, wall]);
  clad.position.set(0.65, 0.65, 0);
  g.add(clad);
  for (let i = 0; i < 3; i++) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 20), unit);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(-3.2 + i * 1.3, 0.22, 2.4);
    g.add(tank);
  }

  const craneG = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.4, 0.22), crane);
  mast.position.y = 2.2;
  craneG.add(mast);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.16), crane);
  jib.position.set(1.4, 4.35, 0);
  craneG.add(jib);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), dark);
  counter.position.set(-1.05, 4.2, 0);
  craneG.add(counter);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), dark);
  cab.position.set(0.25, 4.05, 0);
  craneG.add(cab);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 6), dark);
  cable.position.set(2.8, 3.4, 0);
  craneG.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), steel);
  load.position.set(2.8, 2.45, 0);
  craneG.add(load);
  craneG.position.set(3.2, 0, -1.9);
  craneG.scale.setScalar(0.8);
  craneG.rotation.y = 2.4;
  g.add(craneG);
  g.scale.setScalar(0.72);
  g.position.y = -0.9;
  return finish(g, textures, new THREE.Vector3(0.9, 0.7, 1), (t) => {
    craneG.rotation.y = 2.4 + Math.sin(t * 0.35) * 0.3;
  });
}

/* ------------------------------- report pages ------------------------------- */

function reports(): Model {
  const g = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const pageTex = (k: number) =>
    tex(424, 600, (c) => {
      c.fillStyle = "#fbfaf7";
      c.fillRect(0, 0, 424, 600);
      c.fillStyle = "#0056d0";
      c.fillRect(0, 0, 424, 70);
      c.fillStyle = "#ffffff";
      c.font = "600 26px sans-serif";
      c.fillText(`Project ${String(k + 1).padStart(2, "0")}`, 26, 45);
      c.fillStyle = "#e9ecf3";
      c.fillRect(26, 96, 372, 180);
      for (let i = 0; i < 7; i++) {
        const h = 40 + ((i * 37 + k * 29) % 120);
        c.fillStyle = i === (k % 7) ? "#ff7a1a" : "#7ea3e6";
        c.fillRect(46 + i * 50, 262 - h, 30, h);
      }
      c.strokeStyle = "#2a2f38";
      c.lineWidth = 4;
      c.beginPath();
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 45;
        const y = 380 - Math.sin(i * 0.8 + k) * 40 - i * 4;
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
      c.fillStyle = "#c9ced8";
      for (let i = 0; i < 6; i++) c.fillRect(26, 450 + i * 22, 372 - (i % 3) * 60, 10);
    });
  const pages: THREE.Mesh[] = [];
  for (let k = 0; k < 5; k++) {
    const t = pageTex(k);
    textures.push(t);
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.8 });
    const page = new THREE.Mesh(new THREE.BoxGeometry(2.12, 3, 0.02), [edge, edge, edge, edge, face, edge]);
    page.rotation.set(-0.1, 0, (k - 2) * 0.16);
    page.position.set((k - 2) * 0.62, Math.abs(k - 2) * -0.12, (k - 2) * -0.08 + (4 - k) * 0.03);
    g.add(page);
    pages.push(page);
  }
  const badge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(0.9, 0.42, 0.12), { depth: 0.08, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.4 }),
  );
  const pdf = tex(256, 128, (c) => {
    c.fillStyle = "#1c1206";
    c.font = "800 70px sans-serif";
    c.fillText("PDF", 58, 92);
  });
  textures.push(pdf);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: pdf, transparent: true }));
  label.position.z = 0.085;
  badge.add(label);
  badge.position.set(1.7, 1.35, 0.35);
  badge.rotation.z = -0.25;
  g.add(badge);
  g.rotation.y = -0.35;
  return finish(g, textures, new THREE.Vector3(-0.3, 0.15, 1), (t) => {
    pages.forEach((p, k) => (p.position.y = Math.abs(k - 2) * -0.12 + Math.sin(t * 0.9 + k * 0.7) * 0.05));
    badge.position.y = 1.35 + Math.sin(t * 1.3) * 0.06;
  });
}

/* ----------------------------------- agents ---------------------------------- */

function agents(): Model {
  const g = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const bubbleShape = rounded(3.2, 2, 0.5);
  const bubble = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bubbleShape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 12 }),
    new THREE.MeshStandardMaterial({ color: 0xdfe8ff, roughness: 0.35 }),
  );
  const tail = new THREE.Shape();
  tail.moveTo(-0.8, -0.95);
  tail.lineTo(-1.25, -1.55);
  tail.lineTo(-0.25, -0.95);
  const tailMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(tail, { depth: 0.3, bevelEnabled: false }), bubble.material);
  bubble.add(tailMesh);
  bubble.position.set(0.2, 0.5, 0);
  g.add(bubble);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0x0056d0, roughness: 0.3 });
  const dots = [-0.6, 0, 0.6].map((x) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), dotMat);
    d.position.set(x, 0, 0.45);
    bubble.add(d);
    return d;
  });

  const docTex = tex(300, 400, (c) => {
    c.fillStyle = "#fbfaf7";
    c.fillRect(0, 0, 300, 400);
    c.fillStyle = "#2a2f38";
    c.fillRect(28, 34, 170, 18);
    c.fillStyle = "#c9ced8";
    for (let i = 0; i < 10; i++) c.fillRect(28, 80 + i * 26, 244 - (i % 4) * 40, 10);
    c.fillStyle = "#ff7a1a";
    c.fillRect(28, 158, 244, 30);
    c.globalAlpha = 0.25;
    c.fillRect(28, 158, 244, 30);
  });
  textures.push(docTex);
  const doc = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.04), [
    new THREE.MeshStandardMaterial({ color: 0xe8e6e0 }),
    new THREE.MeshStandardMaterial({ color: 0xe8e6e0 }),
    new THREE.MeshStandardMaterial({ color: 0xe8e6e0 }),
    new THREE.MeshStandardMaterial({ color: 0xe8e6e0 }),
    new THREE.MeshStandardMaterial({ map: docTex, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xe8e6e0 }),
  ]);
  doc.position.set(1.7, -0.35, -0.9);
  doc.rotation.set(0, -0.35, 0.08);
  g.add(doc);
  const cite = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(0.62, 0.42, 0.14), { depth: 0.1, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.4 }),
  );
  const citeTex = tex(128, 96, (c) => {
    c.fillStyle = "#1c1206";
    c.font = "800 56px sans-serif";
    c.fillText("[1]", 22, 68);
  });
  textures.push(citeTex);
  const citeLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.38), new THREE.MeshBasicMaterial({ map: citeTex, transparent: true }));
  citeLabel.position.z = 0.105;
  cite.add(citeLabel);
  cite.position.set(1.35, -0.55, 0.45);
  g.add(cite);

  const ask = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(1.3, 0.62, 0.3), { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.4 }),
  );
  ask.position.set(-1.7, 1.75, -0.4);
  g.add(ask);
  g.rotation.y = 0.25;
  return finish(g, textures, new THREE.Vector3(0.35, 0.18, 1), (t) => {
    dots.forEach((d, i) => (d.position.y = Math.max(0, Math.sin(t * 5 - i * 0.9)) * 0.18));
    cite.position.y = -0.55 + Math.sin(t * 1.2) * 0.06;
  });
}

/* ------------------------------- mentorship hub ------------------------------ */

function mentorship(): Model {
  const g = new THREE.Group();
  const person = (h: number, mat: THREE.Material) => {
    const p = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * h, 0.7 * h, 6, 18), mat);
    body.position.y = 0.63 * h;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24 * h, 24, 16), mat);
    head.position.y = 1.42 * h;
    p.add(body, head);
    return p;
  };
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.8, 0.2, 64), new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.7 }));
  base.position.y = -0.1;
  g.add(base);
  const mentee = person(1, new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45 }));
  mentee.position.set(0, 0, 1.2);
  g.add(mentee);
  const mentorMat = new THREE.MeshStandardMaterial({ color: 0xc9d5ea, roughness: 0.45 });
  const linkMat = new THREE.MeshBasicMaterial({ color: 0xffb27a, transparent: true, opacity: 0.9 });
  const pulses: THREE.Mesh[] = [];
  const curves: THREE.QuadraticBezierCurve3[] = [];
  [-1, 0, 1].forEach((k) => {
    const mentor = person(1.18, mentorMat);
    const a = k * 0.75;
    mentor.position.set(Math.sin(a) * 2.2, 0, 1.2 - Math.cos(a) * 2.6);
    g.add(mentor);
    const from = new THREE.Vector3(0, 1.45, 1.2);
    const to = mentor.position.clone().add(new THREE.Vector3(0, 1.7, 0));
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    curves.push(curve);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.025, 8, false), linkMat));
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(pulse);
    pulses.push(pulse);
  });
  g.position.y = -1;
  return finish(g, [], new THREE.Vector3(0.15, 0.42, 1), (t) => {
    pulses.forEach((p, i) => p.position.copy(curves[i].getPoint((t * 0.4 + i * 0.33) % 1)));
  });
}

export function buildModel(slug: ObjectSlug): Model {
  switch (slug) {
    case "iss-wifi":
      return iss();
    case "audit-tool":
      return datacenter();
    case "report-exports":
      return reports();
    case "agents":
      return agents();
    case "mentorship-hub":
      return mentorship();
  }
}
