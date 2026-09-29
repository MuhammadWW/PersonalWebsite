import { ArrowUpRight, FileText, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { about, profile } from "@/content/profile";
import { education, experience, recognition } from "@/content/experience";
import { projects } from "@/content/projects";
import { withBase } from "@/lib/site";
import ProjectGlyph from "./ProjectGlyph";
import WorkIndex from "./WorkIndex";
import Carousel, { type CarouselItem } from "./ui/carousel";
import { ContainerScroll } from "./ui/container-scroll-animation";

/** Outline of the Material 3 Expressive 12-sided "cookie" shape, in objectBoundingBox units. */
function cookiePath(lobes = 12, depth = 0.075, samples = 288) {
  const points: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const r = 0.5 * (1 - depth + depth * Math.cos(lobes * t));
    points.push(`${(0.5 + r * Math.cos(t - Math.PI / 2)).toFixed(4)} ${(0.5 + r * Math.sin(t - Math.PI / 2)).toFixed(4)}`);
  }
  return `M${points.join("L")}Z`;
}

function SectionHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 grid gap-5 md:grid-cols-12 md:items-end">
      <h2 className="display-l md:col-span-6">{title}</h2>
      {children ? <p className="lead muted md:col-span-6 md:max-w-[52ch] md:justify-self-end">{children}</p> : null}
    </div>
  );
}

export function WorkSection() {
  const items: CarouselItem[] = projects
    .filter((p) => p.featured)
    .map((p) => ({
      id: p.slug,
      href: `/work/${p.slug}/`,
      title: p.title,
      meta: `${p.org} · ${p.year}`,
      image: p.cover,
      imageAlt: p.demo ? `Screenshot of the ${p.demo.title.toLowerCase()} demo` : undefined,
      fallback: <ProjectGlyph slug={p.slug} className="h-28 w-28" />,
    }));

  return (
    <section id="work" className="section scroll-mt-16">
      <div className="wrap">
        <SectionHead title="Projects">
          Internship work, research and a couple of things I started. Each page says which parts were mine, and the demos use made-up
          data.
        </SectionHead>
      </div>
      <div className="mx-auto w-full max-w-[calc(var(--maxw)-2*var(--page-pad)+32px)] max-sm:px-1 sm:px-[calc(var(--page-pad)-16px)] lg:px-0">
        <Carousel items={items} label="Featured projects" layout="multi-browse" height="clamp(340px, 38vw, 500px)" />
      </div>
      <div className="wrap mt-16">
        <h3 className="title-l mb-5">All projects</h3>
        <WorkIndex />
      </div>
    </section>
  );
}

