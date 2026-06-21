import { parseNoteName } from "./chord-piano";

const CHORD_TOKEN =
  /(?:DO|RE|MI|FA|SOL|LA|SI)(?:b|#)?(?:\d+[+\-]?)?(?:m?(?:aug|dim|add|b|#)?(?:\d+[+\-]?)?(?:\/?\d+[+\-]?)?)?(?:\/(?:DO|RE|MI|FA|SOL|LA|SI)(?:b|#)*)?/gi;

const SHARP_SOLFEGE = ["DO", "DO#", "RE", "RE#", "MI", "FA", "FA#", "SOL", "SOL#", "LA", "LA#", "SI"];

function normalizeSemitone(value: number): number {
  return ((value % 12) + 12) % 12;
}

function pitchClassToSolfege(pitchClass: number): string {
  return SHARP_SOLFEGE[normalizeSemitone(pitchClass)];
}

function transposeNoteToken(token: string, semitones: number): string {
  const rootMatch = token.match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?/i);
  if (!rootMatch) {
    return token;
  }

  const rootName = rootMatch[1].toUpperCase();
  const accidental = rootMatch[2] ?? "";
  const rootPc = parseNoteName(rootName + accidental);
  if (rootPc === null) {
    return token;
  }

  const newRoot = pitchClassToSolfege(rootPc + semitones);
  return token.replace(/^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?/i, newRoot);
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) {
    return chord;
  }

  const slashIndex = chord.indexOf("/");
  if (slashIndex === -1) {
    return transposeNoteToken(chord, semitones);
  }

  const main = chord.slice(0, slashIndex);
  const bass = chord.slice(slashIndex + 1);
  return `${transposeNoteToken(main, semitones)}/${transposeNoteToken(bass, semitones)}`;
}

export function transposeChordLine(line: string, semitones: number): string {
  if (semitones === 0) {
    return line;
  }

  return line.replace(CHORD_TOKEN, (match) => transposeChord(match, semitones));
}

export function transposeKeyLabel(key: string, semitones: number): string {
  if (semitones === 0) {
    return key;
  }
  return transposeNoteToken(key.trim(), semitones);
}
