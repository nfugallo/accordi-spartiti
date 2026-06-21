const SOLFEGE: Record<string, number> = {
  DO: 0,
  RE: 2,
  MI: 4,
  FA: 5,
  SOL: 7,
  LA: 9,
  SI: 11,
};

const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];

const LETTER_TO_SOLFEGE: Record<string, string> = {
  C: "DO",
  "C#": "DO#",
  Db: "REb",
  D: "RE",
  "D#": "RE#",
  Eb: "MIb",
  E: "MI",
  "E#": "MI#",
  F: "FA",
  "F#": "FA#",
  Gb: "SOLb",
  G: "SOL",
  "G#": "SOL#",
  Ab: "LAb",
  A: "LA",
  "A#": "LA#",
  Bb: "SIb",
  B: "SI",
};

export type ChordQuality =
  | "major"
  | "minor"
  | "dom7"
  | "maj7"
  | "min7"
  | "dim"
  | "aug"
  | "sus4"
  | "sus2"
  | "sixth"
  | "ninth";

export type ParsedChord = {
  label: string;
  quality: ChordQuality;
  qualityLabel: string;
  notes: number[];
  noteNames: string[];
  solfegeNames: string[];
};

function normalizeSemitone(value: number): number {
  return ((value % 12) + 12) % 12;
}

function solfegeLetterIndex(name: string): number {
  const upper = name.toUpperCase();
  if (upper.startsWith("SOL")) return 4;
  if (upper.startsWith("FA")) return 3;
  if (upper.startsWith("LA")) return 5;
  if (upper.startsWith("SI")) return 6;
  if (upper.startsWith("DO")) return 0;
  if (upper.startsWith("RE")) return 1;
  return 2;
}

export function parseNoteName(name: string): number | null {
  const match = name.trim().match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?$/i);
  if (!match) {
    return null;
  }

  const base = SOLFEGE[match[1].toUpperCase()];
  const accidental = match[2];
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return normalizeSemitone(base + offset);
}

function parseSuffix(suffix: string): { intervals: number[]; quality: ChordQuality; qualityLabel: string } {
  const s = suffix.toLowerCase();

  if (s.startsWith("m7b5") || s.includes("dim7")) {
    return { intervals: [0, 3, 6, 9], quality: "dim", qualityLabel: "half-dim 7" };
  }
  if (s.startsWith("m7+")) {
    return { intervals: [0, 3, 7, 11], quality: "maj7", qualityLabel: "min maj7" };
  }
  if (s.startsWith("m7")) {
    return { intervals: [0, 3, 7, 10], quality: "min7", qualityLabel: "minor 7" };
  }
  if (s.startsWith("maj7") || s.startsWith("M7")) {
    return { intervals: [0, 4, 7, 11], quality: "maj7", qualityLabel: "major 7" };
  }
  if (s.startsWith("7+")) {
    return { intervals: [0, 4, 7, 11], quality: "maj7", qualityLabel: "major 7" };
  }
  if (s.startsWith("dim")) {
    return { intervals: [0, 3, 6], quality: "dim", qualityLabel: "diminished" };
  }
  if (s.startsWith("aug") || (s.endsWith("+") && !s.includes("7"))) {
    return { intervals: [0, 4, 8], quality: "aug", qualityLabel: "augmented" };
  }
  if (s.startsWith("sus4") || s === "4") {
    return { intervals: [0, 5, 7], quality: "sus4", qualityLabel: "sus4" };
  }
  if (s.startsWith("sus2") || s === "2") {
    return { intervals: [0, 2, 7], quality: "sus2", qualityLabel: "sus2" };
  }
  if (s.startsWith("m6")) {
    return { intervals: [0, 3, 7, 9], quality: "sixth", qualityLabel: "minor 6" };
  }
  if (s.startsWith("m")) {
    return { intervals: [0, 3, 7], quality: "minor", qualityLabel: "minor" };
  }
  if (s.startsWith("6")) {
    return { intervals: [0, 4, 7, 9], quality: "sixth", qualityLabel: "6" };
  }
  if (s.startsWith("9")) {
    return { intervals: [0, 4, 7, 10, 14], quality: "ninth", qualityLabel: "9" };
  }
  if (s.startsWith("7")) {
    return { intervals: [0, 4, 7, 10], quality: "dom7", qualityLabel: "7" };
  }

  return { intervals: [0, 4, 7], quality: "major", qualityLabel: "major" };
}

