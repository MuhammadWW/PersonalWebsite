"use client";

import { useMemo, useState } from "react";
import DemoFrame from "./DemoFrame";

type Entry = { date: string; text: string };

const ENTRIES: Entry[] = [
  { date: "2031-08-22", text: "First week of classes. Nervous about circuits, excited about the new apartment. I don't know anyone in my lab section yet." },
  { date: "2031-09-03", text: "Stayed up too late finishing the problem set. Tired and a little overwhelmed, but I asked for help in office hours and it clicked." },
  { date: "2031-09-15", text: "Joined the product club. Grateful that two people from lab came with me. Worried I'm spreading myself thin." },
  { date: "2031-09-29", text: "Exam week. Stress everywhere. I keep comparing myself to people who seem to have it figured out." },
  { date: "2031-10-08", text: "Got the exam back. Better than I expected. Proud of how I prepared, even if it was chaotic." },
  { date: "2031-10-20", text: "Rejected from an internship I really wanted. Disappointed. Went for a long walk and called my brother." },
  { date: "2031-10-31", text: "Fun night with friends. Relaxed for the first time in weeks. Thankful for people who make me laugh." },
  { date: "2031-11-12", text: "Deadline pileup again. Anxious, but I made a plan and crossed off three things before noon." },
  { date: "2031-11-24", text: "Home for the break. Calm. Grateful for my family and for sleeping more than five hours." },
  { date: "2031-12-02", text: "Presented our project. Nervous before, excited after. The team actually worked well together." },
];

const TODAY: Entry = {
  date: "2031-12-10",
  text: "Finals soon, but I feel steadier than in September. I know how to ask for help now, and I'm less worried about keeping up with everyone else.",
};

const LEXICON: Record<string, string[]> = {
  stress: ["stress", "overwhelmed", "deadline", "pileup", "exam", "tired", "chaotic", "thin"],
  anxiety: ["nervous", "worried", "anxious", "comparing"],
  gratitude: ["grateful", "thankful"],
  joy: ["excited", "proud", "fun", "laugh", "better"],
  calm: ["calm", "relaxed", "steadier", "sleeping"],
  sadness: ["rejected", "disappointed"],
};

const POSITIVE = new Set(["gratitude", "joy", "calm"]);

function analyze(text: string) {
  const words = text.toLowerCase().split(/[^a-z]+/);
  const tags: { tag: string; words: string[] }[] = [];
  for (const [tag, list] of Object.entries(LEXICON)) {
    const hits = words.filter((w) => list.includes(w));
    if (hits.length) tags.push({ tag, words: Array.from(new Set(hits)) });
  }
  const score = tags.reduce((s, t) => s + (POSITIVE.has(t.tag) ? 1 : -1) * t.words.length, 0);
  return { tags, score };
}

function daysBetween(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 86400000;
}

function fmt(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function ReflectionDemo() {
  const [monthsBack, setMonthsBack] = useState(2);
  const [draft, setDraft] = useState(TODAY.text);

  const past = useMemo(() => {
    const target = monthsBack * 30;
    return ENTRIES.reduce((best, e) => (Math.abs(daysBetween(e.date, TODAY.date) - target) < Math.abs(daysBetween(best.date, TODAY.date) - target) ? e : best), ENTRIES[0]);
  }, [monthsBack]);

  const pastA = analyze(past.text);
  const todayA = analyze(draft);
  const series = [...ENTRIES, { ...TODAY, text: draft }].map((e) => ({ date: e.date, score: analyze(e.text).score }));
  const minS = Math.min(...series.map((s) => s.score), -2);
  const maxS = Math.max(...series.map((s) => s.score), 2);
  const px = (i: number) => 20 + (i / (series.length - 1)) * 560;
  const py = (s: number) => 90 - ((s - minS) / (maxS - minS || 1)) * 70;

  return (
    <DemoFrame title="ForwardNotes reflection cycle" note="Fictional journal · nothing is saved">
      <label className="field max-w-md">
        <span>Look back · {monthsBack} month{monthsBack > 1 ? "s" : ""}</span>
        <input type="range" min={1} max={4} step={1} value={monthsBack} onChange={(e) => setMonthsBack(Number(e.target.value))} />
      </label>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-line bg-paper-2 p-5">
          <p className="label muted">{fmt(past.date)} · resurfaced</p>
          <p className="mt-3 text-[1.02rem] leading-relaxed">{past.text}</p>
          <Tags tags={pastA.tags} />
        </article>
        <article className="rounded-lg border border-ink bg-white p-5">
          <p className="label muted">{fmt(TODAY.date)} · today</p>
          <textarea className="input mt-3 min-h-[110px] border-0 p-0 text-[1.02rem] leading-relaxed focus:outline-none" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Today's entry" />
          <Tags tags={todayA.tags} />
        </article>
      </div>
      <p className="mt-5 text-lg">
        <span className="label muted mr-2">Prompt</span>
        What&apos;s changed since {fmt(past.date)}?{" "}
        {todayA.score > pastA.score ? "Your words today lean steadier than they did then." : todayA.score < pastA.score ? "Today reads heavier than that entry. Anything you want to name?" : "The tone is similar. Notice anything different underneath?"}
      </p>

      <div className="mt-8">
        <p className="label muted mb-2">Tone over the semester (word-list score, not a diagnosis)</p>
        <svg viewBox="0 0 600 110" className="w-full rounded-lg border border-line bg-white" role="img" aria-label="Tone trend line">
          <line x1={20} x2={580} y1={py(0)} y2={py(0)} stroke="#e4e0d8" />
          <polyline fill="none" stroke="#0d1014" strokeWidth={1.5} points={series.map((s, i) => `${px(i)},${py(s.score)}`).join(" ")} />
          {series.map((s, i) => (
            <circle key={s.date} cx={px(i)} cy={py(s.score)} r={s.date === past.date || i === series.length - 1 ? 4.5 : 2.5} fill={s.date === past.date ? "#c44b22" : "#0d1014"}>
              <title>{`${fmt(s.date)}: ${s.score}`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <p className="mt-4 text-sm muted">
        Tags come from a small, visible word list, so you can always see why an entry got a label. A real product would need consent, local-first storage and
        far more care than this sketch.
      </p>
    </DemoFrame>
  );
}

function Tags({ tags }: { tags: { tag: string; words: string[] }[] }) {
  if (!tags.length) return <p className="mt-3 text-xs muted">No tags</p>;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t.tag} className="chip" title={`matched: ${t.words.join(", ")}`}>
          {t.tag} · {t.words.join(", ")}
        </span>
      ))}
    </div>
  );
}
