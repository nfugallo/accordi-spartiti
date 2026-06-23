"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChordSheet } from "./chord-sheet";
import { PageShell } from "./page-shell";
import { SheetFeedback } from "./sheet-feedback";
import { SongPageProvider, useSongPageRequired } from "./song-page-provider";
import { SongControlsPanel } from "./song-controls-panel";
import { SongHeaderActions } from "./song-header-actions";
import { useAutoscroll } from "@/hooks/use-autoscroll";
import { useOfflineSongCache } from "@/hooks/use-offline-song-cache";
import { transposeKeyLabel } from "@/lib/chord-transpose";
import type { SongDetail, SongSummary } from "@/lib/types";

const CONTROLS_EXPANDED_KEY = "accordi-song-controls-expanded";
const CONTROLS_EXPANDED_EVENT = "accordi-song-controls-expanded-change";

function readControlsExpandedPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.matchMedia("(min-width: 640px)").matches) {
    return true;
  }
  try {
    return localStorage.getItem(CONTROLS_EXPANDED_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeControlsExpanded(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CONTROLS_EXPANDED_EVENT, onStoreChange);
  const media = window.matchMedia("(min-width: 640px)");
  media.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CONTROLS_EXPANDED_EVENT, onStoreChange);
    media.removeEventListener("change", onStoreChange);
  };
}

function useControlsExpanded() {
  const expanded = useSyncExternalStore(
    subscribeControlsExpanded,
    readControlsExpandedPreference,
    () => false,
  );

  const setExpanded = (value: boolean) => {
    try {
      localStorage.setItem(CONTROLS_EXPANDED_KEY, String(value));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CONTROLS_EXPANDED_EVENT));
  };

  return [expanded, setExpanded] as const;
}

function getAutoscrollPixelsPerSecond(speed: number): number {
  const min = 0.25;
  const max = 2;
  const clamped = Math.min(max, Math.max(min, speed));
  const progress = (clamped - min) / (max - min);
  return 5 + Math.pow(progress, 1.7) * 35;
}

function SongArtwork({ title, artist }: { title: string; artist: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ title, artist });
    fetch(`/api/artwork?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.url) {
          setUrl(data.url);
        }
      })
      .catch(() => undefined);
  }, [title, artist]);

  if (!url) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="mx-auto mb-4 size-24 rounded-xl object-cover shadow-md"
    />
  );
}

function SongBottomControls({
  expanded,
  onExpandedChange,
}: {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { settings, autoscrollPlaying } = useSongPageRequired();

  const modeLabel =
    settings.displayMode === "both" ? "Both" : settings.displayMode === "chords" ? "Chords" : "Lyrics";
  const keyLabel = `${settings.transpose > 0 ? "+" : ""}${settings.transpose}`;
  const summary = `Key ${keyLabel} · Capo ${settings.capo} · ${Math.round(settings.fontScale * 100)}% · ${modeLabel}`;

  return (
    <div className="song-bottom-bar pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3">
      <div className="pointer-events-auto w-full max-w-[23rem] rounded-3xl border border-white/25 bg-white/55 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] sm:max-w-[30rem]">
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-controls="song-controls-panel"
          className="flex w-full items-center gap-2 px-3 py-2 text-left sm:hidden"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background/60 text-[10px] text-muted-foreground">
            {expanded ? "▾" : "▴"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-foreground">
              {expanded ? "Hide controls" : "Song controls"}
            </span>
            {!expanded && (
              <span className="block truncate text-[10px] text-muted-foreground">{summary}</span>
            )}
          </span>
          {autoscrollPlaying && !expanded && (
            <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
              Scroll
            </span>
          )}
        </button>

        <div
          id="song-controls-panel"
          className={`overflow-hidden px-2 transition-[max-height,opacity,padding] duration-300 ease-out sm:block sm:max-h-none sm:opacity-100 sm:py-1.5 ${
            expanded ? "max-h-64 opacity-100 py-1.5" : "max-h-0 opacity-0 py-0 sm:max-h-none sm:opacity-100 sm:py-1.5"
          }`}
        >
          <SongControlsPanel />
        </div>
      </div>
    </div>
  );
}

function SongPageBottomSpacer({ expanded }: { expanded: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none shrink-0 sm:h-[calc(11.5rem+env(safe-area-inset-bottom))] ${
        expanded ? "h-[calc(18rem+env(safe-area-inset-bottom))]" : "h-[calc(10rem+env(safe-area-inset-bottom))]"
      }`}
    />
  );
}

function SongViewerInner({ controlsExpanded }: { controlsExpanded: boolean }) {
  const { song, relatedSongs, settings, autoscrollPlaying } = useSongPageRequired();
  useAutoscroll(autoscrollPlaying, getAutoscrollPixelsPerSecond(settings.autoscrollSpeed));
  useOfflineSongCache(song.slug, song, relatedSongs);

  const effectiveTranspose = settings.transpose - settings.capo;
  const primaryArtist = song.artists[0]?.displayName ?? "";

  const keyLabel = song.keys
    .map((key) => transposeKeyLabel(key, effectiveTranspose))
    .join(" / ");

  return (
    <PageShell className="song-page pb-8 sm:pb-12">
      <header className="mb-10 text-center sm:mb-12">
        {primaryArtist && <SongArtwork title={song.title} artist={primaryArtist} />}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{song.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {song.artists.length > 0
            ? song.artists.map((artist, index) => (
                <span key={artist.slug}>
                  {index > 0 && " · "}
                  <Link
                    href={`/artist/${artist.region}/${artist.slug}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {artist.displayName}
                  </Link>
                </span>
              ))
            : (song.region ?? "Unknown artist")}
          {keyLabel && ` · Key ${keyLabel}`}
          {settings.capo > 0 && ` · Capo ${settings.capo}`}
        </p>
        <SongHeaderActions />
      </header>

      <ChordSheet
        sections={song.sections}
        transpose={effectiveTranspose}
        displayMode={settings.displayMode}
        fontScale={settings.fontScale}
      />

      <SheetFeedback songSlug={song.slug} songTitle={song.title} sourceUrl={song.sourceUrl} />

      {relatedSongs.length > 0 && song.artists[0] && (
        <section className="mt-12 scroll-mt-8 text-center">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Altro di {song.artists[0].displayName}
          </h2>
          <ul className="space-y-2 pb-2">
            {relatedSongs.map((related) => (
              <li key={related.slug}>
                <Link
                  href={`/song/${related.slug}`}
                  className="inline-block scroll-mb-48 py-1 text-sm hover:text-muted-foreground hover:underline"
                >
                  {related.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SongPageBottomSpacer expanded={controlsExpanded} />
    </PageShell>
  );
}

function SongViewerShell() {
  const [controlsExpanded, setControlsExpanded] = useControlsExpanded();

  return (
    <>
      <SongViewerInner controlsExpanded={controlsExpanded} />
      <SongBottomControls expanded={controlsExpanded} onExpandedChange={setControlsExpanded} />
    </>
  );
}

export function SongViewer({
  song,
  relatedSongs,
}: {
  song: SongDetail;
  relatedSongs: SongSummary[];
}) {
  return (
    <SongPageProvider song={song} relatedSongs={relatedSongs}>
      <SongViewerShell />
    </SongPageProvider>
  );
}
