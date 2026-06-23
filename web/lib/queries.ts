import { formatArtistDisplayName } from "./artist-name";
import { searchCatalogServer } from "./catalog-search-server";
import { getDb } from "./db";
import {
  dbCountArtists,
  dbCountSongs,
  dbFetchArtistSongs,
  dbFetchArtistsByRegion,
  dbFetchRegions,
  dbFetchRelatedSongs,
  dbFetchSongBySlug,
  dbListArtistRoutes,
  dbListSongSlugs,
} from "./db-song-fetch";
import {
  countStaticArtists,
  countStaticSongs,
  getStaticArtist,
  getStaticArtistsByRegion,
  getStaticRandomSong,
  getStaticRegions,
  getStaticSong,
  hasStaticData,
  listStaticArtistRoutes,
  listStaticSongSlugs,
} from "./static-store";
import type {
  ArtistSummary,
  RegionSummary,
  SearchResult,
  SongDetail,
  SongSummary,
} from "./types";
import { unstable_cache } from "next/cache";
import { cache } from "react";

function escapeFtsQuery(query: string): string {
  const cleaned = query
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  if (cleaned.length === 0) {
    return "";
  }

  return cleaned.map((term) => `"${term}"*`).join(" ");
}

async function fetchSearchCatalog(query: string): Promise<SearchResult[]> {
  const fromStatic = searchCatalogServer(query);
  if (fromStatic !== null) {
    return fromStatic;
  }

  const ftsQuery = escapeFtsQuery(query);
  if (!ftsQuery) {
    return [];
  }

  const db = getDb();
  const { rows } = await db.execute({
    sql: `
      SELECT entity_type, title, slug, region, artist_names
      FROM search_fts
      WHERE search_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `,
    args: [ftsQuery],
  });

  return rows.map((row) => {
    const type = String(row.entity_type) as "song" | "artist";
    const title = String(row.title);
    const slug = String(row.slug);
    const region = row.region ? String(row.region) : "";
    const artistNames = row.artist_names ? String(row.artist_names) : "";

    if (type === "artist") {
      return {
        type,
        title: formatArtistDisplayName(title),
        slug,
        subtitle: region,
        href: `/artist/${region}/${slug}`,
      };
    }

    return {
      type,
      title,
      slug,
      subtitle: artistNames || region,
      href: `/song/${slug}`,
    };
  });
}

async function fetchSongBySlug(slug: string): Promise<SongDetail | null> {
  if (hasStaticData()) {
    const song = getStaticSong(slug);
    if (!song) {
      return null;
    }
    const { relatedSongs, ...detail } = song;
    void relatedSongs;
    return detail;
  }
  return dbFetchSongBySlug(getDb(), slug, { includeUgEnrichment: true });
}

async function fetchRelatedSongs(
  songId: number,
  limit = 5,
  slug?: string,
): Promise<SongSummary[]> {
  if (hasStaticData() && slug) {
    const song = getStaticSong(slug);
    return song?.relatedSongs.slice(0, limit) ?? [];
  }
  return dbFetchRelatedSongs(getDb(), songId, limit);
}

async function fetchRandomSong(): Promise<SongSummary | null> {
  if (hasStaticData()) {
    return getStaticRandomSong();
  }
  const db = getDb();
  const { rows } = await db.execute({
    sql: `SELECT title, slug FROM songs WHERE id = (ABS(RANDOM()) % (SELECT MAX(id) FROM songs)) + 1 LIMIT 1`,
  });
  if (rows.length === 0) {
    return null;
  }
  return {
    title: String(rows[0].title),
    slug: String(rows[0].slug),
  };
}

async function fetchSongSlugPage(offset: number, limit: number): Promise<{ slug: string }[]> {
  if (hasStaticData()) {
    return listStaticSongSlugs(offset, limit);
  }
  return dbListSongSlugs(getDb(), offset, limit);
}

async function fetchSongCount(): Promise<number> {
  if (hasStaticData()) {
    return countStaticSongs();
  }
  return dbCountSongs(getDb());
}

async function fetchArtistRoutePage(
  offset: number,
  limit: number,
): Promise<{ region: string; slug: string }[]> {
  if (hasStaticData()) {
    return listStaticArtistRoutes(offset, limit);
  }
  return dbListArtistRoutes(getDb(), offset, limit);
}

async function fetchArtistCount(): Promise<number> {
  if (hasStaticData()) {
    return countStaticArtists();
  }
  return dbCountArtists(getDb());
}

async function fetchArtistSongs(
  region: string,
  slug: string,
): Promise<{ name: string; displayName: string; songs: SongSummary[] } | null> {
  if (hasStaticData()) {
    return getStaticArtist(region, slug);
  }
  return dbFetchArtistSongs(getDb(), region, slug);
}

async function fetchRegions(): Promise<RegionSummary[]> {
  if (hasStaticData()) {
    return getStaticRegions();
  }
  return dbFetchRegions(getDb());
}

async function fetchArtistsByRegion(region: string): Promise<ArtistSummary[]> {
  if (hasStaticData()) {
    return getStaticArtistsByRegion(region);
  }
  return dbFetchArtistsByRegion(getDb(), region);
}

const DAY = 86_400;

export const getSongBySlug = cache((slug: string) =>
  unstable_cache(() => fetchSongBySlug(slug), ["song", slug], {
    revalidate: DAY,
    tags: ["songs", `song:${slug}`],
  })(),
);

export const getRelatedSongs = cache((songId: number, limit = 5, slug?: string) =>
  unstable_cache(
    () => fetchRelatedSongs(songId, limit, slug),
    ["related", String(songId), String(limit), slug ?? ""],
    {
      revalidate: DAY,
      tags: ["songs"],
    },
  )(),
);

export const getArtistSongs = cache((region: string, slug: string) =>
  unstable_cache(() => fetchArtistSongs(region, slug), ["artist", region, slug], {
    revalidate: DAY,
    tags: ["artists", `artist:${region}:${slug}`],
  })(),
);

export const getRegions = cache(() =>
  unstable_cache(fetchRegions, ["regions"], { revalidate: DAY, tags: ["regions"] })(),
);

export const getArtistsByRegion = cache((region: string) =>
  unstable_cache(() => fetchArtistsByRegion(region), ["artists-by-region", region], {
    revalidate: DAY,
    tags: ["artists", `region:${region}`],
  })(),
);

export const searchCatalog = cache((query: string) =>
  unstable_cache(() => fetchSearchCatalog(query), ["search", query], {
    revalidate: 3600,
    tags: ["search"],
  })(),
);

export async function getRandomSong(): Promise<SongSummary | null> {
  return fetchRandomSong();
}

export async function listSongSlugs(offset: number, limit: number): Promise<{ slug: string }[]> {
  return fetchSongSlugPage(offset, limit);
}

export async function countSongs(): Promise<number> {
  return fetchSongCount();
}

export async function listArtistRoutes(
  offset: number,
  limit: number,
): Promise<{ region: string; slug: string }[]> {
  return fetchArtistRoutePage(offset, limit);
}

export async function countArtists(): Promise<number> {
  return fetchArtistCount();
}
