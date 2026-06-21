export type ChordInstrument = "piano" | "guitar";

const STORAGE_KEY = "accordi-chord-instrument";

export function readChordInstrument(): ChordInstrument {
  if (typeof window === "undefined") {
    return "piano";
  }
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "guitar" ? "guitar" : "piano";
  } catch {
    return "piano";
  }
}

export function writeChordInstrument(instrument: ChordInstrument): void {
  localStorage.setItem(STORAGE_KEY, instrument);
}
