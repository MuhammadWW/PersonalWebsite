"use client";

import { useEffect, useRef } from "react";

const C = 200;
const RX = 186;
const RY = 48;
const TILT = (-14 * Math.PI) / 180;
const PERIOD = 18;

function orbitPoint(a: number): [number, number] {
  const x = Math.cos(a) * RX;
  const y = Math.sin(a) * RY;
  return [C + x * Math.cos(TILT) - y * Math.sin(TILT), C + x * Math.sin(TILT) + y * Math.cos(TILT)];
}

/** Half of the tilted orbit; the front half is the lower one, drawn over the photo. */
function orbitArc(front: boolean) {
  const [x0, y0] = orbitPoint(0);
  const [x1, y1] = orbitPoint(Math.PI);
  const rot = ((TILT * 180) / Math.PI).toFixed(2);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${RX} ${RY} ${rot} 0 ${front ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function arc(r: number, bottom: boolean) {
  return bottom ? `M${C - r} ${C}A${r} ${r} 0 0 0 ${C + r} ${C}` : `M${C - r} ${C}A${r} ${r} 0 0 1 ${C + r} ${C}`;
}

/** Portrait framed as a mission patch, with a small satellite on a tilted orbit. */
export default function MissionPatch({ src, name, line }: { src: string; name: string; line: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const backRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    if (!svg || !front || !back) return;
    const place = (a: number) => {
      const [x, y] = orbitPoint(a);
      const isFront = Math.sin(a) > 0;
      front.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      back.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      front.style.opacity = isFront ? "1" : "0";
      back.style.opacity = isFront ? "0" : "1";
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      place(0.8);
      return;
    }
    let raf = 0;
    let running = false;
    const start = performance.now();
    const tick = (now: number) => {
      place(0.8 + ((now - start) / 1000 / PERIOD) * Math.PI * 2);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    place(0.8);
    io.observe(svg);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const satellite = (
    <>
      <circle r={11} fill="#ff8a3d" opacity={0.28} />
      <circle r={4.5} fill="#fff4ea" />
    </>
  );

  return (
    <svg ref={svgRef} viewBox="0 0 400 400" className="block h-auto w-full" role="img" aria-labelledby="patch-title">
      <title id="patch-title">{`Portrait of ${name}`}</title>
      <defs>
        <clipPath id="patch-photo">
          <circle cx={C} cy={C} r={149} />
        </clipPath>
        <radialGradient id="patch-vignette" cx="50%" cy="46%" r="54%">
          <stop offset="62%" stopColor="#0b1838" stopOpacity={0} />
          <stop offset="100%" stopColor="#0b1838" stopOpacity={0.6} />
        </radialGradient>
        <path id="patch-top" d={arc(165, false)} />
        <path id="patch-bottom" d={arc(181, true)} />
      </defs>

      <circle cx={C} cy={C} r={199} fill="var(--color-primary)" />
      <circle cx={C} cy={C} r={193} fill="#0b1838" />
      <g fill="#f1f0f7" fontSize={19} fontWeight={650} letterSpacing="0.2em">
        <text textAnchor="middle">
          <textPath href="#patch-top" startOffset="50%">
            {name.toUpperCase()}
          </textPath>
        </text>
        <text textAnchor="middle">
          <textPath href="#patch-bottom" startOffset="50%">
            {line.toUpperCase()}
          </textPath>
        </text>
      </g>
      <circle cx={28} cy={C} r={4} fill="#ff8a3d" />
      <circle cx={372} cy={C} r={4} fill="#ff8a3d" />

      <path d={orbitArc(false)} fill="none" stroke="#ff8a3d" strokeWidth={2} opacity={0.55} />
      <g ref={backRef}>{satellite}</g>

      <image href={src} x={16} y={47} width={345} height={345} preserveAspectRatio="xMidYMid slice" clipPath="url(#patch-photo)" />
      <circle cx={C} cy={C} r={149} fill="url(#patch-vignette)" />
      <circle cx={C} cy={C} r={150.5} fill="none" stroke="#f1f0f7" strokeWidth={3} />

      <path d={orbitArc(true)} fill="none" stroke="#ff8a3d" strokeWidth={3} strokeLinecap="round" />
      <g ref={frontRef}>{satellite}</g>
    </svg>
  );
}
