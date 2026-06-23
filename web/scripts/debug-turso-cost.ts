import { execSync } from "child_process";
import { createClient } from "@libsql/client";
import path from "path";
import {
  dbFetchRelatedSongs,
  dbFetchSongBySlug,
} from "../lib/db-song-fetch";
import { getStaticSong, hasStaticData } from "../lib/static-store";

type QueryStat = {
  reads: number;
  writes: number;
  sql: string;
};

type ExplainRow = {
  detail: string;
};

function getDatabaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dbPath = path.resolve(process.cwd(), "..", "data", "accordi.db");
  return `file:${dbPath}`;
}

function parseTursoInspectQueries(raw: string): QueryStat[] {
  const lines = raw.split("\n");
  const stats: QueryStat[] = [];
  let pendingReads: number | null = null;
  let pendingWrites: number | null = null;
  let sqlLines: string[] = [];

  function flush(): void {
    if (pendingReads === null || sqlLines.length === 0) {
      pendingReads = null;
      pendingWrites = null;
      sqlLines = [];
      return;
    }
    stats.push({
      reads: pendingReads,
      writes: pendingWrites ?? 0,
      sql: sqlLines.join(" ").replace(/\s+/g, " ").trim(),
    });
    pendingReads = null;
    pendingWrites = null;
    sqlLines = [];
  }

  for (const line of lines) {
    const metric = line.match(/^\s+(\d+)\s+(\d+)\s*$/);
    if (metric) {
      flush();
      pendingWrites = Number(metric[1]);
      pendingReads = Number(metric[2]);
      continue;
    }

    const inline = line.match(
      /^(.+?)\s+(\d+)\s+(\d+)\s*$/,
    );
    if (inline && !line.includes("ROWS READ")) {
      flush();
      stats.push({
        reads: Number(inline[3]),
        writes: Number(inline[2]),
        sql: inline[1].trim(),
      });
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("QUERY") || trimmed.startsWith("ROWS")) {
      continue;
    }

    if (pendingReads !== null) {
      sqlLines.push(trimmed);
    }
  }

  flush();
  return stats.sort((a, b) => b.reads - a.reads);
}

function fetchTursoQueryStats(dbName = "strimpello"): QueryStat[] | null {
  try {
    const raw = execSync(`turso db inspect ${dbName} --queries`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return parseTursoInspectQueries(raw);
  } catch {
    return null;
  }
}

function fetchOrgRowsRead(): number | null {
  try {
    const raw = execSync("turso plan show", { encoding: "utf8" });
    const match = raw.match(/rows read\s+([\d.]+)([KMB])?/i);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    const unit = match[2]?.toUpperCase();
    if (unit === "K") {
      return Math.round(value * 1_000);
    }
    if (unit === "M") {
      return Math.round(value * 1_000_000);
    }
    if (unit === "B") {
      return Math.round(value * 1_000_000_000);
    }
    return Math.round(value);
  } catch {
    return null;
  }
}

function pageFlowReads(stats: QueryStat[] | null): number | null {
  if (!stats) {
    return null;
  }

  const needles = [
    "SELECT id, title, slug, region, url FROM songs WHERE slug = ? LIMIT 1",
    "SELECT DISTINCT s.title, s.slug FROM songs s JOIN song_artists",
    "SELECT a.name, a.slug, a.region FROM artists a JOIN song_artists",
    "SELECT section_index, key_signature FROM song_sections",
    "SELECT st.section_index, st.stanza_index, st.stanza_type",
    "SELECT st.section_index, st.stanza_index, cl.line_index",
  ];

  return stats
    .filter((row) => needles.some((needle) => row.sql.includes(needle)))
    .reduce((sum, row) => sum + row.reads, 0);
}

function localDbPath(): string {
  return path.resolve(process.cwd(), "..", "data", "accordi.db");
}

function explain(sql: string, args: unknown[] = []): ExplainRow[] {
  let rendered = sql.replace(/\s+/g, " ").trim();
  for (const arg of args) {
    const value =
      typeof arg === "number"
        ? String(arg)
        : `'${String(arg).replace(/'/g, "''")}'`;
    rendered = rendered.replace("?", value);
  }
  const raw = execSync(`sqlite3 ${JSON.stringify(localDbPath())} ${JSON.stringify(`EXPLAIN QUERY PLAN ${rendered}`)}`, {
    encoding: "utf8",
  });
  return raw
    .trim()
    .split("\n")
    .filter((line) => /SCAN|SEARCH|LIST SUBQUERY/.test(line))
    .map((line) => ({ detail: line.replace(/^[^A-Z]*/, "").trim() }));
}

function estimateScanRows(detail: string, tableCounts: Record<string, number>): number {
  const scan = detail.match(/SCAN (?:TABLE )?(\w+)/i);
  if (scan) {
    const target = scan[1];
    if (target === "sa") {
      return tableCounts.song_artists ?? 0;
    }
    return tableCounts[target] ?? 0;
  }
  const search = detail.match(/SEARCH (\w+)/i);
  if (search) {
    return 1;
  }
  return 0;
}

function tableCounts(): Record<string, number> {
  const tables = ["songs", "stanzas", "chord_lines", "song_artists", "artists", "song_sections"];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const raw = execSync(
      `sqlite3 ${JSON.stringify(localDbPath())} ${JSON.stringify(`SELECT COUNT(*) FROM ${table}`)}`,
      { encoding: "utf8" },
    );
    counts[table] = Number(raw.trim());
  }
  return counts;
}

