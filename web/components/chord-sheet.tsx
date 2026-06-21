"use client";

import { parseChordLine } from "@/lib/chord-line";
import { transposeChordLine, transposeKeyLabel } from "@/lib/chord-transpose";
import type { DisplayMode, SongSection } from "@/lib/types";
import { ChordHover } from "./chord-hover";

function ChordLineRow({ rawLine, transpose }: { rawLine: string; transpose: number }) {
  const line = transpose === 0 ? rawLine : transposeChordLine(rawLine, transpose);
  const segments = parseChordLine(line);

  return (
    <div className="min-h-[1.35em] whitespace-pre font-mono text-sm leading-relaxed">
      {segments.map((segment, index) =>
        segment.isChord ? (
          <ChordHover key={index} chord={segment.text.trim()} />
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  );
}

function SheetBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-fit max-w-full">
      <div className="space-y-1 text-left">{children}</div>
    </div>
  );
}

export function ChordSheet({
  sections,
  transpose = 0,
  displayMode = "both",
  fontScale = 1,
}: {
  sections: SongSection[];
  transpose?: number;
  displayMode?: DisplayMode;
  fontScale?: number;
}) {
  const showChords = displayMode !== "lyrics";
  const showLyrics = displayMode !== "chords";

  return (
    <div className="space-y-10" style={{ fontSize: `${fontScale}rem` }}>
      {sections.map((section) => (
        <section key={section.sectionIndex}>
          {sections.length > 1 && showChords && (
            <p className="mb-4 text-center text-xs uppercase tracking-widest text-muted-foreground">
              Key {transpose === 0 ? section.keySignature : transposeKeyLabel(section.keySignature, transpose)}
            </p>
          )}
          <div className="overflow-x-auto">
            <SheetBlock>
              {section.stanzas.map((stanza) => {
                const key = `${stanza.sectionIndex}-${stanza.stanzaIndex}`;

                if (stanza.stanzaType === "lyric_only") {
                  if (!showLyrics) {
                    return null;
                  }
                  return (
                    <div key={key} className="whitespace-pre font-mono text-sm leading-relaxed">
                      {stanza.lyric}
                    </div>
                  );
                }

                if (stanza.stanzaType === "chords_only") {
                  if (!showChords) {
                    return null;
                  }
                  return (
                    <div key={key} className="space-y-0">
                      {stanza.chordLines.map((line) => (
                        <ChordLineRow
                          key={line.lineIndex}
                          rawLine={line.rawLine}
                          transpose={transpose}
                        />
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={key} className="space-y-0">
                    {showChords &&
                      stanza.chordLines.map((line) => (
                        <ChordLineRow
                          key={line.lineIndex}
                          rawLine={line.rawLine}
                          transpose={transpose}
                        />
                      ))}
                    {showLyrics && stanza.lyric && (
                      <div className="whitespace-pre font-mono text-sm leading-relaxed">
                        {stanza.lyric}
                      </div>
                    )}
                  </div>
                );
              })}
            </SheetBlock>
          </div>
        </section>
      ))}
    </div>
  );
}
