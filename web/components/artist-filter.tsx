"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArtistSummary } from "@/lib/types";

export function ArtistFilter({
  artists,
  region,
  regionLabel,
}: {
  artists: ArtistSummary[];
  region: string;
  regionLabel: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return artists;
    }
    return artists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(q) ||
        artist.displayName.toLowerCase().includes(q),
    );
  }, [artists, query]);

  return (
    <div>
      <div className="relative mb-6">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${regionLabel.toLowerCase()} artists...`}
          className="w-full border-b border-border bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <p className="mb-4 text-center text-xs text-muted-foreground">
        {filtered.length} of {artists.length} artists
      </p>

      <ul className="divide-y divide-border">
        {filtered.map((artist) => (
          <li key={artist.slug}>
            <Link
              href={`/artist/${region}/${artist.slug}`}
              className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-muted-foreground"
            >
              <span>{artist.displayName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {artist.songCount} {artist.songCount === 1 ? "song" : "songs"}
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">No artists match</li>
        )}
      </ul>
    </div>
  );
}
