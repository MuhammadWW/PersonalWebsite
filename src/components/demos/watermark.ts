import { hashString, mulberry32 } from "@/lib/rng";

const CORPUS = `
the station keeps the crew connected to the ground and the ground keeps the mission moving .
every system on the station has a backup , and every backup has a test .
the team reads the logs , finds the pattern , and fixes the problem before it becomes a failure .
a good tool makes a hard job feel simple , and a simple job feel almost automatic .
the audit starts with the data , the data starts with a question , and the question starts with a person .
we build the product , we test the product , and we listen to the people who use the product .
the rocket slows down in the thick air , the parachute opens high , and the engines fire near the ground .
the signal travels from the satellite to the ground station and back to the satellite in a fraction of a second .
the engineer checks the numbers twice , because the numbers decide whether the design will hold .
the report shows the right project only when the filters match the state of the page .
a mentor listens first , asks a better question , and then helps you find your own answer .
the journal remembers what you wrote , so you can see how far you have come .
the network drops the connection when the device changes its address , and the server does not know it .
the team writes the plan , ships the first version , and improves it with every round of feedback .
the model predicts the next word , and the watermark nudges the choice toward a secret list .
the data center needs power , cooling , and a plan for every hour of every day .
a clear question saves a week of work , and a clear answer saves another week .
the students built the module , tested the module , and presented the module to the engineers .
the product earns trust when the numbers match , the steps are clear , and nothing is hidden .
the flight crew waits for the weather , the ground crew waits for the crew , and the plane waits for everyone .
`;

export const TOKENS = CORPUS.trim().split(/\s+/);
export const VOCAB = Array.from(new Set(TOKENS));
const INDEX = new Map(VOCAB.map((w, i) => [w, i]));

const unigram = new Float64Array(VOCAB.length);
const bigram = new Map<number, Map<number, number>>();
for (let i = 0; i < TOKENS.length; i++) {
  const cur = INDEX.get(TOKENS[i])!;
  unigram[cur] += 1;
  if (i > 0) {
    const prev = INDEX.get(TOKENS[i - 1])!;
    const row = bigram.get(prev) ?? new Map<number, number>();
    row.set(cur, (row.get(cur) ?? 0) + 1);
    bigram.set(prev, row);
  }
}
const unigramTotal = unigram.reduce((a, b) => a + b, 0);

/** Base next-token distribution: bigram interpolated with unigram so every step has real choices. */
function baseProbs(prev: number): Float64Array {
  const probs = new Float64Array(VOCAB.length);
  const row = bigram.get(prev);
  const rowTotal = row ? Array.from(row.values()).reduce((a, b) => a + b, 0) : 0;
  const lambda = row ? 0.72 : 0;
  for (let i = 0; i < VOCAB.length; i++) {
    const b = row && rowTotal ? (row.get(i) ?? 0) / rowTotal : 0;
    probs[i] = lambda * b + (1 - lambda) * (unigram[i] / unigramTotal);
  }
  return probs;
}

export function isGreen(key: string, prev: string, token: string, gamma: number): boolean {
  return hashString(`${key}\u0000${prev}\u0000${token}`) / 4294967296 < gamma;
}

export type GenerateOptions = {
  length: number;
  gamma: number;
  delta: number;
  hard: boolean;
  watermark: boolean;
  seed: number;
  key: string;
};

export function generate(o: GenerateOptions): string[] {
  const rand = mulberry32(o.seed);
  const out = ["the"];
  let prev = INDEX.get("the")!;
  for (let t = 0; t < o.length; t++) {
    const base = baseProbs(prev);
    const logits = new Float64Array(VOCAB.length);
    let max = -Infinity;
    for (let i = 0; i < VOCAB.length; i++) {
      let l = Math.log(base[i] + 1e-12);
      if (o.watermark) {
        const green = isGreen(o.key, VOCAB[prev], VOCAB[i], o.gamma);
        if (o.hard && !green) l = -Infinity;
        else if (green) l += o.delta;
      }
      logits[i] = l;
      if (l > max) max = l;
    }
    let total = 0;
    for (let i = 0; i < VOCAB.length; i++) {
      logits[i] = Number.isFinite(logits[i]) ? Math.exp(logits[i] - max) : 0;
      total += logits[i];
    }
    let r = rand() * total;
    let next = 0;
    for (let i = 0; i < VOCAB.length; i++) {
      r -= logits[i];
      if (r <= 0) {
        next = i;
        break;
      }
    }
    out.push(VOCAB[next]);
    prev = next;
  }
  return out;
}

/** Perplexity of a token sequence under the unwatermarked base model. */
export function perplexity(tokens: string[]): number {
  let logSum = 0;
  let n = 0;
  for (let i = 1; i < tokens.length; i++) {
    const prev = INDEX.get(tokens[i - 1]);
    const cur = INDEX.get(tokens[i]);
    const p = prev === undefined || cur === undefined ? 1 / (VOCAB.length * 50) : baseProbs(prev)[cur];
    logSum += Math.log(Math.max(p, 1e-9));
    n += 1;
  }
  return n ? Math.exp(-logSum / n) : 0;
}

export function attack(tokens: string[], replacePct: number, deletePct: number, seed: number): string[] {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const out: string[] = [];
  tokens.forEach((tok, i) => {
    if (i > 0 && rand() < deletePct / 100) return;
    if (i > 0 && rand() < replacePct / 100) out.push(VOCAB[Math.floor(rand() * VOCAB.length)]);
    else out.push(tok);
  });
  return out;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/([.,!?;:])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

function erf(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

export function zScore(G: number, T: number, gamma: number): number {
  return T > 0 ? (G - gamma * T) / Math.sqrt(T * gamma * (1 - gamma)) : 0;
}

/** One-sided p-value; switches to the Mills-ratio expansion in the tail, where 1 - erf loses precision. */
export function pValue(z: number): number {
  if (z < 3.5) return 0.5 * (1 - erf(z / Math.SQRT2));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const z2 = z * z;
  return (pdf / z) * (1 - 1 / z2 + 3 / (z2 * z2) - 15 / (z2 * z2 * z2));
}

/** Green/red status of an evenly spaced sample of the vocabulary, for the list seeded by `prev`. */
export function listSample(key: string, prev: string, gamma: number, n: number): boolean[] {
  const step = Math.max(1, Math.floor(VOCAB.length / n));
  return Array.from({ length: n }, (_, j) => isGreen(key, prev, VOCAB[(j * step) % VOCAB.length], gamma));
}

export type Detection = { T: number; G: number; z: number; p: number; greens: boolean[] };

export function detect(tokens: string[], key: string, gamma: number): Detection {
  const greens = tokens.map((tok, i) => (i === 0 ? false : isGreen(key, tokens[i - 1], tok, gamma)));
  const T = Math.max(0, tokens.length - 1);
  const G = greens.filter(Boolean).length;
  const z = zScore(G, T, gamma);
  return { T, G, z, p: pValue(z), greens };
}
