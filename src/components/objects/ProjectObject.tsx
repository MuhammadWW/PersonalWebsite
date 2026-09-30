"use client";

import { useEffect, useRef } from "react";
import type { ObjectProject } from "./slugs";

export default function ProjectObject({ slug, label }: { slug: ObjectProject; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let visible = false;
    let stage: { resize(): void; setActive(a: boolean): void; dispose(): void } | null = null;
    const ro = new ResizeObserver(() => stage?.resize());
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !stage) load();
        stage?.setActive(visible);
      },
      { rootMargin: "200px" },
    );
    const load = () => {
      import("./stage")
        .then(({ createStage }) => {
          if (disposed || stage) return;
          stage = createStage(host, slug, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
          stage.setActive(visible);
          ro.observe(host);
        })
        .catch((err) => console.warn("3D object unavailable:", err));
    };
    io.observe(host);
    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      stage?.dispose();
    };
  }, [slug]);

  return (
    <div className="pobj" data-capture="object">
      <div ref={hostRef} className="pobj-host" role="img" aria-label={label} />
      <p className="pobj-hint" aria-hidden="true">
        Drag to turn
      </p>
    </div>
  );
}
