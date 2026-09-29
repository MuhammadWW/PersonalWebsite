"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DemoId } from "@/content/projects";

function Loading() {
  return <div className="demo-frame grid min-h-[320px] place-items-center label muted">Loading demo…</div>;
}

const demos: Record<DemoId, ComponentType> = {
  doorfit: dynamic(() => import("./demos/DoorFit"), { ssr: false, loading: Loading }),
  reflection: dynamic(() => import("./demos/ReflectionDemo"), { ssr: false, loading: Loading }),
  watermark: dynamic(() => import("./demos/WatermarkDetector"), { ssr: false, loading: Loading }),
  landing: dynamic(() => import("./demos/LandingSim"), { ssr: false, loading: Loading }),
  voice: dynamic(() => import("./demos/VoiceLesson"), { ssr: false, loading: Loading }),
  parts: dynamic(() => import("./demos/PartPicker"), { ssr: false, loading: Loading }),
};

export default function DemoSlot({ id }: { id: DemoId }) {
  const Demo = demos[id];
  return <Demo />;
}
