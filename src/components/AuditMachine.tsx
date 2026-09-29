"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const AgenticFactory3D = dynamic(() => import("./ui/agentic-factory-3d"), { ssr: false });

export default function AuditMachine() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-[560px] overflow-hidden rounded-[28px] bg-[#0d0e13] md:h-[680px]">
      {near ? <AgenticFactory3D height="100%" /> : null}
    </div>
  );
}