export function LabSection() {
  const demos = projects.filter((p) => p.demo);
  return (
    <section id="lab" className="scroll-mt-16 overflow-hidden bg-surface-container-low">
      <ContainerScroll
        titleComponent={
          <div className="px-4">
            <h2 className="display-l">Demos</h2>
            <p className="lead muted mx-auto mt-5 max-w-[54ch]">
              Most case studies end with a small working version of the tool, rebuilt with made-up data. This one is the audit wizard from my
              Microsoft internship.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/work/audit-tool/#demo" className="btn btn-primary">
                Open the audit demo
              </Link>
            </div>
          </div>
        }
      >
        <Image
          src={withBase("/images/work/audit-showcase.jpg")}
          alt="The audit wizard demo reviewing made-up invoice lines grouped by purchase order"
          fill
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover object-left-top"
          draggable={false}
        />
      </ContainerScroll>
      <div className="wrap -mt-40 pb-24 md:-mt-64">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((p) => (
            <Link
              key={p.slug}
              href={`/work/${p.slug}/#demo`}
              className="state flex flex-col gap-5 rounded-[28px] bg-surface-container-lowest p-6 no-underline sm:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="chip">{p.short}</span>
                <ArrowUpRight size={20} className="text-on-surface-variant" aria-hidden />
              </div>
              <div>
                <h3 className="title-l">{p.demo!.title}</h3>
                <p className="muted mt-2 text-[0.95rem] leading-relaxed">{p.demo!.blurb}</p>
              </div>
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
      <SectionHead title="Experience">Internships since high school, and the business I ran with my brother.</SectionHead>
      <ol className="m-0 grid list-none gap-2 p-0">
        {experience.map((e) => (
          <li key={e.org + e.period} className="grid gap-4 rounded-[24px] bg-surface-container-low p-6 md:grid-cols-12 md:gap-6 md:p-7">
            <div className="md:col-span-4">
              <h3 className="title-l">{e.org}</h3>
              <p className="muted mt-1 text-[0.95rem]">{e.role}</p>
              {e.team ? <p className="label-s muted mt-2">{e.team}</p> : null}
            </div>
            <div className="md:col-span-5">
              <p className="max-w-[58ch]">{e.note}</p>
              {e.caseStudies?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.caseStudies.map((slug) => {
                    const p = projects.find((x) => x.slug === slug);
                    return p ? (
                      <Link key={slug} href={`/work/${slug}/`} className="chip chip-link no-underline">
                        {p.short}
                        <ArrowUpRight size={14} aria-hidden />
                      </Link>
                    ) : null;
                  })}
                </div>
              ) : null}
            </div>
            <div className="label muted md:col-span-3 md:text-right">
              <p>{e.period}</p>
              <p className="mt-1 font-normal">{e.place}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div className="rounded-[24px] bg-surface-container-low p-6 md:p-7">
          <h3 className="title-l mb-4">Education</h3>
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
        <div className="rounded-[24px] bg-surface-container-low p-6 md:p-7">
          <h3 className="title-l mb-4">Recognition</h3>
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
    <section id="about" className="section scroll-mt-16">
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <clipPath id="m3-cookie-12" clipPathUnits="objectBoundingBox">
            <path d={cookiePath()} />
          </clipPath>
        </defs>
      </svg>
      <div className="wrap grid gap-12 md:grid-cols-12 md:items-center">
        <div className="md:col-span-5">
          <div className="shape-cookie relative aspect-square w-full max-w-[420px] bg-primary-container">
            <Image
              src={withBase("/images/muhammad-wadiwala.jpg")}
              alt="Portrait of Muhammad Wadiwala"
              fill
              sizes="(min-width: 768px) 420px, 90vw"
              className="object-cover object-top"
            />
          </div>
        </div>
        <div className="md:col-span-7">
          <h2 className="display-l mb-8">About</h2>
          <div className="prose-mw lead">
            {about.paragraphs.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
          <dl className="mt-8 grid gap-2 sm:grid-cols-2">
            {about.facts.map((f) => (
              <div key={f.label} className="rounded-[16px] bg-surface-container-low px-5 py-4">
                <dt className="label-s muted">{f.label}</dt>
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
    <section id="contact" className="scroll-mt-16 pb-16">
      <div className="wrap">
        <div className="rounded-[28px] bg-primary px-[clamp(24px,5vw,72px)] py-[clamp(40px,7vw,96px)] text-on-primary">
          <h2 className="display-l">Contact</h2>
          <p className="lead mt-6 max-w-[54ch] opacity-90">
            I&apos;m looking for product management, technical program management and software engineering roles. Email is the fastest
            way to reach me.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`mailto:${profile.email}`} className="btn btn-lg border-transparent bg-on-primary text-primary">
              <Mail size={20} aria-hidden />
              {profile.email}
            </a>
            <a href={profile.linkedin} target="_blank" rel="noreferrer" className="btn btn-lg border-white/50 text-on-primary">
              LinkedIn
            </a>
            <a href={profile.github} target="_blank" rel="noreferrer" className="btn btn-lg border-white/50 text-on-primary">
              GitHub
            </a>
            <Link href="/resume/" className="btn btn-lg border-white/50 text-on-primary">
              <FileText size={20} aria-hidden />
              Résumé
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
