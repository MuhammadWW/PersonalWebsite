"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import DemoFrame from "./DemoFrame";

type Phrase = { en: string; es: string; accept: string[] };

const PHRASES: Phrase[] = [
  { en: "good morning", es: "buenos días", accept: ["buenos dias", "buen dia"] },
  { en: "how are you?", es: "¿cómo estás?", accept: ["como estas", "como esta"] },
  { en: "thank you very much", es: "muchas gracias", accept: ["muchas gracias"] },
  { en: "see you later", es: "hasta luego", accept: ["hasta luego"] },
  { en: "my name is Muhammad", es: "me llamo Muhammad", accept: ["me llamo muhammad", "me llamo mohamed", "me llamo mohammed", "me llamo"] },
];

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };

const noSubscribe = () => () => {};
const hasRecognition = () => {
  const w = window as unknown as SpeechWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
};
const hasSynthesis = () => "speechSynthesis" in window;
const onServer = () => false;

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

export default function VoiceLesson() {
  const [i, setI] = useState(0);
  const [status, setStatus] = useState<"idle" | "listening" | "right" | "wrong">("idle");
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [xp, setXp] = useState(0);
  const canListen = useSyncExternalStore(noSubscribe, hasRecognition, onServer);
  const canSpeak = useSyncExternalStore(noSubscribe, hasSynthesis, onServer);
  const recRef = useRef<RecognitionLike | null>(null);
  const phrase = PHRASES[i];

  useEffect(() => () => recRef.current?.abort(), []);

  const say = useCallback(
    (text: string, lang = "en-US") => {
      if (!canSpeak) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    },
    [canSpeak],
  );

  const check = useCallback(
    (answer: string) => {
      const a = normalize(answer);
      setHeard(answer);
      if (/\b(siguiente|next)\b/.test(a)) {
        setI((x) => (x + 1) % PHRASES.length);
        setStatus("idle");
        return;
      }
      if (/\b(repite|repetir|repeat)\b/.test(a)) {
        say(`How do you say: ${phrase.en}?`);
        setStatus("idle");
        return;
      }
      const ok = phrase.accept.some((t) => similarity(a, normalize(t)) >= 0.78);
      setStatus(ok ? "right" : "wrong");
      if (ok) {
        setXp((x) => x + 10);
        say(phrase.es, "es-ES");
      }
    },
    [phrase, say],
  );

  const listen = () => {
    const w = window as unknown as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0]).map((r) => r.transcript);
      const best = alts.find((t) => phrase.accept.some((acc) => similarity(normalize(t), normalize(acc)) >= 0.78)) ?? alts[0] ?? "";
      check(best);
    };
    rec.onerror = () => setStatus("idle");
    rec.onend = () => setStatus((s) => (s === "listening" ? "idle" : s));
    recRef.current = rec;
    setStatus("listening");
    setHeard("");
    rec.start();
  };

  return (
    <DemoFrame title="Learn Out Loud" note="Browser speech APIs · not affiliated with Duolingo">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <p className="label muted">
            Phrase {i + 1} of {PHRASES.length}
          </p>
          <p className="mt-3 text-2xl">
            How do you say <span className="font-medium">&ldquo;{phrase.en}&rdquo;</span> in Spanish?
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => say(`How do you say: ${phrase.en}?`)} disabled={!canSpeak}>
              Hear the prompt
            </button>
            {canListen ? (
              <button type="button" className="btn btn-primary" onClick={listen} disabled={status === "listening"}>
                {status === "listening" ? "Listening…" : "Answer out loud"}
              </button>
            ) : null}
            <button type="button" className="btn" onClick={() => say(phrase.es, "es-ES")} disabled={!canSpeak}>
              Hear the answer
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setI((x) => (x + 1) % PHRASES.length);
                setStatus("idle");
                setHeard("");
                setTyped("");
              }}
            >
              Next
            </button>
          </div>

          {!canListen ? (
            <form
              className="mt-6 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                check(typed);
              }}
            >
              <input className="input" placeholder="Your browser can't listen. Type what you'd say." value={typed} onChange={(e) => setTyped(e.target.value)} />
              <button type="submit" className="btn btn-primary">
                Check
              </button>
            </form>
          ) : null}

          <div className="mt-6 min-h-[72px] rounded-lg border border-line bg-white p-4" aria-live="polite">
            {status === "right" ? (
              <p className="m-0 tag-ok font-medium">
                ¡Bien! &ldquo;{phrase.es}&rdquo; · +10 XP
              </p>
            ) : status === "wrong" ? (
              <p className="m-0">
                <span className="tag-bad font-medium">Close, not quite.</span> I heard &ldquo;{heard}&rdquo;. Try &ldquo;{phrase.es}&rdquo;.
              </p>
            ) : status === "listening" ? (
              <p className="m-0 muted">Listening. You can also say “siguiente” to skip or “repite” to repeat.</p>
            ) : (
              <p className="m-0 muted">Say the phrase, or use the buttons. Hands-free commands: “siguiente” (next), “repite” (repeat).</p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="label muted">XP this session</p>
            <p className="text-3xl font-light tabular-nums">{xp}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4 text-sm">
            <p className="label muted mb-1">Events a real test would log</p>
            <ul className="m-0 list-none space-y-1 p-0 font-mono text-[0.72rem]">
              <li>voice_mode_started</li>
              <li>voice_lesson_completed</li>
              <li>voice_error_retry</li>
              <li>streak_retained_after_voice_day</li>
            </ul>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
