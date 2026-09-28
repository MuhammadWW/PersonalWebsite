import Image from "next/image";
import Link from "next/link";
import { about, profile } from "@/content/profile";
import { education, experience, recognition } from "@/content/experience";
import { projects } from "@/content/projects";
import { withBase } from "@/lib/site";
import ProjectGlyph from "./ProjectGlyph";
import WorkIndex from "./WorkIndex";

function SectionHead({ index, label, title, children }: { index: string; label: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
      <div className="md:col-span-7">
        <p className="label muted mb-5">
          {index} — {label}
        </p>
        <h2 className="display-l">{title}</h2>
      </div>
      {children ? <div className="md:col-span-5 lead muted">{children}</div> : null}
    </div>
  );
}

export function WorkSection() {
  return (
    <section id="work" className="section wrap scroll-mt-16">
      <SectionHead index="01" label="Work" title="Selected work">
        Case studies from internships, research and things I started myself. Each one says what I did, what the team
        did, and which parts are demos I rebuilt for this site.
      </SectionHead>
      <WorkIndex />
    </section>
  );
}

export function LabSection() {
  const demos = projects.filter((p) => p.demo);
  return (
    <section id="lab" className="bg-ink text-paper scroll-mt-16">
      <div className="section wrap">
        <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="label mb-5 opacity-70">02 — Lab</p>
            <h2 className="display-l">Try the ideas yourself</h2>
          </div>
          <p className="lead md:col-span-5 opacity-75">
            Small working versions of the problems behind each case study, rebuilt from scratch with synthetic data so
            you can poke at them. Nothing here is a copy of an employer&apos;s system.
          </p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((p) => (
            <Link key={p.slug} href={`/work/${p.slug}/#demo`} className="group flex flex-col gap-5 bg-ink p-6 no-underline transition-colors hover:bg-ink-2 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="h-16 w-16 shrink-0 rounded-full border border-white/15 p-2 text-paper">
                  <ProjectGlyph slug={p.slug} className="h-full w-full" />
                </div>
                <span className="label opacity-60">{p.short}</span>
              </div>
              <div>
                <h3 className="text-xl font-medium leading-snug">{p.demo!.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed opacity-70">{p.demo!.blurb}</p>
              </div>
              <span className="label mt-auto opacity-80 transition-transform group-hover:translate-x-1">Open demo →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" className="section wrap scroll-mt-16">
      <SectionHead index="03" label="Experience" title="Where I've worked">
        Internships from high school onward, plus the business I started with my brother.
      </SectionHead>
      <ol className="m-0 list-none p-0">
        {experience.map((e) => (
          <li key={e.org + e.period} className="grid gap-3 border-t border-line py-7 md:grid-cols-12 md:gap-6">
            <div className="label muted md:col-span-2 md:pt-1">{e.period}</div>
            <div className="md:col-span-4">
              <h3 className="text-xl font-medium leading-snug">{e.org}</h3>
              <p className="muted text-[0.95rem]">{e.role}</p>
              {e.team ? <p className="label muted mt-2">{e.team}</p> : null}
            </div>
            <div className="md:col-span-6">
              <p className="max-w-[60ch]">{e.note}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="label muted">{e.place}</span>
                {e.caseStudies?.map((slug) => {
                  const p = projects.find((x) => x.slug === slug);
                  return p ? (
                    <Link key={slug} href={`/work/${slug}/`} className="label text-signal-ink underline-offset-4 hover:underline">
                      {p.short} →
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-16 grid gap-10 border-t border-line pt-10 md:grid-cols-2">
        <div>
          <p className="label muted mb-5">Education</p>
          <ul className="m-0 list-none space-y-4 p-0">
            {education.map((ed) => (
              <li key={ed.org}>
                <p className="font-medium">{ed.org}</p>
                <p className="muted text-[0.95rem]">
                  {ed.detail} · {ed.period}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label muted mb-5">Recognition</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {recognition.map((r) => (
              <li key={r} className="text-[0.98rem]">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="border-t border-line bg-paper-2 scroll-mt-16">
      <div className="section wrap grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="label muted mb-5">04 — About</p>
          <div className="relative aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-[999px_999px_14px_14px] border border-line">
            <Image
              src={withBase("/images/muhammad-wadiwala.jpg")}
              alt="Portrait of Muhammad Wadiwala"
              fill
              sizes="(min-width: 768px) 380px, 90vw"
              className="object-cover grayscale-[15%]"
            />
          </div>
        </div>
        <div className="md:col-span-7">
          <h2 className="display-l mb-10">Hi, I&apos;m Muhammad.</h2>
          <div className="prose-mw lead">
            {about.paragraphs.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
          <dl className="mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {about.facts.map((f) => (
              <div key={f.label} className="border-t border-line pt-3">
                <dt className="label muted">{f.label}</dt>
                <dd className="m-0 mt-1">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" className="bg-ink text-paper scroll-mt-16">
      <div className="section wrap">
        <p className="label mb-6 opacity-70">05 — Contact</p>
        <h2 className="display-xl max-w-[12ch]">Let&apos;s build something that works.</h2>
        <p className="lead mt-8 max-w-[52ch] opacity-75">
          I&apos;m looking for product management, software engineering and technical program management roles. The
          fastest way to reach me is email.
        </p>
        <div className="mt-12 flex flex-wrap gap-3">
          <a href={`mailto:${profile.email}`} className="pill" style={{ fontSize: "0.85rem" }}>
            <span>{profile.email}</span>
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer" className="pill">
            <span>LinkedIn</span>
          </a>
          <a href={profile.github} target="_blank" rel="noreferrer" className="pill">
            <span>GitHub</span>
          </a>
          <Link href="/resume/" className="pill">
            <span>Résumé</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
