# accordi-spartiti

Local archive of [accordiespartiti.it](https://www.accordiespartiti.it) chord sheets.

## Setup

No dependencies beyond Python 3.12+.

## Crawl

```bash
# Create schema
python3 crawl.py init-db

# Fetch artist index (~2.6k artists)
python3 crawl.py sync-artists

# Fetch all songs with chord sheets (resumable)
python3 crawl.py sync-songs --resume --workers 16

# Benchmark parallel fetch rates
python3 benchmark_parallel.py --pages 30 --workers 1 4 8 16

# Or both in one go
python3 crawl.py sync-all --resume

# Try a small batch first
python3 crawl.py sync-artists
python3 crawl.py sync-songs --limit 50
```

Database default path: `data/accordi.db`

## Inspect

```bash
python3 crawl.py stats
sqlite3 data/accordi.db "SELECT title, region FROM songs LIMIT 10;"
```

## Preview one song as HTML

```bash
python3 build_preview.py 116736 poesie-clandestine.html
python3 -m http.server 8765
```

## Database schema

- `artists` — WP category per artist
- `songs` — title, url, region, timestamps
- `song_sections` — one row per `div.chiave` block (key + raw text)
- `stanzas` — parsed lyric/chord groups
- `chord_lines` — raw monospace chord lines per stanza
- `chord_placements` — chord name + column position
- `song_chords` — unique chords used per song with counts

## Web app

Next.js viewer in [`web/`](web/) — Cmd+K search, chord-over-lyrics display.

```bash
cd web
npm install
npm run build:search-index
npm run dev
```

See [web/README.md](web/README.md) for Vercel + Turso deployment.
