import { createClient } from "@libsql/client";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import {
  dbCountArtists,
  dbCountSongs,
  dbFetchArtistsByRegion,
  dbFetchRegions,
  dbListAllArtistRoutes,
  dbListAllSongSlugs,
} from "../lib/db-song-fetch";
import type { ArtistRef, SongDetail, SongSummary, Stanza, StanzaType } from "../lib/types";
import { formatArtistDisplayName } from "../lib/artist-name";

function getDatabaseUrl(): string {
  const fromArg = process.argv.find((arg) => arg.startsWith("--url="));
  if (fromArg) {
    return fromArg.slice("--url=".length);
  }
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dbPath = path.resolve(process.cwd(), "..", "data", "accordi.db");
  return `file:${dbPath}`;
}

function songFilePath(outDir: string, slug: string): string {
  const prefix = slug.slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, "x") || "xx";
  return path.join(outDir, "songs", prefix, `${slug}.json`);
}

type SongRow = {
  id: number;
  title: string;
  slug: string;
  region: string | null;
  sourceUrl: string | null;
};

type ArtistSongRecord = {
  name: string;
  displayName: string;
  songs: SongSummary[];
};

function artistRef(row: Record<string, unknown>): ArtistRef {
  const name = String(row.name);
  return {
    name,
    displayName: formatArtistDisplayName(name),
    slug: String(row.slug),
    region: String(row.region),
  };
}

function pushMapValue<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

