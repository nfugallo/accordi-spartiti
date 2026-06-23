import { cacheSongPageShell, cacheSongRecord } from "./offline-songs";
import type { SongDetail, SongSummary } from "./types";

export async function prefetchSongForOffline(slug: string): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const response = await fetch(`/api/song/${slug}`, { credentials: "same-origin" });
  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as {
    song: SongDetail;
    relatedSongs: SongSummary[];
  };

  await cacheSongRecord(slug, payload.song, payload.relatedSongs);
  await cacheSongPageShell(slug);
  return true;
}

export async function prefetchFavoriteSongs(slugs: string[]): Promise<void> {
  const unique = [...new Set(slugs)].slice(0, 32);
  await Promise.all(unique.map((slug) => prefetchSongForOffline(slug)));
}
