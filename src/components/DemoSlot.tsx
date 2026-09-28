"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DemoId } from "@/content/projects";

function Loading() {
  return <div className="demo-frame grid min-h-[320px] place-items-center label muted">Loading demo…</div>;
}

const demos: Record<DemoId, ComponentType> = {
  audit: dynamic(() => import("./demos/AuditWizard"), { ssr: false, loading: Loading }),
  exports: dynamic(() => import("./demos/ExportExplainer"), { ssr: false, loading: Loading }),
  logs: dynamic(() => import("./demos/LogExplorer"), { ssr: false, loading: Loading }),
  doorfit: dynamic(() => import("./demos/DoorFit"), { ssr: false, loading: Loading }),
  mentor: dynamic(() => import("./demos/MentorMatch"), { ssr: false, loading: Loading }),
  reflection: dynamic(() => import("./demos/ReflectionDemo"), { ssr: false, loading: Loading }),
  watermark: dynamic(() => import("./demos/WatermarkLab"), { ssr: false, loading: Loading }),
  landing: dynamic(() => import("./demos/LandingSim"), { ssr: false, loading: Loading }),
  voice: dynamic(() => import("./demos/VoiceLesson"), { ssr: false, loading: Loading }),
  parts: dynamic(() => import("./demos/PartPicker"), { ssr: false, loading: Loading }),
};

export default function DemoSlot({ id }: { id: DemoId }) {
  const Demo = demos[id];
  return <Demo />;
}
