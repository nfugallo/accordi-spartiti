import type { Client } from "@libsql/client";
import { formatArtistDisplayName } from "./artist-name";
import type {
  ArtistRef,
  ArtistSummary,
  RegionSummary,
  SongDetail,
  SongSummary,
  SongUgEnrichment,
  Stanza,
  StanzaType,
} from "./types";

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

function mapArtistRow(row: Record<string, unknown>): ArtistRef {
  const name = String(row.name);
  return {
    name,
    displayName: formatArtistDisplayName(name),
    slug: String(row.slug),
    region: String(row.region),
  };
}

async function dbFetchUgEnrichment(
  db: Client,
  songId: number,
): Promise<SongUgEnrichment | null> {
  const { rows } = await db.execute({
    sql: `
      SELECT
        ug_tab_id,
        ug_url,
        ug_song_name,
        ug_artist_name,
        match_confidence,
        tuning,
        capo,
        tonality,
        difficulty,
        scraped_at
      FROM song_ug_enrichment
      WHERE song_id = ?
      LIMIT 1
    `,
    args: [songId],
  });

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const [strummingResult, fingeringResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT part, bpm, denominator, display
        FROM song_ug_strumming
        WHERE song_id = ?
        ORDER BY id
      `,
      args: [songId],
    }),
    db.execute({
      sql: `
        SELECT chord, frets
        FROM song_ug_chord_fingerings
        WHERE song_id = ?
        ORDER BY chord
      `,
      args: [songId],
    }),
  ]);

  return {
    ugTabId: Number(row.ug_tab_id),
    ugUrl: String(row.ug_url),
    ugSongName: String(row.ug_song_name),
    ugArtistName: String(row.ug_artist_name),
    matchConfidence: Number(row.match_confidence),
    tuning: row.tuning ? String(row.tuning) : null,
    capo: row.capo === null || row.capo === undefined ? null : Number(row.capo),
    tonality: row.tonality ? String(row.tonality) : null,
    difficulty: row.difficulty ? String(row.difficulty) : null,
    strumming: strummingResult.rows.map((pattern) => ({
      part: String(pattern.part),
      bpm: pattern.bpm === null || pattern.bpm === undefined ? null : Number(pattern.bpm),
      denominator:
        pattern.denominator === null || pattern.denominator === undefined
          ? null
          : Number(pattern.denominator),
      display: String(pattern.display),
    })),
    chordFingerings: fingeringResult.rows.map((fingering) => ({
      chord: String(fingering.chord),
      frets: String(fingering.frets),
    })),
    scrapedAt: String(row.scraped_at),
  };
}

export async function dbFetchSongBySlug(
  db: Client,
  slug: string,
  options: { includeUgEnrichment?: boolean } = {},
): Promise<SongDetail | null> {
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

  const [artistResult, sectionResult, stanzaResult, chordLineResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT a.name, a.slug, a.region
        FROM artists a
        JOIN song_artists sa ON sa.artist_id = a.id
        WHERE sa.song_id = ?
        ORDER BY a.name
      `,
      args: [songId],
    }),
    db.execute({
      sql: `
        SELECT section_index, key_signature
        FROM song_sections
        WHERE song_id = ?
        ORDER BY section_index
      `,
      args: [songId],
    }),
    db.execute({
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
    }),
    db.execute({
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
    }),
  ]);

  const chordLinesByStanza = new Map<string, { lineIndex: number; rawLine: string }[]>();
  for (const row of chordLineResult.rows) {
    const key = `${row.section_index}:${row.stanza_index}`;
    const lines = chordLinesByStanza.get(key) ?? [];
    lines.push({
      lineIndex: Number(row.line_index),
      rawLine: String(row.raw_line),
    });
    chordLinesByStanza.set(key, lines);
  }

  const stanzasBySection = new Map<number, Stanza[]>();
  for (const row of stanzaResult.rows) {
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

  const sections = sectionResult.rows.map((row) => ({
    sectionIndex: Number(row.section_index),
    keySignature: String(row.key_signature),
    stanzas: stanzasBySection.get(Number(row.section_index)) ?? [],
  }));

  const ugEnrichment = options.includeUgEnrichment
    ? await dbFetchUgEnrichment(db, songId)
    : null;

  return {
    id: songId,
    title: String(song.title),
    slug: String(song.slug),
    region: song.region ? String(song.region) : null,
    sourceUrl: song.url ? String(song.url) : null,
    artists: artistResult.rows.map((row) => mapArtistRow(row)),
    keys: [...new Set(sections.map((s) => s.keySignature))],
    sections,
    ugEnrichment,
  };
}

export async function dbFetchRelatedSongs(
  db: Client,
  songId: number,
  limit = 5,
): Promise<SongSummary[]> {
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

export async function dbFetchArtistSongs(
  db: Client,
  region: string,
  slug: string,
): Promise<{ name: string; displayName: string; songs: SongSummary[] } | null> {
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

export async function dbFetchRegions(db: Client): Promise<RegionSummary[]> {
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

export async function dbFetchArtistsByRegion(db: Client, region: string): Promise<ArtistSummary[]> {
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

export async function dbListSongSlugs(
  db: Client,
  offset: number,
  limit: number,
): Promise<{ slug: string }[]> {
  const { rows } = await db.execute({
    sql: `SELECT slug FROM songs ORDER BY slug LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return rows.map((row) => ({ slug: String(row.slug) }));
}

export async function dbListArtistRoutes(
  db: Client,
  offset: number,
  limit: number,
): Promise<{ region: string; slug: string }[]> {
  const { rows } = await db.execute({
    sql: `SELECT region, slug FROM artists ORDER BY region, slug LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return rows.map((row) => ({
    region: String(row.region),
    slug: String(row.slug),
  }));
}

export async function dbCountSongs(db: Client): Promise<number> {
  const { rows } = await db.execute(`SELECT COUNT(*) AS count FROM songs`);
  return Number(rows[0].count);
}

export async function dbCountArtists(db: Client): Promise<number> {
  const { rows } = await db.execute(`SELECT COUNT(*) AS count FROM artists`);
  return Number(rows[0].count);
}

export async function dbListAllSongSlugs(db: Client): Promise<string[]> {
  const { rows } = await db.execute(`SELECT slug FROM songs ORDER BY slug`);
  return rows.map((row) => String(row.slug));
}

export async function dbListAllArtistRoutes(
  db: Client,
): Promise<{ region: string; slug: string }[]> {
  const { rows } = await db.execute(`SELECT region, slug FROM artists ORDER BY region, slug`);
  return rows.map((row) => ({
    region: String(row.region),
    slug: String(row.slug),
  }));
}
