"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useFavorites } from "@/components/favorites-provider";
import { isSongCachedOffline } from "@/lib/offline-songs";

function OfflineSongBadge({ slug }: { slug: string }) {
  const [cached, setCached] = useState(false);

  useEffect(() => {
    isSongCachedOffline(slug).then(setCached);
  }, [slug]);

  if (!cached) {
    return null;
  }

  return <span className="text-[10px] text-muted-foreground"> · offline</span>;
}

export default function FavoritesPageClient() {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <PageShell>
      <header className="mb-8 text-center sm:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Favorites</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved songs and artists ·{" "}
          <Link href="/offline" className="underline underline-offset-2 hover:text-foreground">
            offline library
          </Link>
        </p>
      </header>

      {favorites.length === 0 ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No favorites yet.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/explore"
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
            >
              Explore music
            </Link>
            <Link href="/random" className="text-sm text-muted-foreground underline hover:text-foreground">
              Random song
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {favorites.map((item) => (
            <li key={item.href} className="flex items-center justify-between gap-4 py-3">
              <Link href={item.href} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {item.type}
                  {item.type === "song" && <OfflineSongBadge slug={item.slug} />}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => toggleFavorite(item)}
                className="text-sm text-muted-foreground hover:text-foreground"
                aria-label="Remove favorite"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
