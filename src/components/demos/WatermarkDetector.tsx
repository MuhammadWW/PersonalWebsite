"use client";

import { Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DemoFrame from "./DemoFrame";
import { attack, detect, generate, tokenize } from "./watermark";
import { verdictFor, WatermarkScene, type SceneStats } from "./WatermarkScene";

type Source = "watermarked" | "human" | "edited" | "custom";

/** Public-domain, human-written sample: President Kennedy at Rice University, Houston, 12 September 1962. */
const HUMAN =
  "We choose to go to the Moon. We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.";

const KEY = "houston";
const CYCLE: Source[] = ["watermarked", "human", "edited"];

const SOURCES: [Source, string][] = [
  ["watermarked", "Watermarked AI text"],
  ["human", "Human-written"],
  ["edited", "Watermarked, then edited"],
  ["custom", "Your own text"],
];

export default function WatermarkDetector({ variant = "full" }: { variant?: "full" | "showcase" }) {
  const showcase = variant === "showcase";
  const [source, setSource] = useState<Source>("watermarked");
  const [gamma, setGamma] = useState(0.25);
  const [delta, setDelta] = useState(2.5);
  const [editPct, setEditPct] = useState(35);
  const [length, setLength] = useState(showcase ? 56 : 72);
  const [seed, setSeed] = useState(11);
  const [fast, setFast] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [draft, setDraft] = useState("Paste a paragraph you wrote yourself. It knows nothing about the secret key, so it should land near z = 0.");
  const [custom, setCustom] = useState(draft);
  const [result, setResult] = useState<SceneStats | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<WatermarkScene | null>(null);
  const onDoneRef = useRef<(s: SceneStats) => void>(() => {});
  const cycleRef = useRef(0);

  const tokens = useMemo(() => {
    if (source === "human") return tokenize(HUMAN);
    if (source === "custom") return tokenize(custom);
    const base = generate({ length, gamma, delta, hard: false, watermark: true, seed, key: KEY });
    return source === "edited" ? attack(base, editPct, 0, seed) : base;
  }, [source, custom, length, gamma, delta, seed, editPct]);
  const greens = useMemo(() => detect(tokens, KEY, gamma).greens, [tokens, gamma]);

  const label =
    source === "human"
      ? "Human-written · JFK at Rice University, 1962"
      : source === "edited"
        ? `Watermarked, then ${editPct}% of words swapped`
        : source === "custom"
          ? "Your text"
          : "Watermarked AI text";
  const note = `γ ${gamma.toFixed(2)}${source === "watermarked" || source === "edited" ? ` · δ ${delta.toFixed(1)}` : ""} · ${Math.max(0, tokens.length - 1)} words scored`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let scene: WatermarkScene;
    try {
      scene = new WatermarkScene(canvas, {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        footnote: showcase ? "Toy model built for this site, not an LLM" : undefined,
        onDone: (s) => onDoneRef.current(s),
      });
    } catch {
      return;
    }
    sceneRef.current = scene;
    const ro = new ResizeObserver(([entry]) => scene.resize(entry.contentRect.width, entry.contentRect.height));
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting), { rootMargin: "120px" });
    io.observe(wrap);
    return () => {
      ro.disconnect();
      io.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [showcase]);

  useEffect(() => {
    sceneRef.current?.setData({ tokens, greens, gamma, key: KEY, label, note });
  }, [tokens, greens, gamma, label, note]);

  useEffect(() => {
    sceneRef.current?.setSpeed(fast ? 18 : 6);
  }, [fast]);

  useEffect(() => {
    sceneRef.current?.setPlaying(playing);
  }, [playing]);

  useEffect(() => {
    if (draft === custom) return;
    const id = window.setTimeout(() => setCustom(draft), 700);
    return () => window.clearTimeout(id);
  }, [draft, custom]);

  useEffect(() => {
    onDoneRef.current = (s) => {
      setResult(s);
      if (!showcase) return;
      window.setTimeout(() => {
        cycleRef.current = (cycleRef.current + 1) % CYCLE.length;
        if (cycleRef.current === 0) setSeed((v) => (v * 48271) % 2147483647 || 3);
        setSource(CYCLE[cycleRef.current]);
      }, 2800);
    };
  });

  const announce = result ? `z-score ${result.z.toFixed(2)} after ${result.T} words: ${verdictFor(result.z, result.T).text}.` : "";

  const canvas = (
    <div ref={wrapRef} className={showcase ? "absolute inset-0" : "relative h-[640px] overflow-hidden rounded-[20px] md:h-[560px]"}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Animated watermark detector: each word is checked against a secret green list and stacked into a green or red pile; the z-score measures how far the green pile rises above chance."
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );

  if (showcase) return canvas;

  return (
    <DemoFrame
      title="Watermark detector"
      note="Toy vocabulary · bigram model · not an LLM"
      actions={
        <>
          <button type="button" className="btn btn-sm" onClick={() => setPlaying((v) => !v)} aria-pressed={!playing}>
            {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              sceneRef.current?.restart();
              setPlaying(true);
            }}
          >
            <RotateCcw size={16} aria-hidden />
            Replay
          </button>
          <button type="button" className="btn btn-sm" aria-pressed={fast} onClick={() => setFast((v) => !v)}>
            {fast ? "3× speed" : "1× speed"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Text to test">
        {SOURCES.map(([id, text]) => (
          <button key={id} type="button" className="pill" aria-pressed={source === id} onClick={() => setSource(id)}>
            <span>{text}</span>
          </button>
        ))}
      </div>

      {source === "custom" ? (
        <textarea className="input mb-4 min-h-[110px] font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Text to test" />
      ) : null}

      {canvas}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field">
          <span>Green list share γ · {gamma.toFixed(2)}</span>
          <input type="range" min={0.1} max={0.5} step={0.05} value={gamma} onChange={(e) => setGamma(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Bias strength δ · {delta.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={6}
            step={0.5}
            value={delta}
            disabled={source === "human" || source === "custom"}
            onChange={(e) => setDelta(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Words swapped after writing · {editPct}%</span>
          <input type="range" min={0} max={70} step={5} value={editPct} disabled={source !== "edited"} onChange={(e) => setEditPct(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Length · {length} words</span>
          <input
            type="range"
            min={20}
            max={140}
            step={4}
            value={length}
            disabled={source === "human" || source === "custom"}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-sm"
          disabled={source === "human" || source === "custom"}
          onClick={() => setSeed((v) => (v * 48271) % 2147483647 || 3)}
        >
          <Shuffle size={16} aria-hidden />
          New sample
        </button>
        <p className="m-0 text-sm muted">
          Hover a word to see which list it landed on. Push δ to zero, or swap more words, and watch the green pile sink toward the chance line.
        </p>
      </div>
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium">Read the text</summary>
        <p className="mt-3 max-w-[90ch] text-sm leading-[2]">
          {tokens.map((tok, i) => (
            <span
              key={i}
              className="mr-1 rounded px-[3px]"
              style={i === 0 ? { color: "var(--color-on-surface-variant)" } : greens[i] ? { background: "rgba(22,106,89,0.16)" } : { boxShadow: "inset 0 -1px 0 rgba(164,59,43,0.45)" }}
            >
              {tok}
            </span>
          ))}
        </p>
      </details>
    </DemoFrame>
  );
}