function printExplainReport(): void {
  const counts = tableCounts();
  const samples: { label: string; sql: string; args: unknown[] }[] = [
    {
      label: "song by slug",
      sql: `SELECT id, title, slug, region, url FROM songs WHERE slug = ? LIMIT 1`,
      args: ["hello"],
    },
    {
      label: "related songs",
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
      args: [1, 1, 5],
    },
    {
      label: "random song",
      sql: `SELECT title, slug FROM songs WHERE id = (ABS(RANDOM()) % (SELECT MAX(id) FROM songs)) + 1 LIMIT 1`,
      args: [],
    },
    {
      label: "artist page songs",
      sql: `
        SELECT s.title, s.slug
        FROM songs s
        JOIN song_artists sa ON sa.song_id = s.id
        WHERE sa.artist_id = ?
        ORDER BY s.title
      `,
      args: [1],
    },
  ];

  console.log("\nLocal EXPLAIN estimates (per request, one execution)");
  console.log("-".repeat(90));
  for (const sample of samples) {
    const plan = explain(sample.sql, sample.args);
    let estimated = 0;
    for (const step of plan) {
      estimated += estimateScanRows(step.detail, counts);
    }
    console.log(`\n${sample.label}`);
    console.log(`  estimated row scans: ~${estimated.toLocaleString()}`);
    console.log(`  rows returned is much smaller — Turso bills scans, not results`);
    for (const step of plan) {
      console.log(`  ${step.detail}`);
    }
  }
}

