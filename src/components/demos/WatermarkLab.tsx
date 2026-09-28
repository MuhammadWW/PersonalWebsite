"use client";

import { useMemo, useState } from "react";
import DemoFrame from "./DemoFrame";
import { attack, detect, generate, perplexity, tokenize } from "./watermark";

type Source = "watermarked" | "plain" | "custom";

function detokenize(tokens: string[]) {
  return tokens.join(" ").replace(/ ([.,!?;:])/g, "$1");
}

export default function WatermarkLab() {
  const [gamma, setGamma] = useState(0.25);
  const [delta, setDelta] = useState(3);
  const [hard, setHard] = useState(false);
  const [length, setLength] = useState(70);
  const [seed, setSeed] = useState(7);
  const [key, setKey] = useState("houston");
  const [source, setSource] = useState<Source>("watermarked");
  const [replacePct, setReplacePct] = useState(0);
  const [deletePct, setDeletePct] = useState(0);
  const [custom, setCustom] = useState("Paste any paragraph here. Text you wrote yourself should land near z = 0, because it knows nothing about the secret green lists.");

  const tokens = useMemo(() => {
    if (source === "custom") return tokenize(custom);
    const base = generate({ length, gamma, delta, hard, watermark: source === "watermarked", seed, key });
    return attack(base, replacePct, deletePct, seed);
  }, [source, custom, length, gamma, delta, hard, seed, key, replacePct, deletePct]);

  const result = useMemo(() => detect(tokens, key, gamma), [tokens, key, gamma]);
  const ppl = useMemo(() => (source === "custom" ? null : perplexity(tokens)), [tokens, source]);

  const verdict = result.z >= 4 ? "Watermark detected" : result.z >= 2 ? "Weak evidence" : "No evidence of a watermark";
  const verdictColor = result.z >= 4 ? "var(--color-go)" : result.z >= 2 ? "var(--color-signal-ink)" : "var(--color-steel)";
  const zPct = Math.max(0, Math.min(100, ((result.z + 2) / 14) * 100));
  const thresholdPct = ((4 + 2) / 14) * 100;

  return (
    <DemoFrame
      title="Watermark lab"
      note="Toy vocabulary · bigram model · not an LLM"
      actions={
        <button type="button" className="btn btn-sm" onClick={() => setSeed((s) => (s * 48271) % 2147483647 || 3)}>
          New sample
        </button>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Text source">
            {(
              [
                ["watermarked", "Watermarked"],
                ["plain", "No watermark"],
                ["custom", "Your own text"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className="pill" aria-pressed={source === id} onClick={() => setSource(id)}>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {source === "custom" ? (
            <textarea
              className="input min-h-[140px] font-mono text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Text to test"
            />
          ) : null}

          <div className="mt-4 rounded-lg border border-line bg-white p-4 leading-[2.1]" aria-live="polite">
            {tokens.map((tok, i) => {
              const green = result.greens[i];
              return (
                <span key={i}>
                  <span
                    className="rounded px-[3px] py-[1px]"
                    style={
                      i === 0
                        ? { color: "var(--color-steel)" }
                        : green
                          ? { background: "rgba(47,111,79,0.16)", boxShadow: "inset 0 -2px 0 var(--color-go)" }
                          : { boxShadow: "inset 0 -1px 0 rgba(163,58,44,0.45)" }
                    }
                    title={i === 0 ? "Seed word" : green ? "Green-list token" : "Red-list token"}
                  >
                    {tok}
                  </span>{" "}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm muted">
            <span>
              <span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: "rgba(47,111,79,0.5)" }} /> green-list word
            </span>
            <span>
              <span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: "rgba(163,58,44,0.35)" }} /> red-list word
            </span>
            <span className="sr-only">{detokenize(tokens)}</span>
          </div>

          {source !== "custom" ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="field">
                <span>Attack: replace words · {replacePct}%</span>
                <input type="range" min={0} max={60} step={5} value={replacePct} onChange={(e) => setReplacePct(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Attack: delete words · {deletePct}%</span>
                <input type="range" min={0} max={50} step={5} value={deletePct} onChange={(e) => setDeletePct(Number(e.target.value))} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5">
            <p className="label muted">z-score</p>
            <p className="mt-1 text-5xl font-light tabular-nums">{result.z.toFixed(2)}</p>
            <p className="mt-2 font-medium" style={{ color: verdictColor }}>
              {verdict}
            </p>
            <div className="relative mt-4 h-2 rounded-full bg-paper-2">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${zPct}%`, background: verdictColor }} />
              <div className="absolute -top-1 h-4 w-px bg-ink" style={{ left: `${thresholdPct}%` }} title="Threshold z = 4" />
            </div>
            <p className="mt-2 text-xs muted">Threshold z = 4 (about 1 false alarm in 30,000 human texts)</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="label muted">Tokens scored</dt>
                <dd className="m-0 tabular-nums">{result.T}</dd>
              </div>
              <div>
                <dt className="label muted">Green</dt>
                <dd className="m-0 tabular-nums">
                  {result.G} <span className="muted">/ exp. {(gamma * result.T).toFixed(1)}</span>
                </dd>
              </div>
              <div>
                <dt className="label muted">p-value</dt>
                <dd className="m-0 tabular-nums">{result.p < 1e-6 ? result.p.toExponential(1) : result.p.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="label muted">Perplexity</dt>
                <dd className="m-0 tabular-nums">{ppl === null ? "—" : ppl.toFixed(1)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <label className="field">
              <span>Green list size γ · {gamma.toFixed(2)}</span>
              <input type="range" min={0.1} max={0.5} step={0.05} value={gamma} onChange={(e) => setGamma(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Bias strength δ · {delta.toFixed(1)}</span>
              <input type="range" min={0} max={8} step={0.5} value={delta} disabled={hard || source === "custom"} onChange={(e) => setDelta(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Length · {length} words</span>
              <input type="range" min={15} max={160} step={5} value={length} disabled={source === "custom"} onChange={(e) => setLength(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} disabled={source === "custom"} />
              Hard watermark (never pick red words)
            </label>
            <label className="field">
              <span>Secret key</span>
              <input className="input" value={key} onChange={(e) => setKey(e.target.value || "key")} />
            </label>
          </div>
        </div>
      </div>
      <p className="mt-8 max-w-[80ch] text-sm muted">
        Try this: raise δ and watch perplexity climb as the text gets stranger. That&apos;s the quality cost. Then turn on
        the attacks and see how many edits it takes to push z under 4. Short texts can&apos;t carry much evidence either
        way.
      </p>
    </DemoFrame>
  );
}