function intervalLetterSteps(interval: number): number {
  const map: Record<number, number> = {
    0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 6, 11: 6, 14: 8,
  };
  return map[interval] ?? 0;
}

function spellFromInterval(
  rootName: string,
  rootAccidental: string | undefined,
  interval: number,
): string {
  const rootLetterIndex = solfegeLetterIndex(rootName);
  const rootPc = parseNoteName(rootName + (rootAccidental ?? ""))!;
  const targetPc = normalizeSemitone(rootPc + interval);

  if (interval === 0) {
    return (
      NOTE_LETTERS[rootLetterIndex] +
      (rootAccidental === "#" ? "#" : rootAccidental === "b" ? "b" : "")
    );
  }

  const letterIndex = (rootLetterIndex + intervalLetterSteps(interval)) % 7;
  const naturalPc = NATURAL_PCS[letterIndex];
  if (naturalPc === targetPc) {
    return NOTE_LETTERS[letterIndex];
  }
  if (normalizeSemitone(naturalPc + 1) === targetPc) {
    return `${NOTE_LETTERS[letterIndex]}#`;
  }
  if (normalizeSemitone(naturalPc - 1) === targetPc) {
    return `${NOTE_LETTERS[letterIndex]}b`;
  }

  return NOTE_LETTERS[letterIndex];
}

function parseRootParts(name: string): { rootName: string; rootAccidental: string | undefined } | null {
  const match = name.trim().match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?$/i);
  if (!match) {
    return null;
  }
  return { rootName: match[1].toUpperCase(), rootAccidental: match[2] };
}

function rootPositionVoicing(root: number, intervals: number[], bass?: number): number[] {
  const notes = intervals.map((interval) => 60 + root + interval);

  if (bass !== undefined && bass !== root) {
    notes.unshift(48 + bass);
  }

  return [...new Set(notes)].sort((a, b) => a - b);
}

export function parseChordToPiano(chord: string): ParsedChord | null {
  const trimmed = chord.trim();
  if (!trimmed) {
    return null;
  }

  const slashIndex = trimmed.indexOf("/");
  const mainPart = slashIndex === -1 ? trimmed : trimmed.slice(0, slashIndex);
  const bassPart = slashIndex === -1 ? undefined : trimmed.slice(slashIndex + 1);
  const bass = bassPart ? parseNoteName(bassPart) : undefined;

  const rootMatch = mainPart.match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?(.*)$/i);
  if (!rootMatch) {
    return null;
  }

  const rootName = rootMatch[1].toUpperCase();
  const rootAccidental = rootMatch[2];
  const root = parseNoteName(rootName + (rootAccidental ?? ""));
  if (root === null) {
    return null;
  }

  const { intervals, quality, qualityLabel } = parseSuffix(rootMatch[3] ?? "");
  const notes = rootPositionVoicing(root, intervals, bass ?? undefined);

  const noteNames: string[] = [];
  const solfegeNames: string[] = [];

  if (bass !== undefined && bass !== root && bassPart) {
    const bassRoot = parseRootParts(bassPart);
    if (bassRoot) {
      const bassName = spellFromInterval(bassRoot.rootName, bassRoot.rootAccidental, 0);
      noteNames.push(bassName);
      solfegeNames.push(LETTER_TO_SOLFEGE[bassName] ?? bassName);
    }
  }

  for (const interval of intervals) {
    const name = spellFromInterval(rootName, rootAccidental, interval);
    noteNames.push(name);
    solfegeNames.push(LETTER_TO_SOLFEGE[name] ?? name);
  }

  return {
    label: trimmed,
    quality,
    qualityLabel,
    notes,
    noteNames,
    solfegeNames,
  };
}

export function midiToKeyboardRange(notes: number[]): { start: number; end: number } {
  if (notes.length === 0) {
    return { start: 60, end: 72 };
  }

  const min = Math.min(...notes);
  const max = Math.max(...notes);
  let start = Math.floor(min / 12) * 12;
  let end = Math.ceil((max + 1) / 12) * 12;

  if (end - start < 12) {
    start = Math.floor(((min + max) / 2) / 12) * 12;
    end = start + 12;
  }

  return {
    start: Math.max(48, start - 1),
    end: Math.min(84, end + 1),
  };
}
