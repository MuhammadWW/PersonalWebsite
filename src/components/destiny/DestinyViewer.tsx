"use client";

import { Box, DoorOpen, Pause, Play, Scissors, Truck } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DestinyHandle, DestinyMode, DestinyView, LabelInfo, PartInfo } from "./scene";

const MODES: [DestinyMode, string, ReactNode][] = [
  ["assembled", "Assembled", <Box key="a" size={15} aria-hidden />],
  ["cutaway", "Cutaway", <Scissors key="c" size={15} aria-hidden />],
  ["transport", "Transport", <Truck key="t" size={15} aria-hidden />],
  ["door", "Door check", <DoorOpen key="d" size={15} aria-hidden />],
];

const VIEWS: [DestinyView, string][] = [
  ["overview", "Overview"],
  ["side", "Side"],
  ["inside", "Inside"],
  ["top", "Top"],
];

const ASSEMBLED = { name: "Assembled module", dims: "28 × 14 × 14" };

function dims(p: PartInfo) {
  return p.dims.map((d) => d.toFixed(1)).join(" × ");
}

export default function DestinyViewer() {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<DestinyHandle | null>(null);
  const labelEls = useRef<(HTMLDivElement | null)[]>([]);
  const [near, setNear] = useState(false);
  const [mode, setMode] = useState<DestinyMode>("assembled");
  const [view, setView] = useState<DestinyView>("overview");
  const [spin, setSpin] = useState(true);
  const [parts, setParts] = useState<PartInfo[]>([]);
  const [failed, setFailed] = useState(false);
  const [labels, setLabels] = useState<Pick<LabelInfo, "id" | "text" | "sub">[]>([]);
  const [hover, setHover] = useState<{ part: PartInfo; x: number; y: number } | null>(null);
  const [doorPart, setDoorPart] = useState<PartInfo | null>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!near || !host) return;
    let disposed = false;
    let named = false;
    const ro = new ResizeObserver(() => handleRef.current?.resize());
    import("./scene")
      .then(({ createDestiny }) => {
        if (disposed) return;
        try {
          const handle = createDestiny(host, {
            onReady: (list) => setParts(list),
            onHover: (hit) => setHover(hit),
            onDoorPart: (part) => setDoorPart(part),
            onLabels: (list) => {
              if (!named) {
                named = true;
                setLabels(list.map(({ id, text, sub }) => ({ id, text, sub })));
              }
              list.forEach((l, i) => {
                const node = labelEls.current[i];
                if (!node) return;
                node.style.opacity = l.visible ? "1" : "0";
                node.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
              });
            },
          });
          handleRef.current = handle;
          const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          handle.setSpin(!still);
          if (still) setSpin(false);
          ro.observe(host);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      ro.disconnect();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [near]);

  const pickMode = (m: DestinyMode) => {
    setMode(m);
    handleRef.current?.setMode(m);
    if ((m === "transport" || m === "door") && view === "inside") setView("overview");
  };
  const pickView = (v: DestinyView) => {
    setView(v);
    handleRef.current?.setView(v);
  };
  const toggleSpin = () => {
    const next = !spin;
    setSpin(next);
    handleRef.current?.setSpin(next);
  };

  return (
    <div>
      <div ref={frameRef} className="dv" data-mode={mode}>
        <div ref={hostRef} className="dv-canvas" />
        <div className="dv-heading">
          <span>Destiny module exhibit, full-size design</span>
          <span className="dv-index">1 unit = 1 ft</span>
        </div>

        <div className="dv-labels" aria-hidden="true">
          {labels.map((l, i) => (
            <div
              key={l.id}
              ref={(node) => {
                labelEls.current[i] = node;
              }}
              className="dv-label"
            >
              <i />
              <div>
                <b>{l.text}</b>
                <small>{l.sub}</small>
              </div>
            </div>
          ))}
        </div>

        {hover ? (
          <div className="dv-tip" style={{ left: hover.x + 16, top: hover.y + 16 }}>
            <strong>{hover.part.name}</strong>
            <p>
              {hover.part.qty} × · {dims(hover.part)} ft · {hover.part.material}
            </p>
          </div>
        ) : null}

        {mode === "door" ? (
          <div className="dv-door" aria-live="polite">
            <p className="dv-door-k">Seven-foot door · three feet wide</p>
            <strong>{doorPart ? doorPart.name : ASSEMBLED.name}</strong>
            <p>
              {doorPart ? dims(doorPart) : ASSEMBLED.dims} ft
              <span data-ok={doorPart ? doorPart.fits : false}>{doorPart ? (doorPart.fits ? "Fits on edge" : "Too big") : "Won't fit"}</span>
            </p>
          </div>
        ) : null}

        <div className="dv-controls">
          <div className="dv-modes" role="group" aria-label="Model mode">
            {MODES.map(([id, label, icon]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => pickMode(id)}>
                {icon}
                {label}
              </button>
            ))}
          </div>
          <div className="dv-views" role="group" aria-label="Camera">
            <span className="dv-cap">View</span>
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                disabled={id === "inside" && (mode === "transport" || mode === "door")}
                onClick={() => pickView(id)}
              >
                {label}
              </button>
            ))}
            <span className="dv-div" />
            <button type="button" className="dv-spin" aria-label={spin ? "Stop rotating" : "Rotate"} aria-pressed={spin} onClick={toggleSpin}>
              {spin ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            </button>
          </div>
        </div>
        <p className="dv-hint">Drag to turn · hover a part</p>
        {!parts.length && !failed ? <p className="dv-loading">Loading the model…</p> : null}
        {failed ? <p className="dv-loading">The 3D model needs WebGL, which this browser has turned off.</p> : null}
      </div>

      <div className="mt-6 overflow-x-auto rounded-[20px] bg-surface-container-lowest p-5 sm:p-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Part</th>
              <th className="num">Qty</th>
              <th className="num">Size (ft)</th>
              <th>Seven-foot door</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{ASSEMBLED.name}</td>
              <td className="num">1</td>
              <td className="num">{ASSEMBLED.dims}</td>
              <td className="tag-bad">Won&apos;t fit</td>
            </tr>
            {parts.map((p) => (
              <tr key={p.kind}>
                <td>{p.name}</td>
                <td className="num">{p.qty}</td>
                <td className="num">{dims(p)}</td>
                <td className={p.fits ? "tag-ok" : "tag-bad"}>{p.fits ? "Fits on edge" : "Won't fit"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm muted">
          A part clears the door if its two smallest dimensions fit the door&apos;s width and height, so it can be carried through on edge. Sizes come
          from the 3D model, which is a rebuild of the design for this site.
        </p>
      </div>
    </div>
  );
}
