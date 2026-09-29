"use client";

import dynamic from "next/dynamic";

const WatermarkDetector = dynamic(() => import("./demos/WatermarkDetector"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0e1116]" />,
});

export default function WatermarkShowcase() {
  return <WatermarkDetector variant="showcase" />;
}
