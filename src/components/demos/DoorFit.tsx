"use client";

import { useState } from "react";
import DemoFrame from "./DemoFrame";

const DOOR_H = 7;
const DOOR_W = 3;

type Part = { name: string; qty: number; dims: [number, number, number] };

const ASSEMBLED: Part = { name: "Assembled module", qty: 1, dims: [28, 14, 14] };
const PARTS: Part[] = [
  { name: "End cone quarter", qty: 8, dims: [7, 7, 1.5] },
  { name: "Truss ring segment", qty: 16, dims: [6.9, 6.9, 0.5] },
  { name: "Corridor wall, folded", qty: 4, dims: [6.5, 3.2, 0.4] },
  { name: "Base platform section", qty: 4, dims: [7, 3.5, 0.8] },
  { name: "Outer shell panel", qty: 24, dims: [6.8, 2.2, 0.1] },
  { name: "Touchscreen", qty: 8, dims: [4.2, 2.5, 0.3] },
];

function fits(p: Part) {
  const [a, b] = [...p.dims].sort((x, y) => x - y);
  return a <= DOOR_W && b <= DOOR_H;
}

const S = 14;

export default function DoorFit() {
  const [transport, setTransport] = useState(false);
  const list = transport ? PARTS : [ASSEMBLED];

  return (
    <DemoFrame title="Door fit check" note="Illustrative dimensions · built for this portfolio">
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Mode">
        <button type="button" className="pill" aria-pressed={!transport} onClick={() => setTransport(false)}>
          <span>Assembled</span>
        </button>
        <button type="button" className="pill" aria-pressed={transport} onClick={() => setTransport(true)}>
          <span>Transport mode</span>
        </button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <svg viewBox="0 0 520 300" className="w-full rounded-lg border border-line bg-white" role="img" aria-label="Module cross-section next to a seven-foot door">
          <line x1={20} x2={500} y1={270} y2={270} stroke="#0d1014" />
          <rect x={40} y={270 - DOOR_H * S} width={DOOR_W * S} height={DOOR_H * S} fill="none" stroke="#c44b22" strokeWidth={2} />
          <text x={40} y={270 - DOOR_H * S - 8} fontSize={11} fill="#a93e1a" fontFamily="var(--font-mono)">
            DOOR 7 FT
          </text>
          <g transform={`translate(${transport ? 330 : 300}, ${270 - 7 * S})`} style={{ transition: "transform 600ms ease" }}>
            {[0, 1, 2, 3].map((q) => {
              const off = transport ? 16 : 0;
              const dx = (q === 0 || q === 3 ? 1 : -1) * off;
              const dy = (q < 2 ? -1 : 1) * off;
              const start = (q * Math.PI) / 2;
              const end = start + Math.PI / 2;
              const r = 7 * S;
              const x1 = Math.cos(start) * r;
              const y1 = -Math.sin(start) * r;
              const x2 = Math.cos(end) * r;
              const y2 = -Math.sin(end) * r;
              return (
                <path
                  key={q}
                  d={`M0 0 L${x1} ${y1} A${r} ${r} 0 0 0 ${x2} ${y2} Z`}
                  transform={`translate(${dx}, ${dy})`}
                  fill={transport ? "rgba(13,16,20,0.06)" : "rgba(13,16,20,0.04)"}
                  stroke="#0d1014"
                  style={{ transition: "transform 600ms ease" }}
                />
              );
            })}
            <circle r={5.5 * S} fill="none" stroke="#7a8491" strokeDasharray="3 4" />
          </g>
          {transport ? (
            <g transform={`translate(${40 + DOOR_W * S * 0.5 - 0.75 * S}, ${270 - 7 * S})`}>
              <rect width={1.5 * S} height={7 * S} fill="rgba(47,111,79,0.18)" stroke="#2f6f4f" />
              <text x={-4} y={-6} fontSize={10} fill="#2f6f4f" fontFamily="var(--font-mono)">
                ON EDGE
              </text>
            </g>
          ) : null}
          <text x={transport ? 330 : 300} y={290} fontSize={11} textAnchor="middle" fill="#5a636e" fontFamily="var(--font-mono)">
            14 FT DIAMETER
          </text>
        </svg>

        <div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Part</th>
                <th className="num">Qty</th>
                <th className="num">Size (ft)</th>
                <th>Door</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="num">{p.qty}</td>
                  <td className="num">{p.dims.join(" × ")}</td>
                  <td className={fits(p) ? "tag-ok" : "tag-bad"}>{fits(p) ? "Fits" : "Won't fit"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm muted">
            Rule: a part clears the door if its two smallest dimensions fit the door&apos;s width and height, so it can be carried through on edge. The
            dimensions are illustrative. The real design documents describe the approach, not these exact numbers.
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
