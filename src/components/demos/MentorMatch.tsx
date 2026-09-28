"use client";

import { useMemo, useState } from "react";
import DemoFrame from "./DemoFrame";

const GOALS = ["Break into product", "Technical skills", "Leadership", "Navigating the firm", "Visibility"];
const INTERESTS = ["AI", "Design", "Markets", "Community", "Sports", "Music"];
const ROLES = [
  { id: "intern", label: "Intern", level: 0 },
  { id: "analyst", label: "Analyst / fellow", level: 1 },
  { id: "associate", label: "Associate", level: 2 },
];

type Mentor = { name: string; title: string; level: number; goals: string[]; interests: string[]; style: number };

const MENTORS: Mentor[] = [
  { name: "Dana R.", title: "Vice President, Product", level: 3, goals: ["Break into product", "Leadership"], interests: ["Design", "Music"], style: 0.3 },
  { name: "Marcus T.", title: "Software Engineer III", level: 2, goals: ["Technical skills"], interests: ["AI", "Sports"], style: 0.7 },
  { name: "Priya S.", title: "Associate, Markets", level: 2, goals: ["Visibility", "Navigating the firm"], interests: ["Markets", "Community"], style: 0.5 },
  { name: "Jordan K.", title: "Executive Director, Technology", level: 4, goals: ["Leadership", "Navigating the firm"], interests: ["AI", "Community"], style: 0.4 },
  { name: "Elena V.", title: "Product Manager", level: 3, goals: ["Break into product", "Technical skills"], interests: ["Design", "AI"], style: 0.6 },
  { name: "Sam O.", title: "Data Scientist", level: 3, goals: ["Technical skills", "Break into product"], interests: ["AI", "Sports"], style: 0.8 },
  { name: "Aisha M.", title: "Associate, Operations", level: 2, goals: ["Navigating the firm", "Leadership"], interests: ["Community", "Music"], style: 0.35 },
  { name: "Chris L.", title: "Director, Risk", level: 4, goals: ["Visibility", "Leadership"], interests: ["Markets", "Sports"], style: 0.25 },
];

type Tool = { name: string; desc: string; tags: string[] };

const TOOLS: Tool[] = [
  { name: "go/learn", desc: "Training catalog and course enrollment", tags: ["training", "courses", "skills", "certification"] },
  { name: "go/pto", desc: "Request time off and see your balance", tags: ["vacation", "leave", "holiday", "time off"] },
  { name: "go/expense", desc: "Submit and track expense reports", tags: ["reimbursement", "travel", "receipts"] },
  { name: "go/mentor", desc: "Mentorship program sign-up and resources", tags: ["mentoring", "career", "coaching"] },
  { name: "go/ask-it", desc: "IT help desk tickets and chat", tags: ["laptop", "password", "support", "help"] },
  { name: "go/datahub", desc: "Find internal datasets and owners", tags: ["data", "tables", "analytics"] },
  { name: "go/sql", desc: "Query editor for approved data sources", tags: ["query", "database", "analytics"] },
  { name: "go/brand", desc: "Logos, templates and slide decks", tags: ["powerpoint", "templates", "design"] },
  { name: "go/benefits", desc: "Health, retirement and wellness benefits", tags: ["insurance", "401k", "wellness"] },
  { name: "go/org", desc: "Org chart and team directory", tags: ["people", "directory", "manager", "team"] },
  { name: "go/mobility", desc: "Internal job postings and transfers", tags: ["jobs", "career", "promotion", "transfer"] },
  { name: "go/erg", desc: "Employee resource groups and events", tags: ["community", "events", "network"] },
  { name: "go/onboard", desc: "New-joiner checklist and first-week guide", tags: ["new hire", "onboarding", "start"] },
  { name: "go/feedback", desc: "Request and give structured feedback", tags: ["review", "performance", "growth"] },
  { name: "go/book", desc: "Reserve desks and meeting rooms", tags: ["room", "desk", "office", "reservation"] },
  { name: "go/travel", desc: "Book business travel within policy", tags: ["flights", "hotel", "trip"] },
  { name: "go/policy", desc: "Firm policies and code of conduct", tags: ["rules", "compliance", "conduct"] },
  { name: "go/ai-assist", desc: "Approved AI assistant for drafting and summaries", tags: ["ai", "llm", "writing", "summarize"] },
];

const SYNONYMS: Record<string, string[]> = {
  vacation: ["pto", "time off", "leave"],
  reimburse: ["expense", "reimbursement"],
  learn: ["training", "courses"],
  class: ["training", "courses"],
  mentor: ["mentoring", "coaching"],
  laptop: ["it", "support"],
  broken: ["support", "help"],
  job: ["jobs", "mobility", "transfer"],
  data: ["datasets", "analytics"],
  slides: ["powerpoint", "templates"],
  deck: ["powerpoint", "templates"],
  boss: ["manager", "org"],
  new: ["new hire", "onboarding"],
  chatgpt: ["ai", "llm"],
};

function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const inter = b.filter((x) => A.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}

