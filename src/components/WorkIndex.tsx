"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { lensLabels, projects, type Lens } from "@/content/projects";
import ProjectGlyph from "./ProjectGlyph";

const filters: ("all" | Lens)[] = ["all", "product", "engineering", "program"];

export default function WorkIndex() {
  const [lens, setLens] = useState<"all" | Lens>("all");

  const visible = useMemo(() => {
    if (lens === "all") return projects;
    const matching = projects.filter((p) => p.lenses.includes(lens));
    return matching.sort((a, b) => a.lenses.indexOf(lens) - b.lenses.indexOf(lens));
  }, [lens]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter work by discipline">
        <span className="label muted mr-2">Read as</span>
        {filters.map((f) => (
          <button key={f} type="button" className="pill" aria-pressed={lens === f} onClick={() => setLens(f)}>
            <span>{f === "all" ? "Everything" : lensLabels[f]}</span>
          </button>
        ))}
      </div>

      <ol className="list-none p-0 m-0">
        {visible.map((p, i) => (
          <li key={p.slug}>
            <Link href={`/work/${p.slug}/`} className="work-row group">
              <span className="label muted pt-2">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="label muted mb-2">
                  {p.org} · {p.period}
                </div>
                <h3 className="work-title display-m">{p.title}</h3>
                <p className="mt-3 max-w-[70ch] text-[0.98rem] muted">{p.outcome}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.lenses.map((l) => (
                    <span key={l} className="chip">
                      {lensLabels[l]}
                    </span>
                  ))}
                  {p.demo ? <span className="chip" style={{ color: "var(--color-signal-ink)", borderColor: "currentColor" }}>Live demo</span> : null}
                </div>
              </div>
              <div className="work-glyph">
                <div className="porthole text-ink transition-transform duration-500 group-hover:scale-[1.04]">
                  <ProjectGlyph slug={p.slug} className="absolute inset-0 m-auto h-[74%] w-[74%]" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
