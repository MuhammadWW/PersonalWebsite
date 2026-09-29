"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { lensLabels, projects, type Lens } from "@/content/projects";

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
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects by discipline">
        {filters.map((f) => (
          <button key={f} type="button" className="fchip" aria-pressed={lens === f} onClick={() => setLens(f)}>
            <Check size={18} aria-hidden />
            {f === "all" ? "All" : lensLabels[f]}
          </button>
        ))}
      </div>

      <ul className="m-0 list-none p-0">
        {visible.map((p) => (
          <li key={p.slug}>
            <Link href={`/work/${p.slug}/`} className="work-row state">
              <div className="min-w-0">
                <p className="label muted">
                  {p.org} · {p.year}
                </p>
                <h4 className="title-l mt-1">{p.title}</h4>
                <p className="muted mt-1 max-w-[72ch] text-[0.95rem]">{p.outcome}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.lenses.map((l) => (
                    <span key={l} className="chip">
                      {lensLabels[l]}
                    </span>
                  ))}
                  {p.demo ? <span className="chip chip-accent">Demo</span> : null}
                </div>
              </div>
              <span className="work-arrow" aria-hidden>
                <ArrowRight size={20} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
