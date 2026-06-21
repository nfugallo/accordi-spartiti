import { createClient } from "@libsql/client";
import path from "path";

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

async function main() {
  const client = createClient({
    url: getDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Dropping existing search_fts...");
  await client.execute("DROP TABLE IF EXISTS search_fts");

  console.log("Creating search_fts virtual table...");
  await client.execute(`
    CREATE VIRTUAL TABLE search_fts USING fts5(
      entity_type,
      title,
      artist_names,
      slug,
      region,
      tokenize='unicode61 remove_diacritics 2'
    )
  `);

  console.log("Indexing songs...");
  await client.execute(`
    INSERT INTO search_fts (entity_type, title, artist_names, slug, region)
    SELECT
      'song',
      s.title,
      COALESCE(GROUP_CONCAT(a.name, ' '), ''),
      s.slug,
      COALESCE(s.region, '')
    FROM songs s
    LEFT JOIN song_artists sa ON sa.song_id = s.id
    LEFT JOIN artists a ON a.id = sa.artist_id
    GROUP BY s.id
  `);

  const songCount = await client.execute("SELECT COUNT(*) AS c FROM search_fts WHERE entity_type = 'song'");
  console.log(`Indexed ${songCount.rows[0].c} songs`);

  console.log("Indexing artists...");
  await client.execute(`
    INSERT INTO search_fts (entity_type, title, artist_names, slug, region)
    SELECT 'artist', name, name, slug, region
    FROM artists
  `);

  const total = await client.execute("SELECT COUNT(*) AS c FROM search_fts");
  console.log(`Done. ${total.rows[0].c} total searchable entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
