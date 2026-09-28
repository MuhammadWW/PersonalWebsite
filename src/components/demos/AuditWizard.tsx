"use client";

import { useMemo, useState } from "react";
import { sum } from "@/lib/std/array";
import DemoFrame from "./DemoFrame";
import {
  EXCLUDED_PRIMES,
  LOW_VALUE_CENTS,
  applyValueRules,
  classify,
  generateQuarter,
  money,
  toCsv,
  type Classified,
  type Decision,
} from "./auditData";

const STEPS = ["Load", "Totals", "Classify", "Review", "QC", "Value rules", "Population", "Reconcile", "Download"];
const LIKELY_IN_SCOPE = ["Construction", "Electrical", "Mechanical", "Civil", "Controls"];

export default function AuditWizard() {
  const [seed, setSeed] = useState(2026);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [qc, setQc] = useState<Record<string, Decision>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const quarter = useMemo(() => generateQuarter(seed), [seed]);
  const clean = useMemo(() => quarter.lines.filter((l) => !l.junk), [quarter]);
  const junk = useMemo(() => quarter.lines.filter((l) => l.junk), [quarter]);
  const classified = useMemo(() => classify(clean, quarter.prior), [clean, quarter.prior]);

  const pendingGroups = useMemo(() => {
    const map = new Map<string, { po: string; vendor: string; prime: string; campus: string; count: number; cents: number }>();
    for (const l of classified) {
      if (l.decision !== "pending") continue;
      const g = map.get(l.po) ?? { po: l.po, vendor: l.vendor, prime: l.prime, campus: l.campus, count: 0, cents: 0 };
      g.count += 1;
      g.cents += l.cents;
      map.set(l.po, g);
    }
    return Array.from(map.values()).sort((a, b) => b.cents - a.cents);
  }, [classified]);

  const pendingLineCount = sum(pendingGroups, (g) => g.count);
  const decidedCount = pendingGroups.filter((g) => decisions[g.po]).length;

  const afterReview: Classified[] = useMemo(
    () => classified.map((l) => (l.decision === "pending" ? { ...l, decision: decisions[l.po] ?? "pending" } : l)),
    [classified, decisions],
  );

  const conflicts = useMemo(() => {
    const byPo = new Map<string, Classified[]>();
    for (const l of afterReview) byPo.set(l.po, [...(byPo.get(l.po) ?? []), l]);
    return Array.from(byPo.entries())
      .filter(([, ls]) => ls.some((l) => l.decision === "include") && ls.some((l) => l.decision === "exclude"))
      .map(([po, ls]) => ({ po, lines: ls }));
  }, [afterReview]);

  const finalLines = useMemo(() => afterReview.map((l) => (qc[l.po] ? { ...l, decision: qc[l.po] } : l)), [afterReview, qc]);
  const buckets = useMemo(() => applyValueRules(finalLines), [finalLines]);

  const totals = {
    sample: sum(buckets.sample, (l) => l.cents),
    gate1: sum(buckets.gate1Excluded, (l) => l.cents),
    rebal: sum(buckets.rebalances, (l) => l.cents),
    credits: sum(buckets.credits, (l) => l.cents),
    low: sum(buckets.lowValue, (l) => l.cents),
  };
  const reconciled = totals.sample + totals.gate1 + totals.rebal + totals.credits + totals.low;
  const diff = quarter.sourceTotalCents - reconciled;

  const canAdvance = step === 3 ? decidedCount === pendingGroups.length : step === 4 ? conflicts.every((c) => qc[c.po]) : step < STEPS.length - 1;

  function go(to: number) {
    setStep(to);
    setMaxStep((m) => Math.max(m, to));
  }

  function reset(newSeed = seed) {
    setSeed(newSeed);
    setDecisions({});
    setQc({});
    setSelected(new Set());
    setQuery("");
    setStep(0);
    setMaxStep(0);
  }

  function decide(pos: string[], d: Decision) {
    setDecisions((prev) => {
      const next = { ...prev };
      pos.forEach((p) => (next[p] = d));
      return next;
    });
    setSelected(new Set());
  }

  function download() {
    const blob = new Blob([toCsv(buckets.sample)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synthetic-sample-population-${seed}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleGroups = pendingGroups.filter((g) => {
    const q = query.trim().toLowerCase();
    return !q || `${g.po} ${g.vendor} ${g.prime} ${g.campus}`.toLowerCase().includes(q);
  });

  return (
    <DemoFrame
      title="Quarterly audit wizard"
      actions={
        <button type="button" className="btn btn-sm" onClick={() => reset((seed * 48271) % 2147483647)}>
          New quarter
        </button>
      }
    >
      <ol className="mb-8 flex list-none flex-wrap gap-2 p-0" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              className="pill"
              aria-pressed={i === step}
              aria-current={i === step ? "step" : undefined}
              disabled={i > maxStep}
              onClick={() => go(i)}
              style={i > maxStep ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
            >
              <span>
                {i + 1}. {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="min-h-[320px]">
        {step === 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="prose-mw">
              <p>
                This quarter is generated from a seed: {quarter.sourceLineCount.toLocaleString()} invoice lines across{" "}
                {new Set(clean.map((l) => l.po)).size} purchase orders from fictional contractors, plus the two non-data rows
                that exports usually include.
              </p>
              <p>The rules match the real process: prior-quarter decisions carry forward, out-of-scope categories are excluded, and people decide the rest.</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 self-start">
              <Stat label="Rows in export" value={quarter.lines.length.toLocaleString()} />
              <Stat label="Source report total" value={money(quarter.sourceTotalCents)} />
              <Stat label="POs with a prior decision" value={quarter.prior.size.toString()} />
              <Stat label="Out-of-scope categories" value={EXCLUDED_PRIMES.join(", ")} small />
            </dl>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <p className="max-w-[70ch]">
              Exports come with rows that aren&apos;t data. Summing them blindly double-counts the population, which is exactly the bug the
              audit team caught in testing. The tool ignores them and says so.
            </p>
            <table className="data-table max-w-2xl">
              <tbody>
                <tr>
                  <td>Rows in the export</td>
                  <td className="num">{quarter.lines.length.toLocaleString()}</td>
                </tr>
                {junk.map((j) => (
                  <tr key={j.id}>
                    <td>
                      Ignored non-data row: <span className="mono">&ldquo;{j.vendor}&rdquo;</span>
                    </td>
                    <td className="num">{money(j.cents)}</td>
                  </tr>
                ))}
                <tr>
                  <td>Naive sum including those rows</td>
                  <td className="num tag-bad">{money(sum(quarter.lines, (l) => l.cents))}</td>
                </tr>
                <tr>
                  <td>Sum of data rows</td>
                  <td className="num">{money(sum(clean, (l) => l.cents))}</td>
                </tr>
                <tr>
                  <td className="font-medium">Matches the source report?</td>
                  <td className="num font-medium tag-ok">{sum(clean, (l) => l.cents) === quarter.sourceTotalCents ? "Yes, to the cent" : "No"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Bucket label="Excluded by category" lines={classified.filter((l) => l.source === "prime")} />
            <Bucket label="Included from last quarter" lines={classified.filter((l) => l.source === "prior" && l.decision === "include")} />
            <Bucket label="Excluded from last quarter" lines={classified.filter((l) => l.source === "prior" && l.decision === "exclude")} />
            <Bucket label="Needs a human" lines={classified.filter((l) => l.decision === "pending")} highlight />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="max-w-[72ch]">
              <span className="font-medium">
                {pendingLineCount} lines, {pendingGroups.length} decisions.
              </span>{" "}
              No purchase order here has lines that should go different ways, so the review happens once per PO instead of once per line.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="field min-w-[220px] flex-1">
                <span>Search</span>
                <input className="input" placeholder="PO, vendor, category, campus" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <button type="button" className="btn" disabled={!selected.size} onClick={() => decide(Array.from(selected), "include")}>
                Include selected
              </button>
              <button type="button" className="btn" disabled={!selected.size} onClick={() => decide(Array.from(selected), "exclude")}>
                Exclude selected
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setDecisions((prev) => {
                    const next = { ...prev };
                    pendingGroups.forEach((g) => {
                      if (!next[g.po]) next[g.po] = LIKELY_IN_SCOPE.includes(g.prime) ? "include" : "exclude";
                    });
                    return next;
                  })
                }
              >
                Suggest the rest
              </button>
            </div>
            <p className="label muted">
              Decided {decidedCount} of {pendingGroups.length}
            </p>
            <div className="max-h-[360px] overflow-auto rounded-lg border border-line">
              <table className="data-table">
                <thead>
                  <tr>
                    <th aria-label="Select" />
                    <th>PO</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th className="num">Lines</th>
                    <th className="num">Amount</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map((g) => (
                    <tr key={g.po}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${g.po}`}
                          checked={selected.has(g.po)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(g.po);
                              else next.delete(g.po);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="mono">{g.po}</td>
                      <td>{g.vendor}</td>
                      <td>{g.prime}</td>
                      <td className="num">{g.count}</td>
                      <td className="num">{money(g.cents)}</td>
                      <td>
                        <div className="flex gap-1">
                          {(["include", "exclude"] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              className="btn btn-sm"
                              aria-pressed={decisions[g.po] === d}
                              style={decisions[g.po] === d ? { background: d === "include" ? "var(--color-go)" : "var(--color-stop)", color: "#fff", borderColor: "transparent" } : undefined}
                              onClick={() => decide([g.po], d)}
                            >
                              {d === "include" ? "Include" : "Exclude"}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {conflicts.length === 0 ? (
              <p className="tag-ok font-medium">No purchase order has lines tagged both include and exclude.</p>
            ) : (
              <>
                <p className="max-w-[72ch]">
                  {conflicts.length === 1 ? "One purchase order has" : `${conflicts.length} purchase orders have`} lines pulling in both directions, usually
                  because a line&apos;s category differs from the rest of its PO. Pick one outcome for the whole PO.
                </p>
                {conflicts.map((c) => (
                  <div key={c.po} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="m-0">
                        <span className="mono">{c.po}</span> · {c.lines[0].vendor}
                      </p>
                      <div className="flex gap-2">
                        {(["include", "exclude"] as const).map((d) => (
                          <button key={d} type="button" className="btn btn-sm" aria-pressed={qc[c.po] === d} onClick={() => setQc((q) => ({ ...q, [c.po]: d }))}
                            style={qc[c.po] === d ? { background: "var(--color-ink)", color: "var(--color-paper)" } : undefined}>
                            Resolve as {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <table className="data-table mt-3">
                      <tbody>
                        {c.lines.map((l) => (
                          <tr key={l.id}>
                            <td className="mono">{l.invoice}</td>
                            <td>{l.prime}</td>
                            <td className={l.decision === "include" ? "tag-ok" : "tag-bad"}>{l.decision}</td>
                            <td className="num">{money(l.cents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Bucket label="Re-balances (matched pairs)" lines={buckets.rebalances} />
            <Bucket label="Credits" lines={buckets.credits} />
            <Bucket label={`Low value (≤ ${money(LOW_VALUE_CENTS).replace(".00", "")})`} lines={buckets.lowValue} />
            <Bucket label="Sample population" lines={buckets.sample} highlight />
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="label muted mb-3">By campus</p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campus</th>
                    <th className="num">Lines</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(buckets.sample.map((l) => l.campus)))
                    .sort()
                    .map((c) => {
                      const ls = buckets.sample.filter((l) => l.campus === c);
                      return (
                        <tr key={c}>
                          <td className="mono">{c}</td>
                          <td className="num">{ls.length}</td>
                          <td className="num">{money(sum(ls, (l) => l.cents))}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div>
              <p className="label muted mb-3">Largest vendors in the population</p>
              <table className="data-table">
                <tbody>
                  {Array.from(new Set(buckets.sample.map((l) => l.vendor)))
                    .map((v) => ({ v, cents: sum(buckets.sample.filter((l) => l.vendor === v), (l) => l.cents) }))
                    .sort((a, b) => b.cents - a.cents)
                    .slice(0, 6)
                    .map((x) => (
                      <tr key={x.v}>
                        <td>{x.v}</td>
                        <td className="num">{money(x.cents)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="max-w-2xl space-y-4">
            <p>Every line has to land in exactly one bucket. If the buckets don&apos;t add back to the source total, something was lost or counted twice.</p>
            <table className="data-table">
              <tbody>
                <Row label="Sample population" cents={totals.sample} />
                <Row label="Excluded by rules and review (gate 1)" cents={totals.gate1} />
                <Row label="Re-balances" cents={totals.rebal} />
                <Row label="Credits" cents={totals.credits} />
                <Row label="Low value" cents={totals.low} />
                <tr>
                  <td className="font-medium">Sum of buckets</td>
                  <td className="num font-medium">{money(reconciled)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Source report total</td>
                  <td className="num font-medium">{money(quarter.sourceTotalCents)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Difference</td>
                  <td className={`num font-medium ${diff === 0 ? "tag-ok" : "tag-bad"}`}>{money(diff)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-sm muted">All arithmetic runs in integer cents, so “to the cent” is literal.</p>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-5">
            <p className="max-w-[70ch]">
              The real tool writes a formatted, multi-tab workbook and stops before the random draw, which the audit team runs live. This version exports the
              sample population as CSV.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={download}>
                Download sample population ({buckets.sample.length} lines)
              </button>
              <button type="button" className="btn" onClick={() => reset((seed * 48271) % 2147483647)}>
                Run a new quarter
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        <button type="button" className="btn" disabled={step === 0} onClick={() => go(step - 1)}>
          Back
        </button>
        <span className="label muted">
          Step {step + 1} of {STEPS.length}
        </span>
        <button type="button" className="btn btn-primary" disabled={!canAdvance || step === STEPS.length - 1} onClick={() => go(step + 1)}>
          {step === 3 && !canAdvance ? `Decide ${pendingGroups.length - decidedCount} more` : step === 4 && !canAdvance ? "Resolve conflicts" : "Next"}
        </button>
      </div>
    </DemoFrame>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="label muted">{label}</dt>
      <dd className={`m-0 mt-1 tabular-nums ${small ? "text-sm" : "text-xl"}`}>{value}</dd>
    </div>
  );
}

function Bucket({ label, lines, highlight }: { label: string; lines: Classified[]; highlight?: boolean }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: highlight ? "var(--color-signal)" : "var(--color-line)", background: "#fff" }}>
      <p className="label muted">{label}</p>
      <p className="mt-2 text-2xl tabular-nums">{lines.length.toLocaleString()}</p>
      <p className="text-sm muted tabular-nums">{money(sum(lines, (l) => l.cents))}</p>
    </div>
  );
}

function Row({ label, cents }: { label: string; cents: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="num">{money(cents)}</td>
    </tr>
  );
}
