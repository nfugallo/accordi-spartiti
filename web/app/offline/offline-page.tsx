"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { listCachedSongRecords, type CachedSongRecord } from "@/lib/offline-songs";

export default function OfflinePageClient() {
  const [songs, setSongs] = useState<CachedSongRecord[]>([]);

  useEffect(() => {
    listCachedSongRecords().then(setSongs);
  }, []);

  return (
    <PageShell className="min-h-[calc(100dvh-8rem)]">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Saved offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Songs cached on this device stay available without a connection.
        </p>
      </header>

      {songs.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground">
          <p>No offline songs yet.</p>
          <p className="mt-2">Open a song while online, or save it to favorites.</p>
          <Link href="/explore" className="mt-6 inline-block underline hover:text-foreground">
            Explore songs
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {songs.map((record) => (
            <li key={record.slug} className="py-3">
              <Link href={`/song/${record.slug}`} className="block hover:underline">
                <p className="text-sm font-medium">{record.song.title}</p>
                <p className="text-xs text-muted-foreground">
                  {record.song.artists[0]?.displayName ?? "Unknown artist"}
                  {" · "}
                  cached {new Date(record.cachedAt).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
