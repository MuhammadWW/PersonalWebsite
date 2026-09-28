"use client";

import { useMemo, useState } from "react";
import DemoFrame from "./DemoFrame";
import { APS, DEVICES, WINDOW_S, clock, detect, generateLog, parseLog, sessions, type Finding } from "./logData";

const AP_COLORS: Record<string, string> = { "ap-1": "#0d1014", "ap-2": "#7a8491", "ap-3": "#c44b22" };
const W = 1000;
const LANE = 30;
const PAD_L = 70;

export default function LogExplorer() {
  const [seed, setSeed] = useState(142);
  const [focus, setFocus] = useState<Finding | null>(null);
  const [device, setDevice] = useState<string>("all");
  const [query, setQuery] = useState("");

  const raw = useMemo(() => generateLog(seed), [seed]);
  const { events, skipped } = useMemo(() => parseLog(raw), [raw]);
  const sess = useMemo(() => sessions(events), [events]);
  const findings = useMemo(() => detect(events), [events]);

  const x = (t: number) => PAD_L + (t / WINDOW_S) * (W - PAD_L - 10);
  const height = DEVICES.length * LANE + 36;

  const lines = useMemo(() => {
    const q = query.trim().toLowerCase();
    return raw
      .split("\n")
      .map((text, i) => ({ text, n: i + 1 }))
      .filter((l) => (device === "all" || l.text.includes(` ${device} `)) && (!q || l.text.toLowerCase().includes(q)));
  }, [raw, device, query]);

  return (
    <DemoFrame
      title="Wireless log explorer"
      note="Synthetic logs · not station data"
      actions={
        <button type="button" className="btn btn-sm" onClick={() => { setSeed((s) => s + 1); setFocus(null); }}>
          New log
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm muted">
        <span>{events.length.toLocaleString()} events parsed</span>
        <span>{skipped} lines skipped</span>
        <span>{sess.length} sessions reconstructed</span>
        <span className="flex flex-wrap items-center gap-3">
          {APS.map((ap) => (
            <span key={ap} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: AP_COLORS[ap] }} /> {ap}
            </span>
          ))}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <svg viewBox={`0 0 ${W} ${height}`} className="block min-w-[720px]" role="img" aria-label="Connection timeline by device">
          {Array.from({ length: 7 }, (_, i) => i * 1800).map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={10} y2={height - 20} stroke="#e4e0d8" />
              <text x={x(t)} y={height - 6} fontSize={10} textAnchor="middle" fill="#5a636e" fontFamily="var(--font-mono)">
                {clock(t)}
              </text>
            </g>
          ))}
          {focus ? <rect x={x(Math.max(0, focus.from))} y={6} width={Math.max(4, x(Math.min(WINDOW_S, focus.to)) - x(Math.max(0, focus.from)))} height={height - 28} fill="rgba(196,75,34,0.1)" stroke="rgba(196,75,34,0.5)" /> : null}
          {DEVICES.map((d, i) => {
            const y = 14 + i * LANE;
            const dim = focus && !focus.devices.includes(d);
            return (
              <g key={d} opacity={dim ? 0.3 : 1}>
                <text x={8} y={y + 13} fontSize={11} fill="#0d1014" fontFamily="var(--font-mono)">
                  {d}
                </text>
                <line x1={PAD_L} x2={W - 10} y1={y + 9} y2={y + 9} stroke="#eeeae3" />
                {sess
                  .filter((s) => s.device === d)
                  .map((s, k) => (
                    <rect key={k} x={x(s.start)} y={y + 3} width={Math.max(1.5, x(s.end) - x(s.start))} height={12} rx={2} fill={AP_COLORS[s.ap] ?? "#999"}>
                      <title>{`${d} on ${s.ap} ${s.band}, ${clock(s.start)}–${clock(s.end)}${s.reason ? `, ended reason=${s.reason}` : ""}`}</title>
                    </rect>
                  ))}
                {events
                  .filter((e) => e.device === d && e.event === "AUTH_REJECT")
                  .map((e, k) => (
                    <line key={`r${k}`} x1={x(e.t)} x2={x(e.t)} y1={y} y2={y + 18} stroke="#a33a2c" strokeWidth={1.5}>
                      <title>{e.raw}</title>
                    </line>
                  ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="label muted mb-3">What the detectors found</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {findings.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setFocus(focus?.id === f.id ? null : f)}
                  className="w-full rounded-lg border bg-white p-4 text-left transition-colors hover:border-ink"
                  style={{ borderColor: focus?.id === f.id ? "var(--color-signal)" : "var(--color-line)" }}
                  aria-pressed={focus?.id === f.id}
                >
                  <span className="block font-medium">{f.title}</span>
                  <span className="mt-1 block text-sm muted">{f.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="field">
              <span>Device</span>
              <select className="select" value={device} onChange={(e) => setDevice(e.target.value)}>
                <option value="all">All devices</option>
                {DEVICES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="field flex-1">
              <span>Search raw log</span>
              <input className="input" placeholder="AUTH_REJECT, reason=4, ap-2…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          <div className="max-h-[340px] overflow-auto rounded-lg border border-line bg-ink p-3 font-mono text-[0.72rem] leading-relaxed text-paper">
            {lines.slice(0, 400).map((l) => (
              <div key={l.n} className="whitespace-pre" style={{ color: /REJECT|REBOOT|reason=1\b/.test(l.text) ? "#ff9b7a" : undefined }}>
                <span className="mr-3 inline-block w-8 text-right opacity-40">{l.n}</span>
                {l.text}
              </div>
            ))}
            {lines.length > 400 ? <div className="mt-2 opacity-60">…{lines.length - 400} more lines</div> : null}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
