# Web app — **Strimpello**

Next.js viewer for the scraped chord database (~19k songs).

## Local development

```bash
# From repo root — ensure data/accordi.db exists (see main README)
cd web
npm install
npm run build:search-index   # builds FTS index on ../data/accordi.db
npm run dev
```

Open http://localhost:3000 — press **⌘K** (or **Ctrl+K**) to search.

Optional: set `NEXT_PUBLIC_SITE_URL` in `.env.local` for canonical URLs and sitemaps (see `.env.example`).

## Deploy to Vercel

1. **Import database to Turso**

   ```bash
   turso db create accords
   turso db import accords --from-file ../data/accordi.db
   turso db tokens create accords
   ```

2. **Build search index on Turso**

   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run build:search-index
   ```

3. **Vercel project**
   - Root directory: `web`
   - Environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_SITE_URL`

4. **After re-crawling** — re-import to Turso and rebuild FTS.

## Performance (scales with catalog size)

- **Search (browser):** build emits sharded static files under `public/search/` (max ~2,500 entries per shard; splits automatically as the catalog grows). Only relevant shards load per query.
- **Search (fallback):** `/api/search` uses SQLite FTS on Turso — works for any catalog size and handles edge cases the client shards may miss.
- **Pages:** song/artist data is cached at the edge for 24h (`revalidate`); DB queries run in parallel.

Set Vercel **Root Directory** to `web`.

## Routes

| Path | Description |
|------|-------------|
| `/` | Home with search hint and random song |
| `/explore` | Browse artists by region |
| `/explore/[region]` | Artists in one region |
| `/song/[slug]` | Chord sheet with transpose, capo, autoscroll, guitar/piano chords |
| `/artist/[region]/[slug]` | Artist song list |
| `/favorites` | Saved songs (localStorage) |
| `/random` | Redirect to a random song |
| `/api/search` | FTS search API |
| `/api/artwork` | Cover art (iTunes → MusicBrainz) |
| `/robots.txt`, `/sitemap/*.xml` | SEO |

## Musician features (song page)

- Transpose and capo (effective key shown in header)
- Chords / lyrics / both display modes and font size
- Autoscroll with speed control
- Piano and guitar chord diagrams on hover
- Copy, print, and share sheet
- Favorites (persisted in browser)
- Related songs by artist
- Source link to accordiespartiti.it

## Stack

- Next.js App Router
- `@libsql/client` (local file + Turso)
- `cmdk` command palette
- Tailwind CSS v4