async function runLiveProbe(iterations: number): Promise<void> {
  const databaseUrl = getDatabaseUrl();
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const before = fetchOrgRowsRead();
  const beforePageFlowReads = pageFlowReads(fetchTursoQueryStats());
  const sampleSlug =
    databaseUrl.startsWith("file:") ? "hello" : (
      String(
        (
          await client.execute({
            sql: `SELECT slug FROM songs ORDER BY slug LIMIT 1`,
          })
        ).rows[0]?.slug,
      )
    );

  if (!sampleSlug) {
    console.error("Could not pick a sample slug.");
    process.exit(1);
  }

  console.log(`\nLive Turso probe: ${iterations}x full song-page DB flow for slug "${sampleSlug}"`);
  console.log("-".repeat(90));

  for (let i = 0; i < iterations; i += 1) {
    const song = await dbFetchSongBySlug(client, sampleSlug);
    if (!song) {
      continue;
    }
    await dbFetchRelatedSongs(client, song.id, 5);
  }

  const after = fetchOrgRowsRead();
  const afterPageFlowReads = pageFlowReads(fetchTursoQueryStats());
  if (before !== null && after !== null) {
    const delta = after - before;
    console.log(`Org rows read before: ${before.toLocaleString()}`);
    console.log(`Org rows read after:  ${after.toLocaleString()}`);
    console.log(`Delta for ${iterations} page loads: ${delta.toLocaleString()}`);
    console.log(`Estimated per page load: ~${Math.round(delta / iterations).toLocaleString()} rows read`);
  } else {
    console.log("Could not read org-level rows read from `turso plan show`.");
    console.log("Run `turso plan show` before and after manually to compare.");
  }

  if (beforePageFlowReads !== null && afterPageFlowReads !== null) {
    const delta = afterPageFlowReads - beforePageFlowReads;
    console.log(`Precise page-flow query counter before: ${beforePageFlowReads.toLocaleString()}`);
    console.log(`Precise page-flow query counter after:  ${afterPageFlowReads.toLocaleString()}`);
    console.log(`Precise delta for ${iterations} page loads: ${delta.toLocaleString()}`);
    console.log(`Precise estimated per page load: ~${Math.round(delta / iterations).toLocaleString()} rows read`);
  }
}

function printStaticProbe(slug: string): void {
  console.log("\nStatic-store probe (no Turso)");
  console.log("-".repeat(90));
  if (!hasStaticData()) {
    console.log("generated/manifest.json not found. Run: npm run build:static-data");
    return;
  }
  const song = getStaticSong(slug);
  console.log(`hasStaticData: true`);
  console.log(`getStaticSong("${slug}"): ${song ? "hit" : "miss"}`);
  if (song) {
    console.log(`  stanzas: ${song.sections.reduce((n, s) => n + s.stanzas.length, 0)}`);
    console.log(`  related: ${song.relatedSongs.length}`);
    console.log(`  Turso row reads for this path: 0`);
  }
}

async function main(): Promise<void> {
  const iterations = Number(process.argv.find((arg) => arg.startsWith("--iterations="))?.split("=")[1] ?? 10);
  const live = process.argv.includes("--live");
  const slugArg = process.argv.find((arg) => arg.startsWith("--slug="))?.split("=")[1] ?? "hello";

  console.log("Turso cost debugger");
  console.log("=".repeat(90));
  console.log("How to use:");
  console.log("  npm run debug:turso-cost");
  console.log("  npm run debug:turso-cost -- --live --iterations=20");
  console.log("  turso db inspect strimpello --queries   # cumulative production stats");
  console.log("  turso plan show                         # org quota / total rows read");

  const stats = fetchTursoQueryStats();
  if (stats) {
    console.log("\nProduction query stats (cumulative rows read, from Turso inspect)");
    console.log("-".repeat(90));
    console.log(`${"ROWS READ".padStart(14)}  ${"WRITES".padStart(8)}  QUERY`);
    for (const row of stats.slice(0, 12)) {
      console.log(
        `${row.reads.toLocaleString().padStart(14)}  ${row.writes.toLocaleString().padStart(8)}  ${row.sql.slice(0, 90)}`,
      );
    }
    const total = stats.reduce((sum, row) => sum + row.reads, 0);
    console.log(`\nTracked cumulative reads in inspect output: ${total.toLocaleString()}`);
    console.log("Note: totals can exceed org quota because inspect is per-query-shape accounting.");
  } else {
    console.log("\nSkipping Turso inspect (CLI unavailable or not logged in).");
  }

  printExplainReport();
  printStaticProbe(slugArg);

  if (live) {
    await runLiveProbe(iterations);
  } else {
    console.log("\nRun with `--live --iterations=20` to measure real Turso delta for one song page flow.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
