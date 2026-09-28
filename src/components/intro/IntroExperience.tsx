"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { clamp, windowed } from "@/lib/math";
import { withBase } from "@/lib/site";
import { SplitText } from "./SplitText";
import type { IntroSceneHandle } from "./scene";

type Tone = "light" | "dark";
type BeatTiming = { start: number; end: number; fadeIn: number; fadeOut: number; tone: Tone };

const BEATS: BeatTiming[] = [
  { start: 0, end: 0.14, fadeIn: 0, fadeOut: 0.035, tone: "light" },
  { start: 0.165, end: 0.32, fadeIn: 0.03, fadeOut: 0.03, tone: "light" },
  { start: 0.345, end: 0.52, fadeIn: 0.03, fadeOut: 0.03, tone: "dark" },
  { start: 0.55, end: 0.745, fadeIn: 0.03, fadeOut: 0.035, tone: "dark" },
  { start: 0.845, end: 0.93, fadeIn: 0.025, fadeOut: 0.025, tone: "light" },
  { start: 0.945, end: 1.01, fadeIn: 0.025, fadeOut: 0, tone: "light" },
];

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
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export default function IntroExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

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
    const beats = Array.from(root.querySelectorAll<HTMLElement>(".beat"));

    let handle: IntroSceneHandle | null = null;
    let disposed = false;
    let progress = 0;
    let lastTone: Tone = "light";
    let visible = true;

    const lowPower =
      window.innerWidth < 820 ||
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
    const small = window.innerWidth < 820;

    const update = () => {
      const rect = root.getBoundingClientRect();
      const total = Math.max(1, root.offsetHeight - window.innerHeight);
      progress = clamp(-rect.top / total);
      root.style.setProperty("--p", progress.toFixed(4));
      let bestTone: Tone | null = null;
      let bestV = 0;
      BEATS.forEach((b, i) => {
        const v = b.fadeIn === 0 && progress <= b.start ? 1 : windowed(progress, b.start, b.end, b.fadeIn, b.fadeOut);
        beats[i]?.style.setProperty("--v", v.toFixed(3));
        if (v > bestV) {
          bestV = v;
          bestTone = b.tone;
        }
      });
      if (bestTone && bestV > 0.2) lastTone = bestTone;
      const introOnScreen = rect.bottom > 64;
      document.documentElement.classList.toggle("nav-light", introOnScreen && lastTone === "light");
      handle?.setProgress(progress);
    };

    const onScroll = () => update();
    const onResize = () => {
      handle?.resize(canvas.clientWidth, canvas.clientHeight);
      update();
    };
    const onPointer = (e: PointerEvent) => {
      handle?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        handle?.setActive(visible && !document.hidden);
      },
      { rootMargin: "80px" },
    );
    io.observe(root);
    const onVisibility = () => handle?.setActive(visible && !document.hidden);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    update();

    import("./scene")
      .then(({ createIntroScene }) => {
        if (disposed) return;
        try {
          handle = createIntroScene(canvas, {
            quality: lowPower ? "low" : "high",
            textures: {
              day: withBase(small ? "/textures/earth-day-sm.jpg" : "/textures/earth-day.jpg"),
              night: withBase(small ? "/textures/earth-night-sm.jpg" : "/textures/earth-night.jpg"),
              gulfNight: withBase("/textures/gulf-night.jpg"),
            },
            onFrame: ({ houston, altitudeKm }) => {
              if (altRef.current) altRef.current.textContent = formatAltitude(altitudeKm);
              const tag = tagRef.current;
              if (tag) {
                const show = houston.visible && progress > 0.94;
                tag.style.opacity = show ? "0.92" : "0";
                if (show) tag.style.transform = `translate3d(${houston.x}px, ${houston.y}px, 0)`;
              }
            },
          });
          handle.setProgress(progress);
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.documentElement.classList.remove("nav-light");
      handle?.dispose();
    };
  }, []);

  return (
    <section ref={rootRef} id="intro" className="intro" data-mode="loading" aria-label="Introduction">
      <noscript>
        <style>{`.intro{height:auto}.intro .intro-stage{position:relative;height:auto}.intro .beat{position:relative;min-height:70vh;opacity:1}.intro .beat .ch{opacity:1;transform:none;filter:none}.scroll-cue,.hud,.skip-intro{display:none}`}</style>
      </noscript>
      <div className="intro-stage">
        <div className="intro-fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />

        <div className="beat" data-tone="light" style={{ "--v": 1 } as CSSProperties}>
          <div className="beat-inner">
            <h1>
              <SplitText text="Hey, I'm" className="lead block mb-3" />
              <SplitText text="Muhammad." className="display-xl block" />
            </h1>
            <p className="label mt-8 opacity-80">Product · Engineering · Program</p>
          </div>
        </div>

        <div className="beat beat-top-portrait" data-tone="light">
          <div className="beat-inner">
            <div className="max-w-[16ch] sm:max-w-none">
              <SplitText text="I grew up in Houston," className="lead block mb-3" />
              <SplitText text="ten minutes from NASA." className="display-l block max-w-[11ch]" />
            </div>
          </div>
          <p className="porthole-caption label" aria-hidden="true">
            Houston from low Earth orbit
          </p>
        </div>

        <div className="beat" data-tone="dark">
          <div className="beat-inner">
            <SplitText text="Since then, I've worked at" className="lead block mb-6" />
            <div className="log-list display-m">
              {[
                ["2023", "NASA Johnson Space Center"],
                ["2025", "JPMorgan Chase"],
                ["2026", "Microsoft"],
                ["2026", "SpaceX Starlink"],
              ].map(([year, org]) => (
                <div key={org}>
                  <SplitText text={year} className="label" />
                  <SplitText text={org} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="beat" data-tone="dark">
          <div className="beat-inner">
            <SplitText text="What I actually do:" className="lead block mb-3" />
            <SplitText text="turn messy problems into products people trust." className="display-l block max-w-[16ch]" />
          </div>
        </div>

        <div className="beat items-center text-center" data-tone="light">
          <div className="beat-inner">
            <SplitText text="Let's take a look." className="lead block mb-3" />
            <SplitText text="Go for launch." className="display-xl block" />
            <div className="mt-10">
              <a href="#work" className="pill interactive">
                <span>See the work</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>

        <div className="beat" data-tone="light">
          <div className="beat-inner">
            <p className="label mb-4 opacity-80">Low Earth orbit · 408 km</p>
            <SplitText text="Here's what I've been building." className="display-m block max-w-[14ch]" />
          </div>
        </div>

        <div ref={tagRef} className="houston-tag" aria-hidden="true">
          <span>Houston, TX</span>
        </div>

        <div className="hud" aria-hidden="true">
          <div>29.76° N, 95.37° W</div>
          <div>
            Alt <span ref={altRef}>2 m</span>
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
