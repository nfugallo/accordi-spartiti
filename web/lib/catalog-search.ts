import type { SearchResult } from "./types";

/** Compact catalog row shipped to the browser for instant search. */
export type CatalogEntry = {
  t: string;
  u: string;
  h: string;
  k: "s" | "a";
};

export type SearchManifest = {
  version: number;
  total: number;
  maxShardEntries: number;
  shards: string[];
};

/** Target max rows per shard — keeps each download small as the catalog grows. */
export const MAX_SHARD_ENTRIES = 2_500;

export const SEARCH_MANIFEST_PATH = "/search/manifest.json";
export const SEARCH_SHARD_PATH = (id: string) => `/search/shards/${id}.json`;

export function normalizeCatalogText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function alphanumericPrefix(title: string, length: number): string {
  const norm = normalizeCatalogText(title).replace(/[^a-z0-9]/g, "");
  if (!norm) {
    return "#".padEnd(length, "#").slice(0, length);
  }
  return norm.slice(0, length).padEnd(length, "_");
}

function partitionEntries(
  entries: CatalogEntry[],
  prefixLength: number,
): Record<string, CatalogEntry[]> {
  if (prefixLength === 0) {
    return { all: entries };
  }

  const groups: Record<string, CatalogEntry[]> = {};
  for (const entry of entries) {
    const key = alphanumericPrefix(entry.t, prefixLength);
    groups[key] ??= [];
    groups[key].push(entry);
  }
  return groups;
}

/** Split catalog into shards that stay under MAX_SHARD_ENTRIES regardless of total size. */
export function buildAdaptiveShards(entries: CatalogEntry[]): Record<string, CatalogEntry[]> {
  if (entries.length <= MAX_SHARD_ENTRIES) {
    return { all: entries };
  }

  let shards = partitionEntries(entries, 1);

  for (let prefixLength = 2; prefixLength <= 4; prefixLength++) {
    const oversized = Object.entries(shards).filter(([, group]) => group.length > MAX_SHARD_ENTRIES);
    if (oversized.length === 0) {
      break;
    }

    const next: Record<string, CatalogEntry[]> = {};
    for (const [key, group] of Object.entries(shards)) {
      if (group.length <= MAX_SHARD_ENTRIES) {
        next[key] = group;
        continue;
      }
      const subShards = partitionEntries(group, prefixLength);
      for (const [subKey, subGroup] of Object.entries(subShards)) {
        next[subKey] = subGroup;
      }
    }
    shards = next;
  }

  return shards;
}

export function searchCatalogLocal(
  entries: CatalogEntry[],
  query: string,
  limit = 20,
): SearchResult[] {
  const terms = normalizeCatalogText(query)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  if (terms.length === 0) {
    return [];
  }

  const results: { score: number; result: SearchResult }[] = [];

  for (const entry of entries) {
    const hay = normalizeCatalogText(`${entry.t} ${entry.u}`);
    if (!terms.every((term) => hay.includes(term))) {
      continue;
    }

    let score = 0;
    const titleNorm = normalizeCatalogText(entry.t);
    if (titleNorm.startsWith(terms[0])) {
      score += 10;
    }
    if (terms.every((term) => titleNorm.includes(term))) {
      score += 5;
    }
    score -= titleNorm.length * 0.001;

    results.push({
      score,
      result: {
        type: entry.k === "a" ? "artist" : "song",
        title: entry.t,
        slug: entry.h.split("/").pop() ?? "",
        subtitle: entry.u,
        href: entry.h,
      },
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.result);
}

function shardIdsForQuery(query: string, manifest: SearchManifest): string[] {
  if (manifest.shards.includes("all")) {
    return ["all"];
  }

  const ids = new Set<string>();
  const terms = normalizeCatalogText(query)
    .split(/\s+/)
    .filter(Boolean);

  for (const term of terms) {
    const norm = term.replace(/[^a-z0-9]/g, "");
    if (!norm) {
      if (manifest.shards.includes("#")) {
        ids.add("#");
      }
      continue;
    }

    const one = norm.slice(0, 1).padEnd(1, "_");
    if (manifest.shards.includes(one)) {
      ids.add(one);
    }

    for (const len of [2, 3, 4] as const) {
      const prefix = norm.slice(0, len).padEnd(len, "_");
      if (manifest.shards.includes(prefix)) {
        ids.add(prefix);
      }
    }
  }

  if (ids.size === 0) {
    return manifest.shards.slice(0, 3);
  }

  return [...ids];
}

let manifestPromise: Promise<SearchManifest | null> | null = null;
const loadedShards = new Map<string, CatalogEntry[]>();
const shardPromises = new Map<string, Promise<CatalogEntry[]>>();

export function loadSearchManifest(): Promise<SearchManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch(SEARCH_MANIFEST_PATH)
      .then((res) => (res.ok ? (res.json() as Promise<SearchManifest>) : null))
      .catch(() => null);
  }
  return manifestPromise;
}

function loadShard(shardId: string): Promise<CatalogEntry[]> {
  const cached = loadedShards.get(shardId);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = shardPromises.get(shardId);
  if (pending) {
    return pending;
  }

  const promise = fetch(SEARCH_SHARD_PATH(shardId))
    .then((res) => {
      if (!res.ok) {
        return [];
      }
      return res.json() as Promise<CatalogEntry[]>;
    })
    .then((entries) => {
      loadedShards.set(shardId, entries);
      shardPromises.delete(shardId);
      return entries;
    })
    .catch(() => []);

  shardPromises.set(shardId, promise);
  return promise;
}

/** Client-side search from sharded static catalog. Returns null if manifest is unavailable. */
export async function searchCatalogClient(query: string): Promise<SearchResult[] | null> {
  const manifest = await loadSearchManifest();
  if (!manifest) {
    return null;
  }

  const shardIds = shardIdsForQuery(query, manifest);
  const groups = await Promise.all(shardIds.map((id) => loadShard(id)));
  const merged = groups.flat();

  return searchCatalogLocal(merged, query);
}

export function preloadSearchCatalog(): void {
  void loadSearchManifest();
}
