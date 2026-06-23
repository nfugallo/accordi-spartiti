"use client";

import { useEffect, useRef, useState } from "react";
import { parseChordLine } from "@/lib/chord-line";
import { transposeChordLine, transposeKeyLabel } from "@/lib/chord-transpose";
import type { DisplayMode, SongSection } from "@/lib/types";
import { ChordHover } from "./chord-hover";

function ChordLineRow({ rawLine, transpose }: { rawLine: string; transpose: number }) {
  const line = transpose === 0 ? rawLine : transposeChordLine(rawLine, transpose);
  const segments = parseChordLine(line);

  return (
    <div className="min-h-[1.35em] whitespace-pre font-mono text-[0.76em] leading-relaxed sm:text-[0.875em]">
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
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) {
      return;
    }

    const resize = () => {
      const availableWidth = outer.clientWidth;
      const contentWidth = inner.scrollWidth;
      const nextScale =
        availableWidth > 0 && contentWidth > availableWidth ? availableWidth / contentWidth : 1;

      setFit({
        scale: nextScale,
        height: inner.offsetHeight * nextScale,
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={outerRef}
      className="mx-auto w-full overflow-visible"
      style={{ height: fit.height || undefined }}
    >
      <div
        ref={innerRef}
        className="mx-auto w-fit max-w-none origin-top space-y-1 text-left"
        style={{
          transform: `scale(${fit.scale})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
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
    <div className="space-y-10 px-1 sm:px-0" style={{ fontSize: `${fontScale}rem` }}>
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
                    <div
                      key={key}
                      className="whitespace-pre font-mono text-[0.76em] leading-relaxed sm:text-[0.875em]"
                    >
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
                      <div className="whitespace-pre font-mono text-[0.76em] leading-relaxed sm:text-[0.875em]">
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
