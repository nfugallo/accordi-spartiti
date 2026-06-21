import { formatArtistDisplayName } from "../lib/artist-name";
import {
  buildAdaptiveShards,
  MAX_SHARD_ENTRIES,
  type CatalogEntry,
  type SearchManifest,
} from "../lib/catalog-search";
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync } from "fs";
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

  console.log("Exporting sharded client search catalog...");
  const { rows } = await client.execute(`
    SELECT entity_type, title, artist_names, slug, region
    FROM search_fts
    ORDER BY entity_type, title COLLATE NOCASE
  `);

  const catalog: CatalogEntry[] = rows.map((row) => {
    const type = String(row.entity_type);
    const title = String(row.title);
    const slug = String(row.slug);
    const region = row.region ? String(row.region) : "";
    const artistNames = row.artist_names ? String(row.artist_names) : "";

    if (type === "artist") {
      return {
        t: formatArtistDisplayName(title),
        u: region,
        h: `/artist/${region}/${slug}`,
        k: "a",
      };
    }

    return {
      t: title,
      u: artistNames || region,
      h: `/song/${slug}`,
      k: "s",
    };
  });

  const shards = buildAdaptiveShards(catalog);
  const shardDir = path.resolve(process.cwd(), "public", "search", "shards");
  mkdirSync(shardDir, { recursive: true });

  const shardIds = Object.keys(shards).sort();
  for (const shardId of shardIds) {
    writeFileSync(path.join(shardDir, `${shardId}.json`), JSON.stringify(shards[shardId]));
  }

  const manifest: SearchManifest = {
    version: 2,
    total: catalog.length,
    maxShardEntries: MAX_SHARD_ENTRIES,
    shards: shardIds,
  };

  writeFileSync(
    path.resolve(process.cwd(), "public", "search", "manifest.json"),
    JSON.stringify(manifest),
  );

  const largest = Math.max(...Object.values(shards).map((group) => group.length));
  console.log(
    `Wrote ${shardIds.length} shards (${catalog.length} entries, largest shard ${largest}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
