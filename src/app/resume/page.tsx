import type { Metadata } from "next";
import PrintButton from "@/components/PrintButton";
import { education } from "@/content/experience";
import { profile } from "@/content/profile";

export const metadata: Metadata = {
  title: "Résumé",
  description: `Résumé of ${profile.name}: product, software and technical program management experience.`,
  alternates: { canonical: "/resume/" },
};

const roles = [
  {
    org: "SpaceX",
    role: "Starlink Engineering Intern, Operations Engineering",
    meta: "Bastrop, TX · Jul 2026 – present",
    bullets: ["Manufacturing data analysis on the Starlink production line."],
  },
  {
    org: "Microsoft",
    role: "Technical Program Management Intern, Cloud Operations + Innovation",
    meta: "Redmond, WA · May – Jul 2026",
    bullets: [
      "Rebuilt a quarterly invoice-audit pipeline from a developer-only Python notebook into a client-side browser tool, validated every output tab against the reference workbook, and reconciled totals to the cent. Review went from 276 line-by-line edits to about 80 PO-level decisions.",
      "Diagnosed why Power BI PDF exports ignored project selections, then built a Node.js and Playwright exporter that captures live report state, replacing seven visuals that couldn't be exported.",
      "Built and tested Copilot Studio agents grounded in SharePoint documents, cutting an oversized instruction set from 19,437 to 7,725 characters to fix a retrieval failure. Also built agents for branded decks and Power BI report builds.",
    ],
  },
  {
    org: "JPMorgan Chase",
    role: "Summer Analyst, Advancing Black Pathways Fellowship (Innovation Development Program)",
    meta: "Plano, TX · Summer 2025",
    bullets: ["Ran a full product discovery playbook on employee mentorship: interviews, persona, competitive analysis, OKRs, concept, risk review, pitch and roadmap."],
  },
  {
    org: "U.S. Department of Health and Human Services (SAMHSA)",
    role: "Office of Financial Resources Intern",
    meta: "Remote · 2024 – 2025",
    bullets: ["Prepared budget justifications and Budget Data Requests, maintained reporting data and supported the office's annual awards ceremony."],
  },
  {
    org: "NASA Johnson Space Center",
    role: "Electrical Engineering Intern, Joint Station LAN Integration Laboratory",
    meta: "Houston, TX · Jun – Aug 2023",
    bullets: [
      "Wrote a Python log parser and built per-device connection timelines to investigate why crew tablets dropped Wi-Fi, then ran a multi-day lab test series that isolated device-side causes.",
    ],
  },
  {
    org: "Southwest Airlines",
    role: "Ground Operations Intern",
    meta: "Houston, TX · Summer 2022",
    bullets: ["Supported airport operations and helped design realistic job-preview material for three frontline roles."],
  },
  {
    org: "BetterBuilt",
    role: "Co-founder",
    meta: "Houston, TX · 2020 – 2023",
    bullets: ["Co-founded a PC-build consulting business with my brother and built a Python and SQLite parts matcher to automate recommendations."],
  },
];

const projects = [
  "NASA HUNCH, national finalist (Destiny Module category, 2021–22): led the design of a separable exhibit module in Autodesk Inventor",
  "LLM watermarking research (LSAMP, 2025): hard vs. soft green-list biasing and z-score detection",
  "ForwardNotes, 2nd place at the Product@TAMU Ideathon (2024): led a four-person team on an AI journaling concept",
  "Drag Dynamics (Ignite Design Challenge, 2024): rocket descent simulation with a 4.43 m/s touchdown, scored 298/300",
];

const skills = [
  "Product discovery, user interviews, OKRs, roadmaps",
  "Python, JavaScript/TypeScript, SQL, Node.js, Playwright",
  "Power BI (Power Query, DAX, PBIP), Excel, Copilot Studio",
  "Figma, Lucid, Autodesk Inventor, SolidWorks, MATLAB",
];

export default function ResumePage() {
  return (
    <main id="main" className="content-over pt-16">
      <div className="wrap print-tight max-w-[900px] py-14">
        <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-4">
          <p className="label muted m-0">Résumé · generated from the same facts as this site</p>
          <PrintButton />
        </div>
        <header className="border-b border-line pb-6">
          <h1 className="display-m">{profile.name}</h1>
          <p className="mt-2 muted">
            {profile.location} · <a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={profile.linkedin}>linkedin.com/in/muhammad-wadiwala</a> ·{" "}
            <a href="https://wadiwala.net">wadiwala.net</a>
          </p>
        </header>

        <section className="border-b border-line py-6">
          <h2 className="label muted mb-3">Education</h2>
          {education.map((e) => (
            <div key={e.org} className="flex flex-wrap justify-between gap-x-6">
              <p className="m-0">
                <span className="font-medium">{e.org}</span> · {e.detail}
              </p>
              <p className="m-0 muted">{e.period}</p>
            </div>
          ))}
        </section>

        <section className="border-b border-line py-6">
          <h2 className="label muted mb-4">Experience</h2>
          <div className="space-y-5">
            {roles.map((r) => (
              <div key={r.org}>
                <div className="flex flex-wrap justify-between gap-x-6">
                  <p className="m-0">
                    <span className="font-medium">{r.org}</span> · {r.role}
                  </p>
                  <p className="m-0 muted text-sm">{r.meta}</p>
                </div>
                <ul className="prose-mw mt-2 mb-0 text-[0.95rem]">
                  {r.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-line py-6">
          <h2 className="label muted mb-3">Projects and research</h2>
          <ul className="prose-mw m-0 text-[0.95rem]">
            {projects.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <section className="border-b border-line py-6">
          <h2 className="label muted mb-3">Leadership</h2>
          <ul className="prose-mw m-0 text-[0.95rem]">
            <li>Product@TAMU officer: logistics, then Ideathon lead for the club&apos;s product design competition</li>
            <li>ColorStack at Texas A&amp;M, outreach chair</li>
            <li>Accenture Student Leadership Program fellow; P&amp;G Standout Emerging Leaders</li>
          </ul>
        </section>

        <section className="py-6">
          <h2 className="label muted mb-3">Skills</h2>
          <ul className="prose-mw m-0 text-[0.95rem]">
            {skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
