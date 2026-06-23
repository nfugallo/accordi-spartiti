import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  searchCatalogLocal,
  shardIdsForQuery,
  type CatalogEntry,
  type SearchManifest,
} from "./catalog-search";
import type { SearchResult } from "./types";

const SERVER_SEARCH_DIR = path.join(process.cwd(), "public", "search");

/** Server-side search from built static shards — no Turso reads. */
export function searchCatalogServer(query: string, limit = 20): SearchResult[] | null {
  const manifestPath = path.join(SERVER_SEARCH_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SearchManifest;
  const shardIds = shardIdsForQuery(query, manifest);
  const merged: CatalogEntry[] = [];

  for (const shardId of shardIds) {
    const shardPath = path.join(SERVER_SEARCH_DIR, "shards", `${shardId}.json`);
    if (!existsSync(shardPath)) {
      continue;
    }
    merged.push(...(JSON.parse(readFileSync(shardPath, "utf8")) as CatalogEntry[]));
  }

  return searchCatalogLocal(merged, query, limit);
}
