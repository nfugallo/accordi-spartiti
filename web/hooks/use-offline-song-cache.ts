"use client";

import { useEffect } from "react";
import { cacheSongPageShell, cacheSongRecord } from "@/lib/offline-songs";
import type { SongDetail, SongSummary } from "@/lib/types";

export function useOfflineSongCache(
  slug: string,
  song: SongDetail,
  relatedSongs: SongSummary[],
) {
  useEffect(() => {
    cacheSongRecord(slug, song, relatedSongs);
    cacheSongPageShell(slug);
  }, [slug, song, relatedSongs]);
}
