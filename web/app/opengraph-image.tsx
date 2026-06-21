import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 88px",
          background: "#fafafa",
          color: "#111111",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "#111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
              <line x1="9" y1="8" x2="9" y2="22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              {[9, 13, 17, 21].map((y) => (
                <line
                  key={y}
                  x1="9"
                  y1={y}
                  x2="24"
                  y2={y}
                  stroke="#ffffff"
                  strokeOpacity="0.38"
                  strokeWidth="1.1"
                />
              ))}
              <circle cx="13" cy="13" r="2" fill="#ffffff" />
              <circle cx="17" cy="17" r="2" fill="#ffffff" />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
            <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {SITE_NAME}
            </div>
            <div style={{ fontSize: 30, color: "#525252", letterSpacing: "-0.01em" }}>{SITE_TAGLINE}</div>
            <div style={{ fontSize: 22, color: "#737373", lineHeight: 1.45 }}>{SITE_DESCRIPTION}</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
