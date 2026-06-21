"use client";

import { Command } from "cmdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFavorites } from "./favorites-provider";
import { useSearch } from "./search-provider";
import type { SearchResult } from "@/lib/types";

export function CommandMenu() {
  const router = useRouter();
  const { open, closeSearch, toggleSearch } = useSearch();
  const { favorites } = useFavorites();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSearch();
      }
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleSearch, closeSearch]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as SearchResult[];
        setResults(data);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      closeSearch();
      router.push(href);
    },
    [router, closeSearch],
  );

  if (!open) {
    return null;
  }

  const recentFavorites = favorites.slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-4 pt-[12vh] backdrop-blur-md sm:pt-[15vh]"
      onClick={closeSearch}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <Command label="Search songs and artists" shouldFilter={false}>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search songs or artists..."
            className="w-full border-b border-border bg-transparent px-4 py-4 text-base outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <Command.List className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
            {loading && (
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                Searching...
              </Command.Empty>
            )}
            {!loading && query.trim() && results.length === 0 && (
              <Command.Empty className="space-y-3 px-3 py-8 text-center text-sm text-muted-foreground">
                <p>No results for &ldquo;{query}&rdquo;</p>
                <p className="text-xs">Try a different spelling or browse by region.</p>
                <div className="flex justify-center gap-3 pt-2">
                  <Link href="/explore" onClick={closeSearch} className="underline">
                    Explore
                  </Link>
                  <Link href="/random" onClick={closeSearch} className="underline">
                    Random
                  </Link>
                </div>
              </Command.Empty>
            )}
            {!query.trim() && (
              <div className="px-2 py-2">
                <p className="px-2 py-2 text-xs text-muted-foreground">Type to search 19k+ songs</p>
                {recentFavorites.length > 0 && (
                  <>
                    <p className="px-2 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Favorites
                    </p>
                    {recentFavorites.map((item) => (
                      <Command.Item
                        key={item.href}
                        value={item.title}
                        onSelect={() => navigate(item.href)}
                        className="cursor-pointer rounded-xl px-3 py-2 text-sm aria-selected:bg-muted"
                      >
                        {item.title}
                      </Command.Item>
                    ))}
                  </>
                )}
                <Command.Item
                  value="random song"
                  onSelect={() => navigate("/random")}
                  className="mt-2 cursor-pointer rounded-xl px-3 py-2 text-sm aria-selected:bg-muted"
                >
                  Random song
                </Command.Item>
              </div>
            )}
            {results.map((result) => (
              <Command.Item
                key={`${result.type}-${result.href}`}
                value={`${result.title} ${result.subtitle}`}
                onSelect={() => navigate(result.href)}
                className="cursor-pointer rounded-xl px-3 py-3 text-sm aria-selected:bg-muted"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{result.title}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {result.type}
                  </span>
                </div>
                {result.subtitle && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{result.subtitle}</div>
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
