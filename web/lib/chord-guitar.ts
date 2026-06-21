import { parseChordToPiano } from "./chord-piano";

export type GuitarFingering = {
  frets: (number | null)[];
  baseFret: number;
  barre?: number;
};

const OPEN_SHAPES: Record<string, GuitarFingering> = {
  "0-major": { frets: [null, 3, 2, 0, 1, 0], baseFret: 1 },
  "2-major": { frets: [null, null, 0, 2, 3, 2], baseFret: 1 },
  "4-major": { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  "5-major": { frets: [1, 3, 3, 2, 1, 1], baseFret: 1, barre: 1 },
  "7-major": { frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
  "9-major": { frets: [null, 0, 2, 2, 2, 0], baseFret: 1 },
  "11-major": { frets: [1, 1, 3, 3, 3, 1], baseFret: 1, barre: 1 },

  "0-minor": { frets: [null, 3, 2, 0, 1, 0], baseFret: 1 },
  "2-minor": { frets: [null, null, 0, 2, 3, 1], baseFret: 1 },
  "4-minor": { frets: [0, 1, 2, 2, 0, 0], baseFret: 1 },
  "5-minor": { frets: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },
  "7-minor": { frets: [3, 1, 0, 0, 3, 3], baseFret: 1 },
  "9-minor": { frets: [null, 0, 2, 2, 1, 0], baseFret: 1 },
  "10-minor": { frets: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: 1 },

  "0-dom7": { frets: [null, 3, 2, 3, 1, 0], baseFret: 1 },
  "2-dom7": { frets: [null, null, 0, 2, 1, 2], baseFret: 1 },
  "4-dom7": { frets: [0, 2, 0, 2, 0, 0], baseFret: 1 },
  "5-dom7": { frets: [1, 3, 1, 2, 1, 1], baseFret: 1, barre: 1 },
  "7-dom7": { frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  "9-dom7": { frets: [null, 0, 2, 0, 2, 0], baseFret: 1 },
  "10-dom7": { frets: [1, 1, 1, 1, 1, 1], baseFret: 1, barre: 1 },
};

function qualityKey(quality: string): string {
  if (quality === "minor" || quality === "min7") return "minor";
  if (quality === "dom7" || quality === "ninth") return "dom7";
  return "major";
}

export function getGuitarFingering(chord: string): GuitarFingering | null {
  const parsed = parseChordToPiano(chord);
  if (!parsed || parsed.notes.length === 0) {
    return null;
  }

  const rootPc = parsed.notes[0] % 12;
  const key = `${rootPc}-${qualityKey(parsed.quality)}`;
  const shape = OPEN_SHAPES[key];
  if (shape) {
    return shape;
  }

  return {
    frets: [1, 3, 3, 3, 1, 1],
    baseFret: rootPc <= 5 ? rootPc + 1 : rootPc - 5,
    barre: 1,
  };
}
