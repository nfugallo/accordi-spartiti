const CHORD_BODY =
  /(?:DO|RE|MI|FA|SOL|LA|SI)(?:b|#)?(?:\d+[+\-]?)?(?:m?(?:aug|dim|add|b|#)?(?:\d+[+\-]?)?(?:\/?\d+[+\-]?)?)?(?:\/(?:DO|RE|MI|FA|SOL|LA|SI)(?:b|#)*)?/g;

export type ChordSegment = {
  text: string;
  isChord: boolean;
};

export function parseChordLine(line: string): ChordSegment[] {
  if (!line.trim()) {
    return [{ text: "\u00a0", isChord: false }];
  }

  const segments: ChordSegment[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(CHORD_BODY)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, index), isChord: false });
    }
    segments.push({ text: match[0], isChord: true });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), isChord: false });
  }

  return segments.length > 0 ? segments : [{ text: line, isChord: false }];
}
