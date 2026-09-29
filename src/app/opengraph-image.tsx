import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Muhammad Wadiwala: product, engineering and program work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(180deg, #0d0e13 0%, #121318 55%, #1e2a44 100%)",
          color: "#f1f0f7",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: "#b1c5ff" }}>wadiwala.net</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, lineHeight: 1, letterSpacing: -3 }}>Muhammad Wadiwala</div>
          <div style={{ fontSize: 34, marginTop: 28, color: "#c5c6d0" }}>Electrical engineering and business, Texas A&amp;M</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#c5c6d0" }}>Southwest Airlines · NASA · HHS · JPMorgan Chase · Microsoft · SpaceX</div>
        <div
          style={{
            position: "absolute",
            right: -220,
            bottom: -520,
            width: 900,
            height: 900,
            borderRadius: 9999,
            border: "2px solid rgba(177,197,255,0.5)",
            boxShadow: "0 0 90px rgba(90,130,230,0.35)",
            display: "flex",
          }}
        />
        <div style={{ position: "absolute", right: 150, top: 118, width: 18, height: 18, borderRadius: 9999, background: "#ff7a1a", display: "flex" }} />
      </div>
    ),
    { ...size },
  );
}
