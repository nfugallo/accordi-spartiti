import { transposeChordLine } from "./chord-transpose";
import type { SongDetail, SongSection } from "./types";

function sectionsToText(sections: SongSection[], transpose: number): string {
  const lines: string[] = [];

  for (const section of sections) {
    if (sections.length > 1) {
      lines.push(`[Key ${section.keySignature}]`);
    }
    for (const stanza of section.stanzas) {
      for (const chordLine of stanza.chordLines) {
        lines.push(transposeChordLine(chordLine.rawLine, transpose));
      }
      if (stanza.lyric) {
        lines.push(stanza.lyric);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}

export function exportSongAsText(song: SongDetail, transpose: number): string {
  const artistLine =
    song.artists.length > 0
      ? song.artists.map((a) => a.displayName).join(" · ")
      : (song.region ?? "Unknown artist");
  const keys = [...new Set(song.keys)];

  const header = [
    song.title,
    artistLine,
    keys.length > 0 ? `Key: ${keys.join(" / ")}` : null,
    transpose !== 0 ? `Transpose: ${transpose > 0 ? "+" : ""}${transpose}` : null,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n${sectionsToText(song.sections, transpose)}`;
}
