"use client";

import { useMemo, useState } from "react";
import DemoFrame from "./DemoFrame";

type Use = "gaming1080" | "gaming1440" | "stream" | "create";
type Look = "any" | "white" | "black" | "rgb";

type Cpu = { name: string; price: number; perf: number; socket: string; tdp: number };
type Gpu = { name: string; price: number; perf: number; watts: number; length: number };
type Board = { name: string; price: number; socket: string; form: "ATX" | "mATX"; look: Look[] };
type Case = { name: string; price: number; form: ("ATX" | "mATX")[]; maxGpu: number; quiet: number; look: Look[] };
type Psu = { name: string; price: number; watts: number };
type Cooler = { name: string; price: number; quiet: number; look: Look[] };

const CPUS: Cpu[] = [
  { name: "Kestrel 6-core", price: 139, perf: 58, socket: "K5", tdp: 65 },
  { name: "Kestrel 8-core", price: 229, perf: 72, socket: "K5", tdp: 105 },
  { name: "Kestrel 12-core", price: 389, perf: 88, socket: "K5", tdp: 120 },
  { name: "Osprey 6-core", price: 155, perf: 60, socket: "O7", tdp: 65 },
  { name: "Osprey 14-core", price: 339, perf: 86, socket: "O7", tdp: 125 },
];
const GPUS: Gpu[] = [
  { name: "Aster 60-class", price: 249, perf: 48, watts: 115, length: 240 },
  { name: "Aster 70-class", price: 399, perf: 66, watts: 200, length: 285 },
  { name: "Aster 80-class", price: 699, perf: 84, watts: 285, length: 310 },
  { name: "Helix 70-class", price: 449, perf: 70, watts: 245, length: 300 },
  { name: "Aster 90-class", price: 1199, perf: 100, watts: 350, length: 336 },
];
const BOARDS: Board[] = [
  { name: "K5 micro-ATX board", price: 119, socket: "K5", form: "mATX", look: ["black", "any"] },
  { name: "K5 ATX board, white", price: 179, socket: "K5", form: "ATX", look: ["white", "any", "rgb"] },
  { name: "K5 ATX board", price: 159, socket: "K5", form: "ATX", look: ["black", "rgb", "any"] },
  { name: "O7 micro-ATX board", price: 129, socket: "O7", form: "mATX", look: ["black", "any"] },
  { name: "O7 ATX board, white", price: 189, socket: "O7", form: "ATX", look: ["white", "any", "rgb"] },
];
const CASES: Case[] = [
  { name: "Compact mesh case", price: 69, form: ["mATX"], maxGpu: 300, quiet: 0.4, look: ["black", "any"] },
  { name: "Quiet mid-tower", price: 119, form: ["ATX", "mATX"], maxGpu: 340, quiet: 0.9, look: ["black", "any"] },
  { name: "White airflow mid-tower", price: 109, form: ["ATX", "mATX"], maxGpu: 360, quiet: 0.5, look: ["white", "any", "rgb"] },
  { name: "Glass RGB showcase", price: 139, form: ["ATX", "mATX"], maxGpu: 380, quiet: 0.35, look: ["rgb", "black", "any"] },
];
const PSUS: Psu[] = [
  { name: "550 W Gold", price: 69, watts: 550 },
  { name: "750 W Gold", price: 99, watts: 750 },
  { name: "1000 W Gold", price: 159, watts: 1000 },
];
const COOLERS: Cooler[] = [
  { name: "Stock-class air cooler", price: 0, quiet: 0.3, look: ["any", "black"] },
  { name: "Tower air cooler", price: 39, quiet: 0.7, look: ["any", "black"] },
  { name: "Quiet dual-tower cooler", price: 89, quiet: 0.95, look: ["any", "black"] },
  { name: "White 240 mm liquid cooler", price: 119, quiet: 0.8, look: ["white", "rgb", "any"] },
];
const RAM = { name: "32 GB DDR5", price: 89 };
const SSD = { name: "2 TB NVMe SSD", price: 119 };

const WEIGHTS: Record<Use, { gpu: number; cpu: number; label: string }> = {
  gaming1080: { gpu: 0.6, cpu: 0.4, label: "1080p gaming" },
  gaming1440: { gpu: 0.72, cpu: 0.28, label: "1440p gaming" },
  stream: { gpu: 0.55, cpu: 0.45, label: "gaming + streaming" },
  create: { gpu: 0.4, cpu: 0.6, label: "video and 3D work" },
};

