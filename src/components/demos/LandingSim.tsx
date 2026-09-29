"use client";

import { useMemo, useState } from "react";
import DemoFrame from "./DemoFrame";

type Body = "earth" | "moon";

type Config = {
  body: Body;
  chuteAlt: number;
  chuteArea: number;
  airBrakes: boolean;
  burnAlt: number;
  tw: number;
};

type Result = { t: number[]; h: number[]; v: number[]; touchdown: number; maxG: number; stoppedHigh: boolean };

const MASS = 1.8e6;
const DT = 0.02;

function simulate(c: Config): Result {
  const g = c.body === "earth" ? 9.81 : 1.62;
  let h = c.body === "earth" ? 6000 : 2500;
  let v = c.body === "earth" ? -250 : -80;
  let t = 0;
  let burning = false;
  let fuelOut = false;
  let chute = false;
  let maxG = 0;
  let stoppedHigh = false;
  const ts: number[] = [];
  const hs: number[] = [];
  const vs: number[] = [];
  let k = 0;
  let hPrev = h;
  let vPrev = v;
  const advance = (dt: number) => {
    const rho = c.body === "earth" ? 1.225 * Math.exp(-h / 8500) : 0;
    const area = 80 + (c.airBrakes && h < 5000 ? 45 : 0);
    const cdA = 0.75 * area + (chute ? 1.5 * c.chuteArea : 0);
    const drag = 0.5 * rho * v * v * cdA * (v < 0 ? 1 : -1);
    const thrust = burning ? c.tw * MASS * g : 0;
    const a = (drag + thrust) / MASS - g;
    maxG = Math.max(maxG, Math.abs(a + g) / 9.81);
    v += a * dt;
    h += v * dt;
    t += dt;
  };
  while (h > 0 && t < 400) {
    hPrev = h;
    vPrev = v;
    if (!chute && c.chuteArea > 0 && h <= c.chuteAlt && c.body === "earth") chute = true;
    const armed = !burning && !fuelOut && c.tw > 0;
    if (armed && h > c.burnAlt && v < 0 && h + v * DT <= c.burnAlt) {
      // Light the engine exactly at the burn altitude, not at the next step boundary.
      const dt1 = (h - c.burnAlt) / -v;
      advance(dt1);
      burning = true;
      advance(DT - dt1);
    } else {
      if (armed && h <= c.burnAlt) burning = true;
      advance(DT);
    }
    if (burning && v >= 0) {
      burning = false;
      fuelOut = true;
      v = 0;
      if (h > 1) stoppedHigh = true;
    }
    if (k++ % 10 === 0) {
      ts.push(t);
      hs.push(Math.max(h, 0));
      vs.push(v);
    }
  }
  // Ground contact happens inside the last step; interpolate so touchdown speed doesn't jump between step sizes.
  const f = h < 0 && hPrev > 0 ? hPrev / (hPrev - h) : 1;
  const vTouch = vPrev + (v - vPrev) * f;
  ts.push(t);
  hs.push(0);
  vs.push(vTouch);
  return { t: ts, h: hs, v: vs, touchdown: Math.abs(vTouch), maxG, stoppedHigh };
}

/** Finds the landing-burn start altitude that lands closest to a target touchdown speed. */
function tuneBurn(base: Config, target: number): number {
  let best = { alt: base.burnAlt, err: Infinity };
  for (let alt = 50; alt <= 3000; alt += 10) {
    const r = simulate({ ...base, burnAlt: alt });
    if (r.stoppedHigh) continue;
    const err = Math.abs(r.touchdown - target);
    if (err < best.err) best = { alt, err };
  }
  for (const [span, step] of [
    [10, 0.5],
    [0.5, 0.02],
    [0.03, 0.001],
  ]) {
    const center = best.alt;
    for (let alt = center - span; alt <= center + span; alt += step) {
      const r = simulate({ ...base, burnAlt: alt });
      if (r.stoppedHigh) continue;
      const err = Math.abs(r.touchdown - target);
      if (err < best.err) best = { alt, err };
    }
  }
  return best.alt;
}

const TEAM_BASE: Config = { body: "earth", chuteAlt: 3000, chuteArea: 2600, airBrakes: true, burnAlt: 600, tw: 1.4 };

