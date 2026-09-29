"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { withBase } from "@/lib/site";
import { STEPS } from "./journey-data";
import type { JourneyHandle } from "./journey";
import { SplitText } from "./SplitText";

const INTERNSHIPS: Record<string, { year: string; org: string; line: string }> = {
  hobby: { year: "2022", org: "Southwest Airlines", line: "Ground operations at Houston Hobby Airport." },
  jsc: { year: "2023", org: "NASA Johnson Space Center", line: "The space station crew's Wi-Fi." },
  maryland: { year: "2024", org: "U.S. Health and Human Services", line: "Budget work for SAMHSA's finance office in Maryland, done remotely." },
  plano: { year: "2025", org: "JPMorgan Chase", line: "Product discovery in Plano, near Dallas." },
  redmond: { year: "2026", org: "Microsoft", line: "Tools for datacenter cost teams, in Redmond, near Seattle." },
  bastrop: { year: "2026", org: "SpaceX", line: "Starlink, in Bastrop, Texas." },
};

const LAST = STEPS.length - 1;
/** A pause longer than this between wheel events starts a new gesture. */
const GESTURE_GAP = 220;

type Mode = "loading" | "webgl" | "static";

function detectMode(): Mode {
  if (typeof window === "undefined") return "loading";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  try {
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) return "static";
  } catch {
    return "static";
  }
  return "webgl";
}

function formatAltitude(km: number) {
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
}

function beatContent(id: string): ReactNode {
  const job = INTERNSHIPS[id];
  if (job) {
    return (
      <>
        <p className="label mb-4 opacity-80">Internship · {job.year}</p>
        <SplitText text={job.org} className="display-m block max-w-[14ch]" />
        <SplitText text={job.line} className="lead mt-4 block max-w-[28ch]" />
      </>
    );
  }
  switch (id) {
    case "title":
      return (
        <>
          <h1>
            <SplitText text="Muhammad Wadiwala" className="display-xl block max-w-[10ch]" />
          </h1>
          <p className="lead mt-7 max-w-[34ch] opacity-90">Electrical engineering and business at Texas A&amp;M, class of 2027.</p>
        </>
      );
    case "karachi":
      return (
        <>
          <p className="label mb-4 opacity-80">Where it started</p>
          <SplitText text="Born in Karachi, Pakistan." className="display-l block max-w-[12ch]" />
        </>
      );
    case "houston":
      return (
        <div className="max-w-[16ch] sm:max-w-none">
          <SplitText text="I grew up in Houston," className="lead block mb-3" />
          <SplitText text="Ten minutes from NASA." className="display-l block max-w-[11ch]" />
        </div>
      );
    case "tamu":
      return (
        <>
          <p className="label mb-4 opacity-80">College Station · class of 2027</p>
          <SplitText text="Texas A&M" className="display-l block" />
          <SplitText text="Electrical engineering, with a business minor." className="lead mt-4 block max-w-[26ch]" />
        </>
      );
    case "launch":
      return (
        <>
          <SplitText text="Go for launch." className="display-xl block" />
          <div className="mt-10">
            <a href="#work" className="pill interactive">
              <span>Projects</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </>
      );
    case "orbit":
      return (
        <>
          <p className="label mb-4 opacity-80">Low Earth orbit · 408 km</p>
          <SplitText text="About where the ISS flies. In 2023 I worked on its crew Wi-Fi." className="display-m block max-w-[19ch]" />
        </>
      );
    default:
      return null;
  }
}

