import { formatArtistDisplayName } from "./artist-name";
import { getDb } from "./db";
import type {
  ArtistRef,
  ArtistSummary,
  RegionSummary,
  SearchResult,
  SongDetail,
  SongSummary,
  Stanza,
  StanzaType,
} from "./types";

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

function mapArtistRow(row: Record<string, unknown>): ArtistRef {
  const name = String(row.name);
  return {
    name,
    displayName: formatArtistDisplayName(name),
    slug: String(row.slug),
    region: String(row.region),
  };
}

export async function searchCatalog(query: string): Promise<SearchResult[]> {
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

export async function getSongBySlug(slug: string): Promise<SongDetail | null> {
  const db = getDb();

  const { rows: songRows } = await db.execute({
    sql: `
      SELECT id, title, slug, region, url
      FROM songs
      WHERE slug = ?
      LIMIT 1
    `,
    args: [slug],
  });

  if (songRows.length === 0) {
    return null;
  }

  const song = songRows[0];
  const songId = Number(song.id);

  const { rows: artistRows } = await db.execute({
    sql: `
      SELECT a.name, a.slug, a.region
      FROM artists a
      JOIN song_artists sa ON sa.artist_id = a.id
      WHERE sa.song_id = ?
      ORDER BY a.name
    `,
    args: [songId],
  });

  const { rows: sectionRows } = await db.execute({
    sql: `
      SELECT section_index, key_signature
      FROM song_sections
      WHERE song_id = ?
      ORDER BY section_index
    `,
    args: [songId],
  });

  const { rows: stanzaRows } = await db.execute({
    sql: `
      SELECT
        st.section_index,
        st.stanza_index,
        st.stanza_type,
        st.lyric,
        st.id AS stanza_id
      FROM stanzas st
      WHERE st.song_id = ?
      ORDER BY st.section_index, st.stanza_index
    `,
    args: [songId],
  });

  const { rows: chordLineRows } = await db.execute({
    sql: `
      SELECT
        st.section_index,
        st.stanza_index,
        cl.line_index,
        cl.raw_line
      FROM chord_lines cl
      JOIN stanzas st ON st.id = cl.stanza_id
      WHERE st.song_id = ?
      ORDER BY st.section_index, st.stanza_index, cl.line_index
    `,
    args: [songId],
  });

  const chordLinesByStanza = new Map<string, { lineIndex: number; rawLine: string }[]>();
  for (const row of chordLineRows) {
    const key = `${row.section_index}:${row.stanza_index}`;
    const lines = chordLinesByStanza.get(key) ?? [];
    lines.push({
      lineIndex: Number(row.line_index),
      rawLine: String(row.raw_line),
    });
    chordLinesByStanza.set(key, lines);
  }

  const stanzasBySection = new Map<number, Stanza[]>();
  for (const row of stanzaRows) {
    const sectionIndex = Number(row.section_index);
    const stanzaIndex = Number(row.stanza_index);
    const key = `${sectionIndex}:${stanzaIndex}`;
    const sectionStanzas = stanzasBySection.get(sectionIndex) ?? [];
    sectionStanzas.push({
      sectionIndex,
      stanzaIndex,
      stanzaType: String(row.stanza_type) as StanzaType,
      lyric: row.lyric ? String(row.lyric) : null,
      chordLines: chordLinesByStanza.get(key) ?? [],
    });
    stanzasBySection.set(sectionIndex, sectionStanzas);
  }

  const sections = sectionRows.map((row) => ({
    sectionIndex: Number(row.section_index),
    keySignature: String(row.key_signature),
    stanzas: stanzasBySection.get(Number(row.section_index)) ?? [],
  }));

  return {
    id: songId,
    title: String(song.title),
    slug: String(song.slug),
    region: song.region ? String(song.region) : null,
    sourceUrl: song.url ? String(song.url) : null,
    artists: artistRows.map((row) => mapArtistRow(row)),
    keys: [...new Set(sections.map((s) => s.keySignature))],
    sections,
  };
}

export async function getRelatedSongs(songId: number, limit = 5): Promise<SongSummary[]> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: `
      SELECT DISTINCT s.title, s.slug
      FROM songs s
      JOIN song_artists sa ON sa.song_id = s.id
      WHERE sa.artist_id IN (
        SELECT artist_id FROM song_artists WHERE song_id = ?
      )
      AND s.id != ?
      ORDER BY s.title
      LIMIT ?
    `,
    args: [songId, songId, limit],
  });

  return rows.map((row) => ({
    title: String(row.title),
    slug: String(row.slug),
  }));
}

