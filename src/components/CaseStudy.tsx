import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { lensLabels, projects, type Project } from "@/content/projects";
import AuditMachine from "./AuditMachine";
import DemoSlot from "./DemoSlot";
import ProjectGlyph from "./ProjectGlyph";

function Body({ lines }: { lines: string[] }) {
  const blocks: { type: "p" | "ul"; items: string[] }[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else {
      blocks.push({ type: "p", items: [line] });
    }
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{b.items[0]}</p>
        ) : (
          <ul key={i}>
            {b.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

export default function CaseStudy({ project }: { project: Project }) {
  const index = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(index + 1) % projects.length];

  return (
    <main id="main" className="content-over pt-16">
      <header className="wrap pb-12 pt-14 sm:pt-20">
        <Link href="/#work" className="btn btn-text -ml-3">
          <ArrowLeft size={18} aria-hidden />
          All projects
        </Link>
        <div className="mt-10 grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="label muted mb-5">
              {project.org} · {project.context} · {project.period}
            </p>
            <h1 className="display-l max-w-[18ch]">{project.title}</h1>
            <p className="lead mt-8 max-w-[58ch]">{project.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.lenses.map((l) => (
                <span key={l} className="chip">
                  {lensLabels[l]}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden md:col-span-4 md:block">
            <div className="porthole ml-auto w-[min(100%,260px)] text-ink">
              <ProjectGlyph slug={project.slug} className="absolute inset-0 m-auto h-[72%] w-[72%]" />
            </div>
          </div>
        </div>
      </header>

      <section className="wrap" aria-label="Project facts">
        <div className="fact-grid">
          <div>
            <p className="label muted">Outcome</p>
            <p className="mt-1 font-medium">{project.outcome}</p>
          </div>
          {project.facts.map((f) => (
            <div key={f.label}>
              <p className="label muted">{f.label}</p>
              <p className="mt-1">{f.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[80ch] text-[0.95rem] muted">
          <span className="label mr-2 text-on-surface">Role</span>
          {project.role}
        </p>
      </section>

      {project.slug === "audit-tool" ? (
        <section className="wrap mt-14" aria-labelledby="machine-title">
          <div className="mb-5 grid gap-3 md:grid-cols-12 md:items-end">
            <h2 id="machine-title" className="display-m md:col-span-7">
              The five steps, as a machine
            </h2>
            <p className="muted md:col-span-5">
              A 3D model of the pipeline, with made-up data on every screen. Switch to &ldquo;One line&rdquo; to follow a single invoice row
              from the export to sign-off, or click a station to see what it does.
            </p>
          </div>
          <AuditMachine />
        </section>
      ) : null}

      <article className="wrap py-16 sm:py-20">
        <div className="grid gap-x-12 md:grid-cols-12">
          <aside className="hidden md:col-span-3 md:block">
            <nav aria-label="Sections" className="sticky top-24">
              <p className="label muted mb-4">Contents</p>
              <ol className="m-0 list-none space-y-2 p-0 text-[0.92rem]">
                {project.sections.map((s, i) => (
                  <li key={s.heading}>
                    <a href={`#s-${i}`} className="muted no-underline hover:text-ink">
                      {s.heading}
                    </a>
                  </li>
                ))}
                {project.demo ? (
                  <li>
                    <a href="#demo" className="font-medium text-primary no-underline hover:underline">
                      Demo
                    </a>
                  </li>
                ) : null}
              </ol>
              <p className="label muted mb-3 mt-10">Tools and methods</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {project.stack.map((s) => (
                  <li key={s} className="chip">
                    {s}
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <div className="md:col-span-9">
            {project.sections.map((s, i) => (
              <section key={s.heading} id={`s-${i}`} className="scroll-mt-24 border-t border-line py-10 first:border-t-0 first:pt-0">
                <h2 className="display-m mb-6">{s.heading}</h2>
                <div className="prose-mw text-[1.05rem]">
                  <Body lines={s.body} />
                </div>
              </section>
            ))}
            {project.boundary ? (
              <div className="callout mt-4">
                <p className="label mb-2">{project.demo ? "About the demo" : "What isn't shown"}</p>
                <p className="m-0">{project.boundary}</p>
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {project.demo ? (
        <section id="demo" className="scroll-mt-20 bg-surface-container-low">
          <div className="wrap py-16 sm:py-20">
            <div className="mb-8 grid gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <p className="label muted mb-3">Demo</p>
                <h2 className="display-m">{project.demo.title}</h2>
              </div>
              <p className="md:col-span-5 muted">{project.demo.blurb}</p>
            </div>
            <DemoSlot id={project.demo.id} />
          </div>
        </section>
      ) : null}

      <nav aria-label="Next project" className="wrap py-10">
        <Link
          href={`/work/${next.slug}/`}
          className="state group flex flex-col gap-3 rounded-[28px] bg-surface-container-low p-7 no-underline sm:flex-row sm:items-center sm:justify-between sm:p-9"
        >
          <div>
            <p className="label muted mb-2">Next project</p>
            <p className="display-m">{next.title}</p>
            <p className="muted mt-1">{next.org}</p>
          </div>
          <span className="work-arrow grid h-12 w-12 place-items-center rounded-full bg-primary-container text-on-primary-container" aria-hidden>
            <ArrowRight size={22} />
          </span>
        </Link>
      </nav>
    </main>
  );
}