async function main() {
  const client = createClient({
    url: getDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const outDir = path.resolve(process.cwd(), "generated");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  console.log("Loading catalog metadata...");
  const [regions, songSlugs, artistRoutes, songCount, artistCount] = await Promise.all([
    dbFetchRegions(client),
    dbListAllSongSlugs(client),
    dbListAllArtistRoutes(client),
    dbCountSongs(client),
    dbCountArtists(client),
  ]);

  writeFileSync(path.join(outDir, "regions.json"), JSON.stringify(regions));
  writeFileSync(path.join(outDir, "song-slugs.json"), JSON.stringify(songSlugs));
  writeFileSync(path.join(outDir, "artist-routes.json"), JSON.stringify(artistRoutes));
  writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify({
      version: 1,
      songCount,
      artistCount,
      builtAt: new Date().toISOString(),
    }),
  );

  console.log(`Exporting ${regions.length} region lists...`);
  for (const region of regions) {
    const artists = await dbFetchArtistsByRegion(client, region.slug);
    const regionDir = path.join(outDir, "regions");
    mkdirSync(regionDir, { recursive: true });
    writeFileSync(path.join(regionDir, `${region.slug}.json`), JSON.stringify(artists));
  }

  console.log("Bulk loading song data...");
  const [
    songResult,
    artistResult,
    sectionResult,
    stanzaResult,
    chordLineResult,
    relatedResult,
    artistSongResult,
  ] = await Promise.all([
    client.execute(`
      SELECT id, title, slug, region, url
      FROM songs
      ORDER BY slug
    `),
    client.execute(`
      SELECT sa.song_id, a.name, a.slug, a.region
      FROM song_artists sa
      JOIN artists a ON a.id = sa.artist_id
      ORDER BY sa.song_id, a.name
    `),
    client.execute(`
      SELECT song_id, section_index, key_signature
      FROM song_sections
      ORDER BY song_id, section_index
    `),
    client.execute(`
      SELECT id, song_id, section_index, stanza_index, stanza_type, lyric
      FROM stanzas
      ORDER BY song_id, section_index, stanza_index
    `),
    client.execute(`
      SELECT st.song_id, st.section_index, st.stanza_index, cl.line_index, cl.raw_line
      FROM chord_lines cl
      JOIN stanzas st ON st.id = cl.stanza_id
      ORDER BY st.song_id, st.section_index, st.stanza_index, cl.line_index
    `),
    client.execute(`
      SELECT source.song_id, s.title, s.slug
      FROM song_artists source
      JOIN song_artists peer ON peer.artist_id = source.artist_id AND peer.song_id != source.song_id
      JOIN songs s ON s.id = peer.song_id
      ORDER BY source.song_id, s.title
    `),
    client.execute(`
      SELECT a.region, a.slug AS artist_slug, a.name, s.title, s.slug AS song_slug
      FROM artists a
      LEFT JOIN song_artists sa ON sa.artist_id = a.id
      LEFT JOIN songs s ON s.id = sa.song_id
      ORDER BY a.region, a.slug, s.title
    `),
  ]);

  const songs = songResult.rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    region: row.region ? String(row.region) : null,
    sourceUrl: row.url ? String(row.url) : null,
  })) satisfies SongRow[];

  const artistsBySong = new Map<number, ArtistRef[]>();
  for (const row of artistResult.rows) {
    pushMapValue(artistsBySong, Number(row.song_id), artistRef(row));
  }

  const chordLinesByStanza = new Map<string, { lineIndex: number; rawLine: string }[]>();
  for (const row of chordLineResult.rows) {
    const key = `${row.song_id}:${row.section_index}:${row.stanza_index}`;
    pushMapValue(chordLinesByStanza, key, {
      lineIndex: Number(row.line_index),
      rawLine: String(row.raw_line),
    });
  }

  const stanzasBySection = new Map<string, Stanza[]>();
  for (const row of stanzaResult.rows) {
    const key = `${row.song_id}:${row.section_index}`;
    const stanzaKey = `${row.song_id}:${row.section_index}:${row.stanza_index}`;
    pushMapValue(stanzasBySection, key, {
      sectionIndex: Number(row.section_index),
      stanzaIndex: Number(row.stanza_index),
      stanzaType: String(row.stanza_type) as StanzaType,
      lyric: row.lyric ? String(row.lyric) : null,
      chordLines: chordLinesByStanza.get(stanzaKey) ?? [],
    });
  }

  const sectionsBySong = new Map<number, SongDetail["sections"]>();
  for (const row of sectionResult.rows) {
    const songId = Number(row.song_id);
    pushMapValue(sectionsBySong, songId, {
      sectionIndex: Number(row.section_index),
      keySignature: String(row.key_signature),
      stanzas: stanzasBySection.get(`${songId}:${row.section_index}`) ?? [],
    });
  }

  const relatedBySong = new Map<number, SongSummary[]>();
  const relatedSeenBySong = new Map<number, Set<string>>();
  for (const row of relatedResult.rows) {
    const songId = Number(row.song_id);
    const current = relatedBySong.get(songId) ?? [];
    if (current.length >= 5) {
      continue;
    }
    const seen = relatedSeenBySong.get(songId) ?? new Set<string>();
    const slug = String(row.slug);
    if (seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    relatedSeenBySong.set(songId, seen);
    current.push({ title: String(row.title), slug });
    relatedBySong.set(songId, current);
  }

  const artistSongs = new Map<string, ArtistSongRecord>();
  for (const row of artistSongResult.rows) {
    const region = String(row.region);
    const slug = String(row.artist_slug);
    const key = `${region}/${slug}`;
    const name = String(row.name);
    const record = artistSongs.get(key) ?? {
      name,
      displayName: formatArtistDisplayName(name),
      songs: [],
    };
    if (row.song_slug && row.title) {
      record.songs.push({
        title: String(row.title),
        slug: String(row.song_slug),
      });
    }
    artistSongs.set(key, record);
  }

  console.log(`Exporting ${artistRoutes.length} artist pages...`);
  for (const route of artistRoutes) {
    const artist = artistSongs.get(`${route.region}/${route.slug}`);
    if (!artist) {
      continue;
    }
    const artistDir = path.join(outDir, "artists", route.region);
    mkdirSync(artistDir, { recursive: true });
    writeFileSync(path.join(artistDir, `${route.slug}.json`), JSON.stringify(artist));
  }

  console.log(`Exporting ${songs.length} song pages...`);
  let exported = 0;
  for (const song of songs) {
    const sections = sectionsBySong.get(song.id) ?? [];
    const songDetail: SongDetail = {
      ...song,
      artists: artistsBySong.get(song.id) ?? [],
      keys: [...new Set(sections.map((section) => section.keySignature))],
      sections,
      ugEnrichment: null,
    };
    const filePath = songFilePath(outDir, song.slug);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      JSON.stringify({ ...songDetail, relatedSongs: relatedBySong.get(song.id) ?? [] }),
    );
    exported += 1;
    if (exported % 1000 === 0) {
      console.log(`  ${exported}/${songs.length} songs...`);
    }
  }

  console.log(`Done. Wrote ${exported} songs to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
