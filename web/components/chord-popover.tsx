"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getGuitarFingering } from "@/lib/chord-guitar";
import {
  readChordInstrument,
  writeChordInstrument,
  type ChordInstrument,
} from "@/lib/chord-instrument-preference";
import { midiToKeyboardRange, parseChordToPiano } from "@/lib/chord-piano";
import { GuitarDiagram } from "./guitar-diagram";

const WHITE_KEY_HEIGHT = 52;
const BLACK_KEY_HEIGHT = 32;
const FADE_MS = 280;
const HOVER_CLOSE_MS = 200;
const POPOVER_MAX_WIDTH = 320;
const POPOVER_SIDE_MARGIN = 20;
const ANCHOR_GAP = 14;

type Tab = ChordInstrument;

function useHoverCapable() {
  const [hoverCapable, setHoverCapable] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverCapable(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return hoverCapable;
}

function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

function PianoKeyboard({ notes }: { notes: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ whiteKeyWidth: 20, pianoWidth: 140 });
  const active = new Set(notes);
  const { start, end } = midiToKeyboardRange(notes);

  const whiteKeys: number[] = [];
  for (let midi = start; midi < end; midi++) {
    if (!isBlackKey(midi)) {
      whiteKeys.push(midi);
    }
  }

  const blackKeyWidth = Math.max(7, Math.round(layout.whiteKeyWidth * 0.55));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || whiteKeys.length === 0) {
      return;
    }

    const resize = () => {
      const available = container.clientWidth;
      const keyWidth = Math.min(24, Math.max(14, Math.floor(available / whiteKeys.length)));
      setLayout({
        whiteKeyWidth: keyWidth,
        pianoWidth: keyWidth * whiteKeys.length,
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [whiteKeys.length, start, end]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-xl bg-muted/35 px-3 py-2.5">
      <div
        className="relative mx-auto"
        style={{ width: layout.pianoWidth, height: WHITE_KEY_HEIGHT }}
      >
        {whiteKeys.map((midi, index) => {
          const pressed = active.has(midi);
          return (
            <div
              key={midi}
              className={`absolute top-0 rounded-b-md border shadow-sm transition-colors ${
                pressed
                  ? "border-indigo-400/60 bg-indigo-100 dark:border-indigo-400/40 dark:bg-indigo-500/30"
                  : "border-border/50 bg-background"
              }`}
              style={{
                left: index * layout.whiteKeyWidth,
                width: layout.whiteKeyWidth,
                height: WHITE_KEY_HEIGHT,
              }}
            />
          );
        })}
        {Array.from({ length: end - start }, (_, offset) => start + offset)
          .filter(isBlackKey)
          .map((midi) => {
            const whiteIndexBefore = Array.from(
              { length: midi - start },
              (_, i) => start + i,
            ).filter((n) => !isBlackKey(n)).length;
            const pressed = active.has(midi);
            return (
              <div
                key={midi}
                className={`absolute top-0 z-10 rounded-b-md border transition-all ${
                  pressed
                    ? "border-indigo-300 bg-indigo-500 shadow-md shadow-indigo-500/40 dark:bg-indigo-400"
                    : "border-foreground/20 bg-foreground/85"
                }`}
                style={{
                  left: whiteIndexBefore * layout.whiteKeyWidth - blackKeyWidth / 2,
                  width: blackKeyWidth,
                  height: BLACK_KEY_HEIGHT,
                }}
              />
            );
          })}
      </div>
    </div>
  );
}

type PopoverStyle = {
  left: number;
  top: number;
  placement: "above" | "below";
};

export function ChordPopover({ chord }: { chord: string }) {
  const parsed = parseChordToPiano(chord);
  const guitar = getGuitarFingering(chord);
  const hoverCapable = useHoverCapable();
  const [tab, setTab] = useState<Tab>(() => readChordInstrument());
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<PopoverStyle | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const showGenerationRef = useRef(0);
  const hasOpenedRef = useRef(false);

  const open = hovering || pinned;

  const cancelHoverClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    cancelHoverClose();
    closeTimerRef.current = window.setTimeout(() => {
      setHovering(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_MS);
  }, [cancelHoverClose]);

  const show = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    const generation = ++showGenerationRef.current;
    setVisible(true);
    requestAnimationFrame(() => {
      if (showGenerationRef.current === generation) {
        setShown(true);
      }
    });
  }, []);

  const hide = useCallback(() => {
    showGenerationRef.current += 1;
    setShown(false);
    fadeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      fadeTimerRef.current = null;
    }, FADE_MS);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
    const popoverWidth = Math.min(viewportWidth - POPOVER_SIDE_MARGIN * 2, POPOVER_MAX_WIDTH);
    const minLeft = viewportLeft + POPOVER_SIDE_MARGIN + popoverWidth / 2;
    const maxLeft = viewportLeft + viewportWidth - POPOVER_SIDE_MARGIN - popoverWidth / 2;
    const anchorCenter = rect.left + rect.width / 2;
    const above = rect.top > 200;
    setPopoverStyle({
      left: Math.min(Math.max(anchorCenter, minLeft), maxLeft),
      top: above ? rect.top - ANCHOR_GAP : rect.bottom + ANCHOR_GAP,
      placement: above ? "above" : "below",
    });
  }, []);

  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      updatePosition();
      show();
      return;
    }
    if (hasOpenedRef.current) {
      hide();
    }
  }, [open, show, hide, updatePosition]);

  useEffect(() => {
    if (!pinned) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setPinned(false);
      setHovering(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    updatePosition();
    const onScroll = () => {
      if (!pinned) {
        setHovering(false);
      }
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [visible, pinned, updatePosition]);

  if (!parsed) {
    return <span className="font-semibold text-muted-foreground">{chord}</span>;
  }

  const tooltipTransform =
    popoverStyle?.placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)";

  return (
    <>
      <span
        ref={anchorRef}
        className="inline"
        onMouseEnter={() => {
          if (!hoverCapable) {
            return;
          }
          cancelHoverClose();
          updatePosition();
          setHovering(true);
        }}
        onMouseLeave={() => {
          if (!hoverCapable || pinned) {
            return;
          }
          scheduleHoverClose();
        }}
      >
        <button
          type="button"
          className={`touch-manipulation cursor-help font-semibold underline decoration-dotted underline-offset-[3px] transition-colors ${
            open
              ? "text-foreground decoration-indigo-400/70"
              : "text-muted-foreground decoration-muted-foreground/40 hover:text-foreground"
          }`}
          onClick={() => {
            updatePosition();
            setPinned((current) => {
              if (current) {
                setHovering(false);
                return false;
              }
              cancelHoverClose();
              return true;
            });
          }}
          aria-expanded={open}
          aria-label={`${chord} chord diagram`}
        >
          {chord}
        </button>
      </span>

      {visible &&
        popoverStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              left: popoverStyle.left,
              top: popoverStyle.top,
              transform: tooltipTransform,
              zIndex: 60,
              pointerEvents: shown ? "auto" : "none",
              paddingTop: popoverStyle.placement === "below" ? ANCHOR_GAP : 0,
              paddingBottom: popoverStyle.placement === "above" ? ANCHOR_GAP : 0,
            }}
            onMouseEnter={() => {
              if (!hoverCapable) {
                return;
              }
              cancelHoverClose();
              setHovering(true);
            }}
            onMouseLeave={() => {
              if (!hoverCapable || pinned) {
                return;
              }
              scheduleHoverClose();
            }}
          >
            <div
              role="tooltip"
              className={`chord-tooltip max-h-[min(70dvh,32rem)] w-[min(calc(100vw-2.5rem),20rem)] overflow-y-auto rounded-2xl border border-white/30 bg-white/85 px-4 py-4 shadow-xl shadow-black/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-neutral-900/85 dark:shadow-black/50 ${
                shown
                  ? "chord-tooltip-visible"
                  : popoverStyle.placement === "above"
                    ? "chord-tooltip-hidden-above"
                    : "chord-tooltip-hidden-below"
              }`}
            >
              <div className="mb-3 text-center">
                <p className="font-mono text-base font-semibold tracking-tight">{parsed.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parsed.qualityLabel} · root position
                </p>
              </div>

              <div className="mb-3 flex justify-center gap-1 rounded-full bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setTab("piano");
                    writeChordInstrument("piano");
                  }}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    tab === "piano" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Piano
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("guitar");
                    writeChordInstrument("guitar");
                  }}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    tab === "guitar" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Guitar
                </button>
              </div>

              {tab === "piano" ? (
                <PianoKeyboard notes={parsed.notes} />
              ) : guitar ? (
                <GuitarDiagram fingering={guitar} />
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">No guitar shape</p>
              )}

              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {parsed.noteNames.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="min-w-[3.75rem] rounded-lg bg-muted/50 px-2.5 py-1 text-center"
                  >
                    <p className="text-sm font-medium">{name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {parsed.solfegeNames[index]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
