"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChordSheet } from "./chord-sheet";
import { PageShell } from "./page-shell";
import { SongPageProvider, useSongPageRequired } from "./song-page-provider";
import { SongControlsPanel } from "./song-controls-panel";
import { SongHeaderActions } from "./song-header-actions";
import { useAutoscroll } from "@/hooks/use-autoscroll";
import { transposeKeyLabel } from "@/lib/chord-transpose";
import type { SongDetail, SongSummary } from "@/lib/types";

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

function SongBottomControls() {
  return (
    <div className="song-bottom-bar pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
      <div className="pointer-events-auto max-w-[min(100%,28rem)] rounded-full border border-white/25 bg-white/50 px-2 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <SongControlsPanel />
      </div>
    </div>
  );
}

function SongViewerInner() {
  const { song, relatedSongs, settings, autoscrollPlaying } = useSongPageRequired();
  useAutoscroll(autoscrollPlaying, settings.autoscrollSpeed * 0.6);

  const effectiveTranspose = settings.transpose - settings.capo;
  const primaryArtist = song.artists[0]?.displayName ?? "";

  const keyLabel = song.keys
    .map((key) => transposeKeyLabel(key, effectiveTranspose))
    .join(" / ");

  return (
    <PageShell className="song-page pb-36">
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

      {relatedSongs.length > 0 && song.artists[0] && (
        <section className="mt-12 text-center">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Altro di {song.artists[0].displayName}
          </h2>
          <ul className="space-y-2">
            {relatedSongs.map((related) => (
              <li key={related.slug}>
                <Link
                  href={`/song/${related.slug}`}
                  className="text-sm hover:text-muted-foreground hover:underline"
                >
                  {related.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
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
      <SongViewerInner />
      <SongBottomControls />
    </SongPageProvider>
  );
}
