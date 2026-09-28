import { sum } from "@/lib/std/array";
import { gaussian, mulberry32, pick, randInt } from "@/lib/rng";

export type Decision = "include" | "exclude";

export type Line = {
  id: string;
  po: string;
  vendor: string;
  prime: string;
  campus: string;
  invoice: string;
  cents: number;
  junk?: "total" | "filters";
};

export type Quarter = {
  lines: Line[];
  prior: Map<string, Decision>;
  sourceTotalCents: number;
  sourceLineCount: number;
};

const VENDORS = [
  "Northline Builders",
  "Granite & Oak Constructors",
  "Bayou Civil Group",
  "Summit Mechanical",
  "Redline Electric",
  "Prairie Steel Works",
  "Lakeshore Interiors",
  "Keystone Commissioning",
  "Atlas Design Studio",
  "Sterling M&E Supply",
  "Cedar Point Controls",
  "Ironwood Contracting",
];

const PRIMES: [string, number][] = [
  ["Construction", 30],
  ["Electrical", 18],
  ["Mechanical", 16],
  ["Civil", 10],
  ["Controls", 8],
  ["Design", 7],
  ["M&E Equipment", 7],
  ["Commissioning", 4],
];

export const EXCLUDED_PRIMES = ["Design", "M&E Equipment", "Commissioning"];
export const LOW_VALUE_CENTS = 250_000 * 100;
const CAMPUSES = ["ALP", "BRV", "CDR", "DLT"];

function weightedPrime(r: () => number) {
  const total = PRIMES.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [p, w] of PRIMES) {
    x -= w;
    if (x <= 0) return p;
  }
  return PRIMES[0][0];
}

export function generateQuarter(seed: number): Quarter {
  const r = mulberry32(seed);
  const lines: Line[] = [];
  const prior = new Map<string, Decision>();
  let invoiceNo = 88100;
  const poCount = 138;
  let conflictPlanted = false;

  for (let i = 0; i < poCount; i++) {
    const po = `PO-${410000 + i * 37}`;
    const vendor = pick(r, VENDORS);
    const prime = weightedPrime(r);
    const campus = pick(r, CAMPUSES);
    if (!EXCLUDED_PRIMES.includes(prime) && r() < 0.6) prior.set(po, r() < 0.8 ? "include" : "exclude");
    const n = Math.max(1, Math.round(Math.exp(1.3 + gaussian(r) * 0.75)));
    for (let k = 0; k < Math.min(n, 16); k++) {
      const dollars = Math.exp(12.4 + gaussian(r) * 1.25);
      let cents = Math.round(Math.min(dollars, 9_000_000) * 100);
      if (r() < 0.05) cents = -Math.round((5_000 + r() * 180_000) * 100);
      lines.push({ id: `L${lines.length + 1}`, po, vendor, prime, campus, invoice: `INV-${invoiceNo++}`, cents });
    }
    if (r() < 0.05) {
      const amt = Math.round((40_000 + r() * 900_000) * 100);
      lines.push({ id: `L${lines.length + 1}`, po, vendor, prime, campus, invoice: `INV-${invoiceNo++}`, cents: amt });
      lines.push({ id: `L${lines.length + 1}`, po, vendor, prime, campus, invoice: `INV-${invoiceNo++}`, cents: -amt });
    }
    if (!conflictPlanted && prior.get(po) === "include" && i > 20) {
      for (let k = 0; k < 2; k++) {
        lines.push({
          id: `L${lines.length + 1}`,
          po,
          vendor,
          prime: "Commissioning",
          campus,
          invoice: `INV-${invoiceNo++}`,
          cents: Math.round((300_000 + r() * 500_000) * 100),
        });
      }
      conflictPlanted = true;
    }
  }

  const sourceTotalCents = sum(lines, (l) => l.cents);
  const sourceLineCount = lines.length;
  const insertAt = randInt(r, 10, lines.length - 10);
  lines.splice(insertAt, 0, { id: "JUNK1", po: "", vendor: "Total", prime: "", campus: "", invoice: "", cents: sourceTotalCents, junk: "total" });
  lines.push({ id: "JUNK2", po: "", vendor: "Applied filters: Quarter = Q3, Contract = GMP", prime: "", campus: "", invoice: "", cents: 0, junk: "filters" });
  return { lines, prior, sourceTotalCents, sourceLineCount };
}

export type Source = "prime" | "prior" | "review";

export type Classified = Line & { decision: Decision | "pending"; source: Source };

export function classify(lines: Line[], prior: Map<string, Decision>): Classified[] {
  return lines.map((l) => {
    if (EXCLUDED_PRIMES.includes(l.prime)) return { ...l, decision: "exclude", source: "prime" };
    const d = prior.get(l.po);
    if (d) return { ...l, decision: d, source: "prior" };
    return { ...l, decision: "pending", source: "review" };
  });
}

export type Bucketed = {
  sample: Classified[];
  gate1Excluded: Classified[];
  rebalances: Classified[];
  credits: Classified[];
  lowValue: Classified[];
};

export function applyValueRules(lines: Classified[]): Bucketed {
  const included = lines.filter((l) => l.decision === "include");
  const gate1Excluded = lines.filter((l) => l.decision === "exclude");
  const used = new Set<string>();
  const rebalances: Classified[] = [];
  const byPo = new Map<string, Classified[]>();
  for (const l of included) byPo.set(l.po, [...(byPo.get(l.po) ?? []), l]);
  for (const group of byPo.values()) {
    for (const neg of group.filter((l) => l.cents < 0)) {
      const match = group.find((pos) => !used.has(pos.id) && pos.cents === -neg.cents);
      if (match && !used.has(neg.id)) {
        used.add(match.id);
        used.add(neg.id);
        rebalances.push(match, neg);
      }
    }
  }
  const rest = included.filter((l) => !used.has(l.id));
  const credits = rest.filter((l) => l.cents < 0);
  const lowValue = rest.filter((l) => l.cents >= 0 && l.cents <= LOW_VALUE_CENTS);
  const sample = rest.filter((l) => l.cents > LOW_VALUE_CENTS);
  return { sample, gate1Excluded, rebalances, credits, lowValue };
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(cents: number) {
  return usd.format(cents / 100);
}

export function toCsv(rows: Classified[]): string {
  const head = ["line_id", "po", "vendor", "prime", "campus", "invoice", "amount_usd"];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const body = rows.map((r) => [r.id, r.po, r.vendor, r.prime, r.campus, r.invoice, (r.cents / 100).toFixed(2)].map(esc).join(","));
  return [head.join(","), ...body].join("\n");
}
