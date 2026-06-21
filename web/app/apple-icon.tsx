import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          borderRadius: 40,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
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
    ),
    { ...size },
  );
}
