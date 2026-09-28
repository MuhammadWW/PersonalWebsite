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
          background: "linear-gradient(180deg, #0b0f16 0%, #14202f 62%, #3b4a5c 100%)",
          color: "#f4f2ed",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.75 }}>wadiwala.net</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 34, opacity: 0.85 }}>Hey, I&apos;m</div>
          <div style={{ fontSize: 112, lineHeight: 1, letterSpacing: -3 }}>Muhammad Wadiwala</div>
          <div style={{ fontSize: 34, marginTop: 28, opacity: 0.85 }}>I turn messy problems into products people trust.</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}>
          NASA · JPMorgan Chase · Microsoft · SpaceX
        </div>
        <div
          style={{
            position: "absolute",
            right: -220,
            bottom: -520,
            width: 900,
            height: 900,
            borderRadius: 9999,
            border: "2px solid rgba(255,190,140,0.55)",
            boxShadow: "0 0 80px rgba(255,150,90,0.35)",
            display: "flex",
          }}
        />
        <div style={{ position: "absolute", right: 150, top: 118, width: 18, height: 18, borderRadius: 9999, background: "#c44b22", display: "flex" }} />
      </div>
    ),
    { ...size },
  );
}
