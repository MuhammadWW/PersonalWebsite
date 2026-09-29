import { listSample, pValue, zScore } from "./watermark";

export type SceneData = {
  /** tokens[0] is the start word; tokens[1..] are scored. */
  tokens: string[];
  greens: boolean[];
  gamma: number;
  key: string;
  label: string;
  note?: string;
};

export type SceneStats = { T: number; G: number; z: number };

export type SceneOptions = {
  reducedMotion: boolean;
  footnote?: string;
  onDone?: (stats: SceneStats) => void;
};

type Rect = { x: number; y: number; w: number; h: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; green: boolean };
type Layout = {
  wide: boolean;
  pad: number;
  ribbon: Rect;
  cursorX: number;
  beamY: number;
  piles: [Rect, Rect];
  panel: Rect;
};

const C = {
  bg: "#0e1116",
  dot: "rgba(255,255,255,0.055)",
  text: "#ecebe4",
  muted: "#8f959c",
  line: "#39404a",
  panel: "#151a21",
  green: "#34d399",
  red: "#f87171",
  amber: "#fbbf24",
  beam: "#ff7a1a",
};

/** Seconds from the stream to a pile, and the fraction of that trip where the detector sits. */
const FALL = 0.95;
const CROSS = 0.36;
/** Seconds a square takes to settle after landing. */
const POP = 0.18;
const WHEEL_DOTS = 36;
const RIBBON_H = 32;
const TAU = Math.PI * 2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export function formatP(p: number) {
  if (!(p > 1e-300)) return "< 10⁻³⁰⁰";
  if (p >= 0.001) return p.toFixed(p >= 0.1 ? 2 : 3);
  const e = Math.floor(Math.log10(p));
  const m = p / Math.pow(10, e);
  return `${m.toFixed(1)}×10⁻${String(-e)
    .split("")
    .map((d) => SUP[Number(d)])
    .join("")}`;
}

export function verdictFor(z: number, T: number) {
  if (T < 8) return { text: "Collecting evidence", color: C.muted };
  if (z >= 4) return { text: "Watermark detected", color: C.green };
  if (z >= 2) return { text: "Some evidence, not enough", color: C.amber };
  return { text: "No sign of a watermark", color: C.text };
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  if (w <= 0 || h <= 0) return;
  c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}