function search(query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  const expanded = new Set(words);
  words.forEach((w) => SYNONYMS[w]?.forEach((s) => expanded.add(s)));
  return TOOLS.map((t) => {
    const why: string[] = [];
    let score = 0;
    for (const w of expanded) {
      if (t.name.includes(w)) {
        score += 3;
        why.push(`name has “${w}”`);
      } else if (t.tags.some((tag) => tag.includes(w))) {
        score += 2;
        why.push(`tagged “${t.tags.find((tag) => tag.includes(w))}”`);
      } else if (t.desc.toLowerCase().includes(w)) {
        score += 1;
        why.push(`description mentions “${w}”`);
      }
    }
    return { tool: t, score, why };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export default function MentorMatch() {
  const [role, setRole] = useState("analyst");
  const [goals, setGoals] = useState<string[]>(["Break into product", "Navigating the firm"]);
  const [interests, setInterests] = useState<string[]>(["AI", "Community"]);
  const [style, setStyle] = useState(0.5);
  const [matched, setMatched] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [query, setQuery] = useState("I need to take vacation next month");

  const myLevel = ROLES.find((r) => r.id === role)!.level;

  const ranked = useMemo(
    () =>
      MENTORS.map((m) => {
        const gap = m.level - myLevel;
        const parts = {
          goals: jaccard(goals, m.goals),
          interests: jaccard(interests, m.interests),
          style: 1 - Math.abs(style - m.style),
          seniority: gap >= 1 && gap <= 3 ? 1 : gap > 3 ? 0.5 : 0,
        };
        const score = 0.45 * parts.goals + 0.2 * parts.interests + 0.2 * parts.style + 0.15 * parts.seniority;
        return { m, score, parts };
      }).sort((a, b) => b.score - a.score),
    [goals, interests, style, myLevel],
  );

  const queue = ranked.filter((r) => !matched.includes(r.m.name) && !skipped.includes(r.m.name));
  const current = queue[0];
  const full = matched.length >= 3;
  const results = useMemo(() => search(query), [query]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <DemoFrame title="Mentor matching + resource search" note="Fictional people and tools · independent reconstruction">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-5">
          <label className="field">
            <span>Your role</span>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="label muted mb-2">What you want from a mentor</legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button key={g} type="button" className="pill" aria-pressed={goals.includes(g)} onClick={() => toggle(goals, setGoals, g)}>
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label muted mb-2">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((g) => (
                <button key={g} type="button" className="pill" aria-pressed={interests.includes(g)} onClick={() => toggle(interests, setInterests, g)}>
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Working style · {style < 0.4 ? "structured" : style > 0.6 ? "flexible" : "balanced"}</span>
            <input type="range" min={0} max={1} step={0.05} value={style} onChange={(e) => setStyle(Number(e.target.value))} />
          </label>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="label muted m-0">Best next match</p>
            <p className="label muted m-0">Your mentors · {matched.length} of 3</p>
          </div>
          {full ? (
            <div className="rounded-lg border border-line bg-white p-6">
              <p className="font-medium">You&apos;re at three mentors.</p>
              <p className="muted text-sm">The cap is intentional: three relationships you actually keep beat ten you don&apos;t.</p>
            </div>
          ) : current ? (
            <div className="rounded-lg border border-line bg-white p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xl font-medium">{current.m.name}</p>
                  <p className="muted text-sm">{current.m.title}</p>
                </div>
                <p className="text-3xl font-light tabular-nums">{Math.round(current.score * 100)}%</p>
              </div>
              <div className="mt-5 grid gap-2 text-sm">
                {(
                  [
                    ["Shared goals", current.parts.goals, 45],
                    ["Shared interests", current.parts.interests, 20],
                    ["Working style", current.parts.style, 20],
                    ["Seniority fit", current.parts.seniority, 15],
                  ] as const
                ).map(([label, v, w]) => (
                  <div key={label} className="grid grid-cols-[130px_1fr_40px] items-center gap-3">
                    <span className="muted">
                      {label} <span className="label">{w}%</span>
                    </span>
                    <div className="h-1.5 rounded-full bg-paper-2">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${v * 100}%` }} />
                    </div>
                    <span className="num tabular-nums">{Math.round(v * 100)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <button type="button" className="btn" onClick={() => setSkipped((s) => [...s, current.m.name])}>
                  Skip
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setMatched((s) => [...s, current.m.name])}>
                  Request to connect
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-white p-6">
              <p className="m-0">You&apos;ve seen everyone.</p>
              <button type="button" className="btn btn-sm mt-3" onClick={() => setSkipped([])}>
                Show skipped mentors again
              </button>
            </div>
          )}
          {matched.length ? <p className="mt-3 text-sm muted">Requested: {matched.join(", ")}</p> : null}

          <div className="mt-10">
            <label className="field">
              <span>Search internal resources in plain English</span>
              <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {results.length === 0 ? <li className="text-sm muted">No matches. Try “laptop broken”, “new here” or “slides template”.</li> : null}
              {results.map((r) => (
                <li key={r.tool.name} className="rounded-md border border-line bg-white px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="mono font-medium">{r.tool.name}</span>
                    <span className="label muted">score {r.score}</span>
                  </div>
                  <p className="m-0 text-sm">{r.tool.desc}</p>
                  <p className="m-0 mt-1 text-xs muted">Matched because: {r.why.slice(0, 3).join(", ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
