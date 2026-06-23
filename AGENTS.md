## Learned User Preferences
- Keep UI changes modern, mobile-first, centered, and minimal; avoid cluttered containers and oversized controls.
- Prefer the bottom navigation/command surface to stay small, floating, liquid-glass styled, and easy to understand.
- Put song actions such as print, share, and copy near the title instead of crowding the bottom command bar.
- Preserve user choices such as selected instrument across sessions when a control would otherwise ask repeatedly.
- Make scalability explicit for performance or indexing changes; avoid solutions tuned only to the current dataset.

## Learned Workspace Facts
- `accordi-spartiti` is the Strimpello chord-sheet app: a Python scraper plus a Next.js web app under `web/`.
- The scraper can recover chord placement from accordiespartiti.it because songs expose monospace chord-over-lyrics text in WordPress REST `div.chiave` blocks.
- The full crawl produced about 19,449 songs, 2,642 artists, 1,924,144 chord placements, 1,762 unique chords, and 588 skipped posts without chord blocks.
- The web app uses Turso/libSQL for the scraped SQLite database and keeps local development compatible with `data/accordi.db`.
- The DB stores WordPress artist category names verbatim, such as `Lauro (Achille)`; the app should display these as natural artist names such as `Achille Lauro`.
- Production search performance relies on a static sharded client search catalog with server-side FTS as the scalable fallback.
