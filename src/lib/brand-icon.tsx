import { ImageResponse } from "next/og";

/**
 * Erzeugt das App-Icon als PNG (für Home-Bildschirm, Manifest, Apple Touch Icon).
 * So brauchen wir keine Binärdateien im Repository.
 */
export function renderBrandIcon(size: number) {
  const ring = (ratio: number, width: number, opacity: number) => ({
    position: "absolute" as const,
    width: size * ratio,
    height: size * ratio,
    borderRadius: "50%",
    border: `${Math.max(1, size * width)}px solid rgba(56, 225, 255, ${opacity})`,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 45%, #0d2236 0%, #05080f 70%)",
          position: "relative",
        }}
      >
        <div style={ring(0.7, 0.018, 0.35)} />
        <div style={ring(0.54, 0.03, 0.75)} />
        <div
          style={{
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: "50%",
            background: "radial-gradient(circle, #ffffff 0%, #38e1ff 45%, rgba(56,225,255,0) 75%)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
