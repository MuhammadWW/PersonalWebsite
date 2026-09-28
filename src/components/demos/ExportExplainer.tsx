"use client";

import { useEffect, useState } from "react";
import DemoFrame from "./DemoFrame";

const CAMPUSES: Record<string, string[]> = {
  "Campus North": ["North Substation", "North Hall 2", "North Cooling Plant"],
  "Campus River": ["River Hall 1", "River Admin Block", "River Fiber Loop"],
};

const DEFAULT = { campus: "Campus North", project: "North Substation" };

type Method = "filter" | "state";

const STEPS: Record<Method, string[]> = {
  filter: ["Build export request", "Attach filter parameter", "Service renders report", "Slicers keep saved default", "PDF downloaded"],
  state: ["Open report headlessly", "Set the real slicers", "Capture live bookmark state", "Export that exact state", "PDF downloaded"],
};

export default function ExportExplainer() {
  const [campus, setCampus] = useState("Campus River");
  const [project, setProject] = useState("River Hall 1");
  const [method, setMethod] = useState<Method | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!method) return;
    const id = window.setInterval(() => setTick((t) => (t >= 5 ? t : t + 1)), 420);
    return () => window.clearInterval(id);
  }, [method]);

  const run = (next: Method) => {
    setTick(0);
    setMethod(next);
  };

  const done = method !== null && tick >= 5;
  const printed = method === "state" ? { campus, project } : DEFAULT;
  const correct = printed.project === project;

  const payload =
    method === "filter"
      ? `{
  "format": "PDF",
  "powerBIReportConfiguration": {
    "reportLevelFilters": [
      { "filter": "Projects/Name eq '${project}'" }
    ]
  }
}`
      : `{
  "format": "PDF",
  "powerBIReportConfiguration": {
    "defaultBookmark": {
      "state": "H4sIAAAAAAAACs2W…(captured after slicers = ${project})"
    }
  }
}`;

  return (
    <DemoFrame title="Filters vs. captured state" note="Fictional report · built for this portfolio">
      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <label className="field">
            <span>Campus</span>
            <select
              className="select"
              value={campus}
              onChange={(e) => {
                setCampus(e.target.value);
                setProject(CAMPUSES[e.target.value][0]);
                setMethod(null);
              }}
            >
              {Object.keys(CAMPUSES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Project</span>
            <select
              className="select"
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setMethod(null);
              }}
            >
              {CAMPUSES[campus].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-2">
            <button type="button" className="btn" aria-pressed={method === "filter"} onClick={() => run("filter")}>
              Export with a filter parameter
            </button>
            <button type="button" className="btn btn-primary" aria-pressed={method === "state"} onClick={() => run("state")}>
              Export with captured state
            </button>
          </div>
          <p className="text-sm muted">
            In this fictional report, as in the real one, each page is driven by slicers. A filter parameter is accepted without error, but it doesn&apos;t
            move the slicers, so the pages keep their saved default selection.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="label muted mb-3">Pipeline</p>
            <ol className="m-0 list-none space-y-2 p-0">
              {(method ? STEPS[method] : STEPS.state).map((s, i) => {
                const active = method !== null && tick > i;
                const warn = method === "filter" && i === 3;
                return (
                  <li
                    key={s}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors"
                    style={{
                      borderColor: active ? (warn ? "var(--color-stop)" : "var(--color-ink)") : "var(--color-line)",
                      background: active ? (warn ? "rgba(163,58,44,0.06)" : "#fff") : "transparent",
                      opacity: method ? 1 : 0.55,
                    }}
                  >
                    <span className="label w-5 text-center">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                );
              })}
            </ol>
            <p className="label muted mb-2 mt-6">Request body</p>
            <pre className="overflow-auto rounded-md border border-line bg-white p-3 text-[0.72rem] leading-relaxed">{method ? payload : "Pick a method to see the request."}</pre>
          </div>

          <div>
            <p className="label muted mb-3">Exported PDF</p>
            <div className="relative aspect-[8.5/11] rounded-md border border-line bg-white p-5 shadow-sm">
              {!done ? (
                <div className="grid h-full place-items-center text-sm muted">{method ? "Exporting…" : "Nothing exported yet"}</div>
              ) : (
                <div className="flex h-full flex-col">
                  <p className="label muted">Monthly portfolio review</p>
                  <p className="mt-2 text-lg font-medium leading-tight">{printed.project}</p>
                  <p className="text-sm muted">{printed.campus}</p>
                  <div className="mt-4 grid flex-1 grid-cols-2 gap-2">
                    {[62, 38, 80, 45].map((h, i) => (
                      <div key={i} className="flex items-end rounded bg-paper-2 p-2">
                        <div className="w-full rounded-sm" style={{ height: `${h}%`, background: correct ? "var(--color-ink)" : "var(--color-mist)" }} />
                      </div>
                    ))}
                  </div>
                  <p className={`mt-4 text-sm font-medium ${correct ? "tag-ok" : "tag-bad"}`}>
                    {!correct
                      ? `Wrong: you asked for ${project}, got the default view`
                      : method === "filter"
                        ? "Looks right, but only because this happens to be the report's default project"
                        : `Correct: shows ${project}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