export async function getRandomSong(): Promise<SongSummary | null> {
  const db = getDb();
  const { rows } = await db.execute(`
    SELECT title, slug
    FROM songs
    ORDER BY RANDOM()
    LIMIT 1
  `);

  if (rows.length === 0) {
    return null;
  }

  return {
    title: String(rows[0].title),
    slug: String(rows[0].slug),
  };
}

export async function listSongSlugs(offset: number, limit: number): Promise<{ slug: string }[]> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: `SELECT slug FROM songs ORDER BY slug LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return rows.map((row) => ({ slug: String(row.slug) }));
}

export async function countSongs(): Promise<number> {
  const db = getDb();
  const { rows } = await db.execute(`SELECT COUNT(*) AS count FROM songs`);
  return Number(rows[0].count);
}

export async function listArtistRoutes(
  offset: number,
  limit: number,
): Promise<{ region: string; slug: string }[]> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: `SELECT region, slug FROM artists ORDER BY region, slug LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return rows.map((row) => ({
    region: String(row.region),
    slug: String(row.slug),
  }));
}

export async function countArtists(): Promise<number> {
  const db = getDb();
  const { rows } = await db.execute(`SELECT COUNT(*) AS count FROM artists`);
  return Number(rows[0].count);
}

export async function getArtistSongs(
  region: string,
  slug: string,
): Promise<{ name: string; displayName: string; songs: SongSummary[] } | null> {
  const db = getDb();

  const { rows: artistRows } = await db.execute({
    sql: `
      SELECT id, name
      FROM artists
      WHERE region = ? AND slug = ?
      LIMIT 1
    `,
    args: [region, slug],
  });

  if (artistRows.length === 0) {
    return null;
  }

  const artistId = Number(artistRows[0].id);
  const name = String(artistRows[0].name);

  const { rows: songRows } = await db.execute({
    sql: `
      SELECT s.title, s.slug
      FROM songs s
      JOIN song_artists sa ON sa.song_id = s.id
      WHERE sa.artist_id = ?
      ORDER BY s.title
    `,
    args: [artistId],
  });

  return {
    name,
    displayName: formatArtistDisplayName(name),
    songs: songRows.map((row) => ({
      title: String(row.title),
      slug: String(row.slug),
    })),
  };
}

const REGION_LABELS: Record<string, string> = {
  italiani: "Italiani",
  internazionali: "Internazionali",
  "colonne-sonore": "Colonne sonore",
  "musica-popolare": "Musica popolare",
  "musica-classica": "Musica classica",
  supergruppi: "Supergruppi",
};

function regionLabel(slug: string): string {
  return REGION_LABELS[slug] ?? slug.replace(/-/g, " ");
}

export async function getRegions(): Promise<RegionSummary[]> {
  const db = getDb();
  const { rows } = await db.execute(`
    SELECT region, COUNT(*) AS artist_count
    FROM artists
    GROUP BY region
    ORDER BY artist_count DESC
  `);

  return rows.map((row) => ({
    slug: String(row.region),
    label: regionLabel(String(row.region)),
    artistCount: Number(row.artist_count),
  }));
}

export async function getArtistsByRegion(region: string): Promise<ArtistSummary[]> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: `
      SELECT a.name, a.slug, a.region, COUNT(sa.song_id) AS song_count
      FROM artists a
      LEFT JOIN song_artists sa ON sa.artist_id = a.id
      WHERE a.region = ?
      GROUP BY a.id
      ORDER BY a.name COLLATE NOCASE
    `,
    args: [region],
  });

  return rows.map((row) => {
    const name = String(row.name);
    return {
      name,
      displayName: formatArtistDisplayName(name),
      slug: String(row.slug),
      region: String(row.region),
      songCount: Number(row.song_count),
    };
  });
}