function Chart({ xs, ys, label, color, zeroLine }: { xs: number[]; ys: number[]; label: string; color: string; zeroLine?: boolean }) {
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const px = (x: number) => 40 + (x / maxX) * 540;
  const py = (y: number) => 150 - ((y - minY) / (maxY - minY || 1)) * 130;
  return (
    <svg viewBox="0 0 600 170" className="w-full rounded-lg border border-line bg-white" role="img" aria-label={label}>
      <text x={40} y={14} fontSize={10} fill="#5a636e" fontFamily="var(--font-mono)">
        {label}
      </text>
      {zeroLine ? <line x1={40} x2={580} y1={py(0)} y2={py(0)} stroke="#e4e0d8" /> : null}
      <line x1={40} x2={40} y1={20} y2={150} stroke="#e4e0d8" />
      <line x1={40} x2={580} y1={150} y2={150} stroke="#e4e0d8" />
      <polyline fill="none" stroke={color} strokeWidth={1.6} points={xs.map((x, i) => `${px(x)},${py(ys[i])}`).join(" ")} />
      <text x={580} y={165} fontSize={9} textAnchor="end" fill="#5a636e" fontFamily="var(--font-mono)">
        {maxX.toFixed(0)} s
      </text>
      <text x={36} y={24} fontSize={9} textAnchor="end" fill="#5a636e" fontFamily="var(--font-mono)">
        {maxY.toFixed(0)}
      </text>
      <text x={36} y={152} fontSize={9} textAnchor="end" fill="#5a636e" fontFamily="var(--font-mono)">
        {minY.toFixed(0)}
      </text>
    </svg>
  );
}

export default function LandingSim() {
  const [c, setC] = useState<Config>({ body: "earth", chuteAlt: 0, chuteArea: 0, airBrakes: false, burnAlt: 900, tw: 1.4 });
  const r = useMemo(() => simulate(c), [c]);
  const pass = r.touchdown < 5;
  const set = (patch: Partial<Config>) => setC((prev) => ({ ...prev, ...patch }));

  return (
    <DemoFrame
      title="Landing simulator"
      note="1-D model · built for this portfolio"
      actions={
        <button type="button" className="btn btn-sm" onClick={() => setC({ ...TEAM_BASE, burnAlt: tuneBurn(TEAM_BASE, 4.43) })}>
          Load a setup like ours
        </button>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="flex gap-2" role="group" aria-label="Body">
            {(["earth", "moon"] as const).map((b) => (
              <button key={b} type="button" className="pill" aria-pressed={c.body === b} onClick={() => set({ body: b })}>
                <span>{b === "earth" ? "Earth" : "Moon"}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>Parachute opens at · {c.chuteArea ? `${c.chuteAlt} m` : "off"}</span>
            <input type="range" min={0} max={5000} step={100} value={c.chuteAlt} disabled={c.body === "moon"} onChange={(e) => set({ chuteAlt: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Parachute area · {c.chuteArea} m²</span>
            <input type="range" min={0} max={4000} step={100} value={c.chuteArea} disabled={c.body === "moon"} onChange={(e) => set({ chuteArea: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={c.airBrakes} disabled={c.body === "moon"} onChange={(e) => set({ airBrakes: e.target.checked })} />
            Air brakes and grid fins below 5 km
          </label>
          <label className="field">
            <span>Landing burn starts at · {c.burnAlt.toFixed(0)} m</span>
            <input type="range" min={0} max={3000} step={10} value={c.burnAlt} onChange={(e) => set({ burnAlt: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Thrust-to-weight · {c.tw.toFixed(2)}</span>
            <input type="range" min={0} max={3} step={0.05} value={c.tw} onChange={(e) => set({ tw: Number(e.target.value) })} />
          </label>
          {c.body === "moon" ? <p className="text-sm muted">No air on the Moon, so parachutes and air brakes do nothing. It&apos;s all engine.</p> : null}
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4" style={{ borderColor: pass ? "var(--color-go)" : "var(--color-stop)" }}>
              <p className="label muted">Touchdown</p>
              <p className="text-3xl font-light tabular-nums">{r.touchdown.toFixed(2)} m/s</p>
              <p className={`text-sm font-medium ${pass ? "tag-ok" : "tag-bad"}`}>{pass ? "Under 5 m/s. Landed." : r.stoppedHigh ? "Stopped too high, then fell" : "Too fast"}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="label muted">Peak load</p>
              <p className="text-3xl font-light tabular-nums">{r.maxG.toFixed(1)} g</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="label muted">Descent time</p>
              <p className="text-3xl font-light tabular-nums">{r.t[r.t.length - 1].toFixed(0)} s</p>
            </div>
          </div>
          <Chart xs={r.t} ys={r.h} label="ALTITUDE (M)" color="#0d1014" />
          <Chart xs={r.t} ys={r.v} label="VERTICAL VELOCITY (M/S)" color="#c44b22" zeroLine />
        </div>
      </div>
      <p className="mt-6 text-sm muted">
        Burn too late and you can&apos;t stop. Burn too early and you stop in the air, run out of fuel and fall. The window between the two is narrow, and a
        parachute and air brakes make it wider by bleeding off speed for free.
      </p>
    </DemoFrame>
  );
}