export class WatermarkScene {
  private c: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private data: SceneData | null = null;
  private L: Layout | null = null;
  private widths: number[] = [];
  private offsets: number[] = [];
  private slots: { pile: 0 | 1; idx: number }[] = [];
  private cumG: number[] = [0];
  private cell = 12;
  private gap = 3;
  private perRow = 8;
  private p = -0.6;
  private speed = 6;
  private playing = true;
  private active = false;
  private raf = 0;
  private last = 0;
  private finished = false;
  private crossed = 0;
  private disp = { z: 0, T: 0, scroll: 0, spin: 0 };
  private flash = { t: 0, green: true };
  private particles: Particle[] = [];
  private wheel: boolean[] = [];
  private wheelFor = -1;
  private pointer: { x: number; y: number } | null = null;
  private sans = "sans-serif";
  private mono = "monospace";
  private grid: HTMLCanvasElement | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: SceneOptions,
  ) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("2D canvas unavailable");
    this.c = c;
    this.sans = getComputedStyle(canvas).fontFamily || this.sans;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
    if (mono) this.mono = mono;
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerleave", this.onLeave);
    document.fonts?.ready.then(() => {
      if (!this.data) return;
      this.measure();
      this.layout();
      this.draw();
    });
  }

  /* ------------------------------- public API ------------------------------ */

  setData(data: SceneData) {
    this.data = data;
    this.measure();
    this.computeSlots();
    this.layout();
    this.restart();
  }

  restart() {
    this.p = this.opts.reducedMotion ? this.endP() : -Math.max(0.6, this.speed * 0.6);
    this.finished = false;
    this.particles = [];
    const s = this.stats();
    this.crossed = this.crossedAt(this.p);
    this.disp.T = s.T;
    this.disp.z = s.z;
    this.disp.scroll = this.scrollTarget();
    this.kick();
  }

  setSpeed(tokensPerSecond: number) {
    // Keep the same token under the detector when the speed changes.
    this.p += FALL * (tokensPerSecond - this.speed);
    this.speed = tokensPerSecond;
    if (this.finished) this.p = this.endP();
    this.kick();
  }

  setPlaying(playing: boolean) {
    this.playing = playing;
    this.kick();
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.kick();
    else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  resize(w: number, h: number) {
    this.W = Math.max(1, w);
    this.H = Math.max(1, h);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.grid = null;
    this.layout();
    this.disp.scroll = this.scrollTarget();
    this.draw();
    this.kick();
  }

  dispose() {
    this.setActive(false);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
  }

  /* -------------------------------- timeline ------------------------------- */

  private N() {
    return this.data ? this.data.tokens.length - 1 : 0;
  }

  private endP() {
    return this.N() - 1 + (FALL + POP) * this.speed + 0.01;
  }

  /** Tokens that have landed in a pile. All numbers on screen follow this count. */
  private landedAt(p: number) {
    return Math.max(0, Math.min(this.N(), Math.floor(p + 1 - FALL * this.speed)));
  }

  private crossedAt(p: number) {
    return Math.max(0, Math.min(this.N(), Math.floor(p + 1 - CROSS * FALL * this.speed)));
  }

  private stats(): SceneStats {
    const T = this.landedAt(this.p);
    const G = this.cumG[T] ?? 0;
    return { T, G, z: zScore(G, T, this.data?.gamma ?? 0.25) };
  }

  private kick() {
    if (!this.active || this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const moving = this.update(dt);
    this.draw();
    if (moving && this.active) this.raf = requestAnimationFrame(this.frame);
  };

  /** Advances the animation; returns whether another frame is needed. */
  private update(dt: number) {
    if (!this.data) return false;
    if (this.playing && !this.finished) this.p += dt * this.speed;
    if (this.p >= this.endP()) {
      this.p = this.endP();
      if (!this.finished) {
        this.finished = true;
        this.opts.onDone?.(this.stats());
      }
    }
    const crossed = this.crossedAt(this.p);
    if (crossed > this.crossed) for (let i = this.crossed + 1; i <= crossed; i++) this.onCross(i);
    this.crossed = crossed;

    const s = this.stats();
    const k = 1 - Math.exp(-dt * 8);
    this.disp.T += (s.T - this.disp.T) * k;
    this.disp.z += (s.z - this.disp.z) * k;
    this.disp.scroll += (this.scrollTarget() - this.disp.scroll) * (1 - Math.exp(-dt * 10));
    this.disp.spin += dt * 0.3;
    this.flash.t = Math.max(0, this.flash.t - dt * 3);
    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 260 * dt;
      q.life -= dt * 1.5;
    }
    this.particles = this.particles.filter((q) => q.life > 0);

    const settled =
      this.finished &&
      this.particles.length === 0 &&
      this.flash.t === 0 &&
      Math.abs(this.disp.z - s.z) < 0.002 &&
      Math.abs(this.disp.T - s.T) < 0.01 &&
      Math.abs(this.disp.scroll - this.scrollTarget()) < 0.3;
    return !settled && (this.playing || this.particles.length > 0 || this.finished);
  }

  private onCross(i: number) {
    const green = !!this.data?.greens[i];
    this.flash = { t: 1, green };
    this.disp.spin += 0.5;
    const L = this.L;
    if (!L || this.opts.reducedMotion) return;
    const n = green ? 11 : 5;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const v = 80 + Math.random() * 120;
      this.particles.push({ x: L.cursorX, y: L.beamY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7 + Math.random() * 0.3, green });
    }
  }

  /* --------------------------------- layout -------------------------------- */

  private measure() {
    const tokens = this.data?.tokens ?? [];
    this.c.font = `500 13px ${this.mono}`;
    this.widths = tokens.map((t) => Math.ceil(this.c.measureText(t).width) + 18);
    this.offsets = [];
    let x = 0;
    for (const w of this.widths) {
      this.offsets.push(x);
      x += w + 6;
    }
  }

  private computeSlots() {
    const greens = this.data?.greens ?? [];
    this.slots = [{ pile: 0, idx: 0 }];
    this.cumG = [0];
    let g = 0;
    let r = 0;
    for (let i = 1; i < greens.length; i++) {
      const green = greens[i];
      this.slots.push({ pile: green ? 0 : 1, idx: green ? g++ : r++ });
      this.cumG.push(this.cumG[i - 1] + (green ? 1 : 0));
    }
  }

  private layout() {
    const { W, H } = this;
    const wide = W >= 700;
    const pad = wide ? 22 : 14;
    const ribbon = { x: pad, y: pad + 30, w: W - pad * 2, h: RIBBON_H };
    const beamY = ribbon.y + RIBBON_H + (wide ? 64 : 54);
    const panel = wide
      ? { x: W - pad - Math.min(300, W * 0.3), y: beamY + 20, w: Math.min(300, W * 0.3), h: H - beamY - 20 - pad }
      : { x: pad, y: H - pad - 118, w: W - pad * 2, h: 118 };
    const areaX = pad + (wide ? 64 : 48);
    const areaRight = wide ? panel.x - 30 : W - pad;
    const between = wide ? 30 : 16;
    const pileW = (areaRight - areaX - between) / 2;
    const top = beamY + 64;
    const bottom = wide ? H - pad : panel.y - 16;
    const pileH = Math.max(40, bottom - top);
    const piles: [Rect, Rect] = [
      { x: areaX, y: top, w: pileW, h: pileH },
      { x: areaX + pileW + between, y: top, w: pileW, h: pileH },
    ];
    this.L = { wide, pad, ribbon, cursorX: areaX + (areaRight - areaX) / 2, beamY, piles, panel };

    // Fewest columns that still fit every token in one pile, so the stacks grow as tall as possible.
    const n = Math.max(1, this.N());
    this.cell = 4;
    this.gap = 1;
    this.perRow = Math.max(1, Math.floor(pileW / 5));
    for (let cell = 26; cell >= 4; cell--) {
      const gap = Math.max(2, Math.round(cell * 0.22));
      const step = cell + gap;
      const rows = Math.floor((pileH + gap) / step);
      if (rows < 1) continue;
      const perRow = Math.ceil(n / rows);
      if (perRow * step - gap <= pileW) {
        this.cell = cell;
        this.gap = gap;
        this.perRow = perRow;
        break;
      }
    }
  }

  private center(i: number) {
    return this.offsets[i] + this.widths[i] / 2;
  }

  /** Scroll offset that keeps the token currently leaving the stream above the detector. */
  private scrollTarget() {
    const L = this.L;
    if (!L || !this.offsets.length) return 0;
    const u = Math.max(0, Math.min(this.N(), this.p + 1));
    const i = Math.floor(u);
    const f = u - i;
    const x = i >= this.N() ? this.center(this.N()) : this.center(i) + (this.center(i + 1) - this.center(i)) * f;
    return x - (L.cursorX - L.ribbon.x);
  }

  private slotRect(i: number): Rect {
    const L = this.L!;
    const s = this.slots[i];
    const pile = L.piles[s.pile];
    const step = this.cell + this.gap;
    const used = this.perRow * step - this.gap;
    const col = s.idx % this.perRow;
    const row = Math.floor(s.idx / this.perRow);
    return { x: pile.x + (pile.w - used) / 2 + col * step, y: pile.y + pile.h - (row + 1) * step + this.gap, w: this.cell, h: this.cell };
  }

  private heightFor(count: number) {
    return (count / this.perRow) * (this.cell + this.gap);
  }

  /* --------------------------------- drawing ------------------------------- */

  private draw() {
    const c = this.c;
    const L = this.L;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = C.bg;
    c.fillRect(0, 0, this.W, this.H);
    this.drawGrid();
    if (!L || !this.data || this.W < 160 || this.H < 160) return;
    this.drawHeader(L);
    this.drawRibbon(L);
    this.drawPiles(L);
    this.drawDetector(L);
    this.drawFlight(L);
    for (const q of this.particles) {
      c.globalAlpha = clamp01(q.life);
      c.fillStyle = q.green ? C.green : C.red;
      c.beginPath();
      c.arc(q.x, q.y, q.green ? 2.2 : 1.6, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
    this.drawPanel(L);
    this.drawTooltip(L);
  }

  private drawGrid() {
    if (!this.grid) {
      const g = document.createElement("canvas");
      g.width = this.canvas.width;
      g.height = this.canvas.height;
      const gc = g.getContext("2d")!;
      gc.scale(this.dpr, this.dpr);
      gc.fillStyle = C.dot;
      for (let y = 12; y < this.H; y += 24) for (let x = 12; x < this.W; x += 24) gc.fillRect(x, y, 1.2, 1.2);
      this.grid = g;
    }
    this.c.save();
    this.c.setTransform(1, 0, 0, 1, 0, 0);
    this.c.drawImage(this.grid, 0, 0);
    this.c.restore();
  }

  private drawHeader(L: Layout) {
    const c = this.c;
    const d = this.data!;
    c.fillStyle = d.label.startsWith("Human") ? C.text : C.beam;
    c.beginPath();
    c.arc(L.pad + 5, L.pad + 10, 4, 0, TAU);
    c.fill();
    c.font = `600 12px ${this.sans}`;
    c.letterSpacing = "0.12em";
    c.fillStyle = C.text;
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText(d.label.toUpperCase(), L.pad + 16, L.pad + 10);
    c.letterSpacing = "0px";
    if (d.note && L.wide) {
      c.font = `400 12px ${this.mono}`;
      c.fillStyle = C.muted;
      c.textAlign = "right";
      c.fillText(d.note, this.W - L.pad, L.pad + 10);
    }
  }

  private chip(x: number, y: number, w: number, h: number, text: string, fill: string, stroke: string, ink: string, textAlpha = 1) {
    const c = this.c;
    roundRect(c, x, y, w, h, 8);
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
    if (textAlpha > 0.02 && w > 18) {
      c.globalAlpha = textAlpha;
      c.font = `500 13px ${this.mono}`;
      c.fillStyle = ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, x + w / 2, y + h / 2 + 0.5);
      c.globalAlpha = 1;
    }
  }

  private drawRibbon(L: Layout) {
    const c = this.c;
    const d = this.data!;
    const r = L.ribbon;
    const crossed = this.crossed;
    const launched = Math.max(0, Math.min(this.N(), Math.floor(this.p + 1)));
    c.save();
    c.beginPath();
    c.rect(r.x, r.y - 4, r.w, r.h + 8);
    c.clip();
    for (let i = 0; i < d.tokens.length; i++) {
      const x = r.x + this.offsets[i] - this.disp.scroll;
      const w = this.widths[i];
      if (x + w < r.x - 4 || x > r.x + r.w + 4) continue;
      if (i === 0) {
        c.setLineDash([3, 3]);
        this.chip(x, r.y, w, r.h, d.tokens[i], "rgba(255,255,255,0.02)", C.line, C.muted);
        c.setLineDash([]);
      } else if (i <= crossed) {
        const g = d.greens[i];
        this.chip(x, r.y, w, r.h, d.tokens[i], g ? "rgba(52,211,153,0.14)" : "rgba(248,113,113,0.08)", g ? "rgba(52,211,153,0.75)" : "rgba(248,113,113,0.4)", g ? "#c9f7e2" : "#f3c1c1");
      } else if (i <= launched) {
        this.chip(x, r.y, w, r.h, d.tokens[i], "rgba(255,122,26,0.08)", "rgba(255,122,26,0.8)", C.text);
      } else {
        this.chip(x, r.y, w, r.h, d.tokens[i], "rgba(255,255,255,0.03)", C.line, "#c7cbd1");
      }
    }
    c.restore();
    for (const [x0, x1] of [
      [r.x - 1, r.x + 70],
      [r.x + r.w + 1, r.x + r.w - 70],
    ]) {
      const g = c.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, C.bg);
      g.addColorStop(1, "rgba(14,17,22,0)");
      c.fillStyle = g;
      c.fillRect(Math.min(x0, x1), r.y - 5, 71, r.h + 10);
    }
  }

  private drawDetector(L: Layout) {
    const c = this.c;
    const d = this.data!;
    const x0 = L.piles[0].x - 8;
    const x1 = L.piles[1].x + L.piles[1].w + 8;
    const y = L.beamY;

    c.strokeStyle = "rgba(255,122,26,0.22)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x0, y);
    c.lineTo(x1, y);
    c.stroke();
    const seg = c.createLinearGradient(L.cursorX - 90, 0, L.cursorX + 90, 0);
    seg.addColorStop(0, "rgba(255,122,26,0)");
    seg.addColorStop(0.5, "rgba(255,122,26,0.95)");
    seg.addColorStop(1, "rgba(255,122,26,0)");
    c.strokeStyle = seg;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(L.cursorX - 90, y);
    c.lineTo(L.cursorX + 90, y);
    c.stroke();
    if (this.flash.t > 0) {
      c.save();
      c.globalAlpha = this.flash.t;
      c.shadowColor = this.flash.green ? C.green : C.red;
      c.shadowBlur = 14;
      c.strokeStyle = this.flash.green ? C.green : C.red;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      c.stroke();
      c.restore();
    }

    const next = Math.min(this.N(), this.crossed + 1);
    const prevIndex = next - 1;
    if (this.wheelFor !== prevIndex) {
      this.wheel = listSample(d.key, d.tokens[prevIndex] ?? "", d.gamma, WHEEL_DOTS);
      this.wheelFor = prevIndex;
    }
    const R = L.wide ? 30 : 26;
    for (let k = 0; k < WHEEL_DOTS; k++) {
      const a = this.disp.spin + (k / WHEEL_DOTS) * TAU;
      c.fillStyle = this.wheel[k] ? C.green : "rgba(248,113,113,0.42)";
      c.beginPath();
      c.arc(L.cursorX + Math.cos(a) * R, y + Math.sin(a) * R, this.wheel[k] ? 2.6 : 2, 0, TAU);
      c.fill();
    }
    c.strokeStyle = C.beam;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(L.cursorX, y, 7, 0, TAU);
    c.stroke();

    c.font = `400 11px ${this.mono}`;
    c.fillStyle = C.muted;
    c.textAlign = "left";
    c.textBaseline = "middle";
    const prev = d.tokens[prevIndex] ?? "";
    const shown = prev.length > 12 ? `${prev.slice(0, 11)}…` : prev;
    c.fillText(`after “${shown}”`, L.cursorX + R + 12, y - 8);
    c.fillText(`${Math.round(d.gamma * 100)}% ${L.wide ? "of words " : ""}green`, L.cursorX + R + 12, y + 8);
  }

  private drawPiles(L: Layout) {
    const c = this.c;
    const d = this.data!;
    const s = this.stats();
    const landed = s.T;
    const counts = [s.G, s.T - s.G];

    L.piles.forEach((pile, k) => {
      roundRect(c, pile.x - 6, pile.y - 4, pile.w + 12, pile.h + 8, 12);
      c.fillStyle = "rgba(255,255,255,0.022)";
      c.fill();
      c.strokeStyle = C.line;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(pile.x - 6, pile.y + pile.h + 4);
      c.lineTo(pile.x + pile.w + 6, pile.y + pile.h + 4);
      c.stroke();
      const title = k === 0 ? "GREEN LIST" : "RED LIST";
      c.font = `600 11px ${this.sans}`;
      c.letterSpacing = "0.12em";
      c.fillStyle = k === 0 ? C.green : C.red;
      c.textAlign = "left";
      c.textBaseline = "alphabetic";
      c.fillText(title, pile.x - 4, pile.y - 14);
      const titleW = c.measureText(title).width;
      c.letterSpacing = "0px";
      c.font = `500 18px ${this.sans}`;
      c.fillStyle = C.text;
      c.fillText(String(counts[k]), pile.x + titleW + 6, pile.y - 13);
    });

    const T = this.disp.T;
    const gamma = d.gamma;
    const sigma = Math.sqrt(Math.max(T, 0) * gamma * (1 - gamma));
    const green = L.piles[0];
    const base = green.y + green.h;
    const yFor = (count: number) => base - this.heightFor(count);
    const y0 = yFor(gamma * T);
    const y2 = yFor(gamma * T + 2 * sigma);
    const y4 = yFor(gamma * T + 4 * sigma);
    if (T > 0.5) {
      if (y4 > green.y) {
        c.fillStyle = "rgba(52,211,153,0.07)";
        c.fillRect(green.x - 6, green.y - 4, green.w + 12, y4 - green.y + 4);
      }
      const rule = (yy: number, color: string, label: string, dash: number[], show: boolean) => {
        if (yy < green.y - 2) return;
        c.setLineDash(dash);
        c.strokeStyle = color;
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(green.x - 12, yy);
        c.lineTo(green.x + green.w + 6, yy);
        c.stroke();
        c.setLineDash([]);
        if (!show) return;
        c.font = `500 11px ${this.sans}`;
        c.fillStyle = color;
        c.textAlign = "right";
        c.textBaseline = "middle";
        c.fillText(label, green.x - 16, yy);
      };
      rule(y0, "rgba(236,235,228,0.55)", "chance", [4, 4], true);
      rule(y2, "rgba(251,191,36,0.75)", "+2σ", [], y0 - y2 > 12);
      rule(y4, C.green, "+4σ", [], y2 - y4 > 12);

      const red = L.piles[1];
      const yr = red.y + red.h - this.heightFor((1 - gamma) * T);
      if (yr > red.y) {
        c.setLineDash([4, 4]);
        c.strokeStyle = "rgba(236,235,228,0.35)";
        c.beginPath();
        c.moveTo(red.x - 6, yr);
        c.lineTo(red.x + red.w + 6, yr);
        c.stroke();
        c.setLineDash([]);
      }
    }

    const popWindow = POP * this.speed;
    for (let i = 1; i <= landed; i++) {
      const r = this.slotRect(i);
      const age = this.p + 1 - FALL * this.speed - (i - 1);
      const pop = age < popWindow ? 1 + 0.25 * Math.sin((age / popWindow) * Math.PI) : 1;
      const w = r.w * pop;
      roundRect(c, r.x + (r.w - w) / 2, r.y + (r.h - w) / 2, w, w, Math.max(2, this.cell * 0.22));
      c.fillStyle = d.greens[i] ? C.green : "rgba(248,113,113,0.62)";
      c.fill();
    }
  }

  private drawFlight(L: Layout) {
    const d = this.data!;
    const launched = Math.max(0, Math.min(this.N(), Math.floor(this.p + 1)));
    const landed = this.landedAt(this.p);
    const startY = L.ribbon.y + RIBBON_H / 2;
    for (let i = landed + 1; i <= launched; i++) {
      const f = clamp01((this.p - (i - 1)) / (FALL * this.speed));
      if (f <= 0) continue;
      const w0 = this.widths[i];
      if (f < CROSS) {
        const a = easeIn(f / CROSS);
        const y = startY + (L.beamY - startY) * a;
        this.chip(L.cursorX - (w0 * 0.92) / 2, y - (RIBBON_H * 0.92) / 2, w0 * 0.92, RIBBON_H * 0.92, d.tokens[i], "rgba(30,26,22,0.95)", C.beam, C.text);
      } else {
        const b = easeOut((f - CROSS) / (1 - CROSS));
        const slot = this.slotRect(i);
        const tx = slot.x + slot.w / 2;
        const ty = slot.y + slot.h / 2;
        const ix = (1 - b) * (1 - b) * L.cursorX + 2 * (1 - b) * b * tx + b * b * tx;
        const iy = (1 - b) * (1 - b) * L.beamY + 2 * (1 - b) * b * L.beamY + b * b * ty;
        const w = w0 * 0.92 + (this.cell - w0 * 0.92) * b;
        const h = RIBBON_H * 0.92 + (this.cell - RIBBON_H * 0.92) * b;
        const g = d.greens[i];
        this.chip(ix - w / 2, iy - h / 2, w, h, d.tokens[i], g ? "rgba(20,70,52,0.96)" : "rgba(70,28,28,0.96)", g ? C.green : C.red, g ? "#d6fbe9" : "#fbd5d5", 1 - b * 2.2);
      }
    }
  }

  private drawPanel(L: Layout) {
    const c = this.c;
    const d = this.data!;
    const P = L.panel;
    const s = this.stats();
    const z = this.disp.z;
    const v = verdictFor(z, s.T);
    const zColor = s.T < 8 ? C.text : z >= 4 ? C.green : z >= 2 ? C.amber : C.text;

    roundRect(c, P.x, P.y, P.w, P.h, 18);
    c.fillStyle = C.panel;
    c.fill();

    const stat = (x: number, y: number, label: string, value: string) => {
      c.font = `400 12px ${this.sans}`;
      c.fillStyle = C.muted;
      c.textAlign = "left";
      c.fillText(label, x, y);
      c.font = `500 13px ${this.sans}`;
      c.fillStyle = C.text;
      c.textAlign = "right";
      c.fillText(value, x + (L.wide ? P.w - 40 : Math.min(190, P.w * 0.5)), y);
    };
    const p = s.T >= 8 ? formatP(pValue(s.z)) : "–";

    c.textBaseline = "alphabetic";
    if (L.wide) {
      const x = P.x + 20;
      c.font = `600 11px ${this.sans}`;
      c.letterSpacing = "0.12em";
      c.fillStyle = C.muted;
      c.textAlign = "left";
      c.fillText("Z-SCORE", x, P.y + 30);
      c.letterSpacing = "0px";
      c.font = `300 56px ${this.sans}`;
      c.fillStyle = zColor;
      c.fillText(z.toFixed(2), x - 2, P.y + 88);
      c.font = `600 15px ${this.sans}`;
      c.fillStyle = v.color;
      c.fillText(v.text, x, P.y + 116);
      stat(x, P.y + 150, "Green words", `${s.G} of ${s.T}`);
      stat(x, P.y + 172, "Expected by chance", (d.gamma * s.T).toFixed(1));
      stat(x, P.y + 194, "p-value", p);
      const bh = Math.min(96, P.h - 250);
      if (bh > 40) this.bell({ x: x, y: P.y + P.h - bh - (this.opts.footnote ? 40 : 26), w: P.w - 40, h: bh }, z, s.T);
      if (this.opts.footnote) {
        c.font = `400 11px ${this.sans}`;
        c.fillStyle = C.muted;
        c.textAlign = "left";
        c.fillText(this.opts.footnote, x, P.y + P.h - 14);
      }
    } else {
      const x = P.x + 16;
      c.font = `600 10px ${this.sans}`;
      c.letterSpacing = "0.12em";
      c.fillStyle = C.muted;
      c.textAlign = "left";
      c.fillText("Z-SCORE", x, P.y + 22);
      c.letterSpacing = "0px";
      c.font = `300 38px ${this.sans}`;
      c.fillStyle = zColor;
      c.fillText(z.toFixed(2), x - 1, P.y + 62);
      c.font = `600 13px ${this.sans}`;
      c.fillStyle = v.color;
      c.fillText(v.text, x, P.y + 84);
      c.font = `400 12px ${this.sans}`;
      c.fillStyle = C.muted;
      c.fillText(`${s.G} of ${s.T} green · chance ${(d.gamma * s.T).toFixed(1)} · p ${p}`, x, P.y + 104);
      const bw = Math.min(170, P.w * 0.42);
      if (P.w > 330) this.bell({ x: P.x + P.w - bw - 14, y: P.y + 14, w: bw, h: 58 }, z, s.T);
    }
  }

  private bell(r: Rect, z: number, T: number) {
    const c = this.c;
    const lo = -4;
    const hi = 10;
    const X = (v: number) => r.x + ((v - lo) / (hi - lo)) * r.w;
    const Y = (v: number) => r.y + r.h - Math.exp(-0.5 * v * v) * (r.h - 8);
    c.fillStyle = "rgba(52,211,153,0.1)";
    c.fillRect(X(4), r.y, X(hi) - X(4), r.h);
    c.beginPath();
    c.moveTo(X(lo), r.y + r.h);
    for (let v = lo; v <= hi + 1e-6; v += 0.1) c.lineTo(X(v), Y(v));
    c.lineTo(X(hi), r.y + r.h);
    c.closePath();
    c.fillStyle = "rgba(255,255,255,0.06)";
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.4)";
    c.lineWidth = 1.2;
    c.beginPath();
    for (let v = lo; v <= hi + 1e-6; v += 0.1) {
      if (v === lo) c.moveTo(X(v), Y(v));
      else c.lineTo(X(v), Y(v));
    }
    c.stroke();
    c.strokeStyle = C.line;
    c.beginPath();
    c.moveTo(r.x, r.y + r.h);
    c.lineTo(r.x + r.w, r.y + r.h);
    c.stroke();
    c.setLineDash([3, 3]);
    c.strokeStyle = C.green;
    c.beginPath();
    c.moveTo(X(4), r.y);
    c.lineTo(X(4), r.y + r.h);
    c.stroke();
    c.setLineDash([]);
    c.font = `400 10px ${this.sans}`;
    c.fillStyle = C.muted;
    c.textAlign = "center";
    c.textBaseline = "top";
    for (const t of [0, 4, 8]) c.fillText(String(t), X(t), r.y + r.h + 4);
    c.textBaseline = "alphabetic";
    if (T < 1) return;
    const zc = Math.max(lo, Math.min(hi, z));
    const color = z >= 4 ? C.green : z >= 2 ? C.amber : C.text;
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(X(zc), r.y + 2);
    c.lineTo(X(zc), r.y + r.h);
    c.stroke();
    c.fillStyle = color;
    c.beginPath();
    c.arc(X(zc), r.y + r.h, 3.5, 0, TAU);
    c.fill();
    if (z > hi) {
      c.font = `600 11px ${this.sans}`;
      c.textAlign = "right";
      c.fillText("→", X(hi) - 4, r.y + 12);
    }
  }

  /* -------------------------------- tooltip -------------------------------- */

  private onMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!this.raf) this.draw();
  };

  private onLeave = () => {
    this.pointer = null;
    if (!this.raf) this.draw();
  };

  private hit(L: Layout): number {
    const pt = this.pointer;
    if (!pt || !this.data) return -1;
    const r = L.ribbon;
    if (pt.y >= r.y && pt.y <= r.y + r.h && pt.x >= r.x && pt.x <= r.x + r.w) {
      for (let i = 0; i < this.widths.length; i++) {
        const x = r.x + this.offsets[i] - this.disp.scroll;
        if (pt.x >= x && pt.x <= x + this.widths[i]) return i;
      }
    }
    const landed = this.landedAt(this.p);
    for (let i = 1; i <= landed; i++) {
      const s = this.slotRect(i);
      if (pt.x >= s.x - 1 && pt.x <= s.x + s.w + 1 && pt.y >= s.y - 1 && pt.y <= s.y + s.h + 1) return i;
    }
    return -1;
  }

  private drawTooltip(L: Layout) {
    const i = this.hit(L);
    if (i < 0 || !this.pointer || !this.data) return;
    const c = this.c;
    const d = this.data;
    const word = `“${d.tokens[i]}”`;
    const detail =
      i === 0
        ? "start word, not scored"
        : i > this.crossed
          ? "not checked yet"
          : `after “${d.tokens[i - 1]}”: ${d.greens[i] ? "green list" : "red list"}`;
    c.font = `500 13px ${this.mono}`;
    const w1 = c.measureText(word).width;
    c.font = `400 12px ${this.sans}`;
    const w2 = c.measureText(detail).width;
    const w = Math.max(w1, w2) + 24;
    const h = 48;
    let x = this.pointer.x + 14;
    let y = this.pointer.y + 16;
    if (x + w > this.W - 6) x = this.pointer.x - w - 14;
    if (y + h > this.H - 6) y = this.pointer.y - h - 12;
    roundRect(c, x, y, w, h, 10);
    c.fillStyle = "#1c222b";
    c.fill();
    c.strokeStyle = C.line;
    c.lineWidth = 1;
    c.stroke();
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.font = `500 13px ${this.mono}`;
    c.fillStyle = C.text;
    c.fillText(word, x + 12, y + 20);
    c.font = `400 12px ${this.sans}`;
    c.fillStyle = i === 0 || i > this.crossed ? C.muted : d.greens[i] ? C.green : C.red;
    c.fillText(detail, x + 12, y + 38);
  }
}
