type BrandMarkProps = {
  size?: number;
  className?: string;
};

/** Minimal chord frame: nut, four strings, two finger dots. */
const STRINGS_Y = [9, 13, 17, 21] as const;
const FINGER_DOTS = [
  { cx: 13, cy: 13 },
  { cx: 17, cy: 17 },
] as const;

export function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <line
        x1="9"
        y1="8"
        x2="9"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-background"
      />
      {STRINGS_Y.map((y) => (
        <line
          key={y}
          x1="9"
          y1={y}
          x2="24"
          y2={y}
          stroke="currentColor"
          strokeWidth="1.1"
          className="text-background/40"
        />
      ))}
      {FINGER_DOTS.map((dot) => (
        <circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r="2"
          className="fill-background"
        />
      ))}
    </svg>
  );
}

export function BrandMarkSvg({ width = 56, height = 56 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#111111" />
      <line x1="9" y1="8" x2="9" y2="22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      {STRINGS_Y.map((y) => (
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
      {FINGER_DOTS.map((dot) => (
        <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r="2" fill="#ffffff" />
      ))}
    </svg>
  );
}

export { STRINGS_Y, FINGER_DOTS };
