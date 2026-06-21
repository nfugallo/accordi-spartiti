import type { GuitarFingering } from "@/lib/chord-guitar";

const STRING_X = [10, 26, 42, 58, 74, 90];
const FRET_COUNT = 4;

export function GuitarDiagram({ fingering }: { fingering: GuitarFingering }) {
  const { frets, baseFret, barre } = fingering;
  const height = 88;
  const fretHeight = 16;

  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-24 w-full max-w-[9rem]" aria-hidden>
      {baseFret > 1 && (
        <text x="4" y="14" className="fill-muted-foreground text-[8px]">
          {baseFret}
        </text>
      )}
      {Array.from({ length: FRET_COUNT + 1 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1="8"
          y1={12 + i * fretHeight}
          x2="92"
          y2={12 + i * fretHeight}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth="1"
        />
      ))}
      {STRING_X.map((x) => (
        <line
          key={`string-${x}`}
          x1={x}
          y1="12"
          x2={x}
          y2={12 + FRET_COUNT * fretHeight}
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth="1"
        />
      ))}
      {barre !== undefined && (
        <rect
          x={STRING_X[0] - 6}
          y={12 + (barre - 0.5) * fretHeight - 4}
          width={STRING_X[5] - STRING_X[0] + 12}
          height="8"
          rx="4"
          className="fill-foreground/80"
        />
      )}
      {frets.map((fret, stringIndex) => {
        if (fret === null) {
          return (
            <circle
              key={`open-${stringIndex}`}
              cx={STRING_X[stringIndex]}
              cy="8"
              r="3"
              className="fill-none stroke-foreground"
              strokeWidth="1.2"
            />
          );
        }
        if (barre !== undefined && fret === barre) {
          return null;
        }
        return (
          <circle
            key={`dot-${stringIndex}`}
            cx={STRING_X[stringIndex]}
            cy={12 + (fret - 0.5) * fretHeight}
            r="4.5"
            className="fill-indigo-500"
          />
        );
      })}
    </svg>
  );
}