function build(budget: number, use: Use, look: Look, quiet: boolean) {
  const w = WEIGHTS[use];
  let best: { score: number; parts: { slot: string; name: string; price: number }[]; notes: string[] } | null = null;
  for (const cpu of CPUS)
    for (const gpu of GPUS)
      for (const board of BOARDS) {
        if (board.socket !== cpu.socket) continue;
        if (look !== "any" && !board.look.includes(look)) continue;
        const need = Math.ceil(((cpu.tdp + gpu.watts + 100) * 1.3) / 50) * 50;
        const psu = PSUS.find((p) => p.watts >= need);
        if (!psu) continue;
        const cases = CASES.filter((c) => c.form.includes(board.form) && c.maxGpu >= gpu.length && (look === "any" || c.look.includes(look)));
        const coolers = COOLERS.filter((c) => (look === "any" || c.look.includes(look)) && (cpu.tdp <= 65 || c.price > 0));
        for (const cs of cases)
          for (const cooler of coolers) {
            const total = cpu.price + gpu.price + board.price + cs.price + psu.price + cooler.price + RAM.price + SSD.price;
            if (total > budget) continue;
            const quietness = (cs.quiet + cooler.quiet) / 2;
            const score = w.gpu * gpu.perf + w.cpu * cpu.perf + (quiet ? quietness * 18 : quietness * 4) - (budget - total) * 0.002;
            if (!best || score > best.score) {
              best = {
                score,
                parts: [
                  { slot: "CPU", name: cpu.name, price: cpu.price },
                  { slot: "Graphics", name: gpu.name, price: gpu.price },
                  { slot: "Motherboard", name: board.name, price: board.price },
                  { slot: "Memory", name: RAM.name, price: RAM.price },
                  { slot: "Storage", name: SSD.name, price: SSD.price },
                  { slot: "Cooler", name: cooler.name, price: cooler.price },
                  { slot: "Power supply", name: psu.name, price: psu.price },
                  { slot: "Case", name: cs.name, price: cs.price },
                ],
                notes: [
                  `Socket match: ${cpu.name} (${cpu.socket}) on a ${board.socket} board`,
                  `Power: about ${cpu.tdp + gpu.watts + 100} W at load × 1.3 headroom, so ${psu.watts} W`,
                  `Clearance: ${gpu.length} mm card in a case that fits ${cs.maxGpu} mm`,
                  `Budget split favors ${w.gpu > w.cpu ? "graphics" : "the CPU"} for ${w.label}`,
                  quiet ? `Quiet priority: ${cs.name.toLowerCase()} + ${cooler.name.toLowerCase()}` : "Noise: balanced for airflow",
                ],
              };
            }
          }
      }
  return best;
}

export default function PartPicker() {
  const [budget, setBudget] = useState(1400);
  const [use, setUse] = useState<Use>("gaming1440");
  const [look, setLook] = useState<Look>("any");
  const [quiet, setQuiet] = useState(false);
  const result = useMemo(() => build(budget, use, look, quiet), [budget, use, look, quiet]);
  const total = result ? result.parts.reduce((s, p) => s + p.price, 0) : 0;

  return (
    <DemoFrame title="Part picker" note="Fictional catalog · modern reconstruction">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-5">
          <label className="field">
            <span>Budget · ${budget.toLocaleString()}</span>
            <input type="range" min={800} max={3000} step={50} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>What it&apos;s for</span>
            <select className="select" value={use} onChange={(e) => setUse(e.target.value as Use)}>
              {Object.entries(WEIGHTS).map(([id, v]) => (
                <option key={id} value={id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Look</span>
            <select className="select" value={look} onChange={(e) => setLook(e.target.value as Look)}>
              <option value="any">No preference</option>
              <option value="white">All white</option>
              <option value="black">Black and minimal</option>
              <option value="rgb">RGB</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} />
            It has to be quiet
          </label>
        </div>
        <div>
          {!result ? (
            <div className="rounded-lg border border-line bg-white p-6">
              <p className="m-0 font-medium">No compatible build fits that budget with that look.</p>
              <p className="m-0 mt-1 text-sm muted">Raise the budget or relax the look. This is the conversation we&apos;d have with a client.</p>
            </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Pick</th>
                    <th className="num">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.parts.map((p) => (
                    <tr key={p.slot}>
                      <td className="muted">{p.slot}</td>
                      <td>{p.name}</td>
                      <td className="num">{p.price ? `$${p.price}` : "included"}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-medium">Total</td>
                    <td className="muted text-sm">${(budget - total).toLocaleString()} left for peripherals</td>
                    <td className="num font-medium">${total.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <p className="label muted mb-2 mt-6">Why this build</p>
              <ul className="prose-mw m-0 text-sm">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