export default function IntroExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<JourneyHandle | null>(null);
  const stepRef = useRef(0);
  const [step, setStep] = useState(0);

  const go = (next: number) => {
    const i = Math.max(0, Math.min(LAST, next));
    if (i === stepRef.current) return;
    stepRef.current = i;
    setStep(i);
    handleRef.current?.goTo(i);
  };

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const setMode = (mode: Mode) => {
      root.dataset.mode = mode;
    };

    if (detectMode() === "static") {
      setMode("static");
      return;
    }
    const pinEls = Array.from(pinsRef.current?.querySelectorAll<HTMLElement>(".jpin") ?? []);
    let disposed = false;
    let visible = true;

    const lowPower =
      window.innerWidth < 820 ||
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;

    const move = (dir: number) => {
      const i = Math.max(0, Math.min(LAST, stepRef.current + dir));
      if (i === stepRef.current) return;
      stepRef.current = i;
      setStep(i);
      handleRef.current?.goTo(i);
    };
    const atTop = () => window.scrollY <= 2;
    const canStep = (dir: number) => (dir > 0 ? stepRef.current < LAST : stepRef.current > 0);

    // One wheel gesture moves one step, however long its momentum tail runs.
    let lastWheel = 0;
    let consumed = false;
    const onWheel = (e: WheelEvent) => {
      if (!atTop() || e.ctrlKey) return;
      const now = performance.now();
      const fresh = now - lastWheel > GESTURE_GAP;
      lastWheel = now;
      if (fresh) consumed = false;
      if (consumed) {
        e.preventDefault();
        return;
      }
      const dir = Math.sign(e.deltaY);
      if (!dir || !canStep(dir)) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 3) return;
      consumed = true;
      move(dir);
    };

    let touchY = 0;
    let touchOnStage = false;
    let touchUsed = false;
    const onTouchStart = (e: TouchEvent) => {
      touchOnStage = atTop() && root.contains(e.target as Node);
      touchUsed = false;
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchOnStage) return;
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      const dir = Math.sign(dy);
      if (touchUsed || (dir && canStep(dir))) e.preventDefault();
      if (!touchUsed && Math.abs(dy) > 36 && dir && canStep(dir)) {
        touchUsed = true;
        move(dir);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!atTop() || e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const dir = ["ArrowDown", "PageDown", " "].includes(e.key) ? 1 : ["ArrowUp", "PageUp"].includes(e.key) ? -1 : 0;
      if (!dir || !canStep(dir)) return;
      e.preventDefault();
      move(dir);
    };

    const onResize = () => handleRef.current?.resize(canvas.clientWidth, canvas.clientHeight);
    const onPointer = (e: PointerEvent) => {
      handleRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => document.documentElement.classList.toggle("nav-light", root.getBoundingClientRect().bottom > 64);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        handleRef.current?.setActive(visible && !document.hidden);
      },
      { rootMargin: "80px" },
    );
    io.observe(root);
    const onVisibility = () => handleRef.current?.setActive(visible && !document.hidden);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    onScroll();

    import("./journey")
      .then(({ createJourney }) => {
        if (disposed) return;
        try {
          const handle = createJourney(canvas, {
            quality: lowPower ? "low" : "high",
            textureBase: withBase("/textures"),
            onFrame: ({ pins, lat, lon, altitudeKm }) => {
              if (altRef.current) altRef.current.textContent = formatAltitude(altitudeKm);
              if (coordRef.current) coordRef.current.textContent = formatCoords(lat, lon);
              pins.forEach((pin, i) => {
                const el = pinEls[i];
                if (!el) return;
                const state = pin.visible ? pin.state : "hidden";
                if (el.dataset.state !== state) el.dataset.state = state;
                if (state !== "hidden") el.style.transform = `translate3d(${pin.x.toFixed(1)}px, ${pin.y.toFixed(1)}px, 0)`;
              });
            },
          });
          handleRef.current = handle;
          handle.goTo(stepRef.current);
          handle.setActive(visible && !document.hidden);
          setMode("webgl");
        } catch {
          setMode("static");
        }
      })
      .catch(() => setMode("static"));

    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.documentElement.classList.remove("nav-light");
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  return (
    <section ref={rootRef} id="intro" className="intro" data-mode="loading" data-step={STEPS[step].id} aria-label="Introduction">
      <noscript>
        <style>{`.intro{height:auto}.intro .intro-stage{height:auto}.intro .beat{position:relative;min-height:46vh;--v:1}.intro .beat .ch{opacity:1;transform:none;filter:none}.scroll-cue,.hud,.skip-intro,.jpins,.intro-rail{display:none}`}</style>
      </noscript>
      <div className="intro-stage">
        <div className="intro-fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
        <div className="intro-scrim" aria-hidden="true" />

        <div ref={pinsRef} className="jpins" aria-hidden="true">
          {STEPS.filter((s) => s.pin).map((s) => (
            <div key={s.id} className="jpin" data-state="hidden">
              <i />
              <span>{s.pin}</span>
            </div>
          ))}
        </div>

        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`beat${s.id === "launch" ? " items-center text-center" : ""}${i === 0 ? " beat-first" : ""}`}
            data-tone="light"
            data-active={i === step}
          >
            <div className="beat-inner">{beatContent(s.id)}</div>
          </div>
        ))}

        <nav className="intro-rail" aria-label="Intro stops">
          {STEPS.map((s, i) => (
            <button key={s.id} type="button" aria-current={i === step ? "step" : undefined} aria-label={s.name} onClick={() => go(i)}>
              <span>{s.name}</span>
            </button>
          ))}
        </nav>

        <div className="hud" aria-hidden="true">
          <div ref={coordRef}>27.00° N, 69.00° E</div>
          <div>
            Alt <span ref={altRef}>17,000 km</span>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>
        <a href="#work" className="skip-intro">
          Skip intro
        </a>
      </div>
    </section>
  );
}
