"""SQLite storage for scraped chord sheets."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from accordi_spartiti.parser import SongSection, unique_chords

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_category_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    region TEXT NOT NULL,
    url TEXT
);

CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_post_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    url TEXT NOT NULL,
    region TEXT,
    wp_created_at TEXT,
    wp_modified_at TEXT,
    scraped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS song_artists (
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (song_id, artist_id)
);

CREATE TABLE IF NOT EXISTS song_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    section_index INTEGER NOT NULL,
    key_signature TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    UNIQUE (song_id, section_index)
);

CREATE TABLE IF NOT EXISTS stanzas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    section_index INTEGER NOT NULL,
    stanza_index INTEGER NOT NULL,
    stanza_type TEXT NOT NULL CHECK (stanza_type IN ('pair', 'lyric_only', 'chords_only')),
    lyric TEXT,
    UNIQUE (song_id, section_index, stanza_index)
);

CREATE TABLE IF NOT EXISTS chord_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stanza_id INTEGER NOT NULL REFERENCES stanzas(id) ON DELETE CASCADE,
    line_index INTEGER NOT NULL,
    raw_line TEXT NOT NULL,
    UNIQUE (stanza_id, line_index)
);

CREATE TABLE IF NOT EXISTS chord_placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stanza_id INTEGER NOT NULL REFERENCES stanzas(id) ON DELETE CASCADE,
    chord_line_index INTEGER NOT NULL,
    column_pos INTEGER NOT NULL,
    chord TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS song_chords (
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    chord TEXT NOT NULL,
    occurrence_count INTEGER NOT NULL,
    PRIMARY KEY (song_id, chord)
);

CREATE TABLE IF NOT EXISTS crawl_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_skips (
    wp_post_id INTEGER PRIMARY KEY,
    reason TEXT NOT NULL,
    skipped_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_region ON songs(region);
CREATE INDEX IF NOT EXISTS idx_song_chords_chord ON song_chords(chord);
CREATE INDEX IF NOT EXISTS idx_chord_placements_chord ON chord_placements(chord);
"""


@dataclass
class ArtistRecord:
    wp_category_id: int
    name: str
    slug: str
    region: str
    url: str


@dataclass
class SongRecord:
    wp_post_id: int
    title: str
    slug: str
    url: str
    region: str | None
    wp_created_at: str | None
    wp_modified_at: str | None
    artist_wp_category_ids: list[int]
    sections: list[SongSection]


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    def upsert_artist(self, artist: ArtistRecord) -> int:
        self.conn.execute(
            """
            INSERT INTO artists (wp_category_id, name, slug, region, url)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(wp_category_id) DO UPDATE SET
                name = excluded.name,
                slug = excluded.slug,
                region = excluded.region,
                url = excluded.url
            """,
            (artist.wp_category_id, artist.name, artist.slug, artist.region, artist.url),
        )
        row = self.conn.execute(
            "SELECT id FROM artists WHERE wp_category_id = ?",
            (artist.wp_category_id,),
        ).fetchone()
        return int(row["id"])

    def artist_id_for_wp_category(self, wp_category_id: int) -> int | None:
        row = self.conn.execute(
            "SELECT id FROM artists WHERE wp_category_id = ?",
            (wp_category_id,),
        ).fetchone()
        return int(row["id"]) if row else None

    def known_artist_wp_ids(self) -> set[int]:
        rows = self.conn.execute("SELECT wp_category_id FROM artists").fetchall()
        return {int(row["wp_category_id"]) for row in rows}

    def song_exists(self, wp_post_id: int) -> bool:
        row = self.conn.execute(
            "SELECT 1 FROM songs WHERE wp_post_id = ?",
            (wp_post_id,),
        ).fetchone()
        return row is not None

    def get_state(self, key: str) -> str | None:
        row = self.conn.execute(
            "SELECT value FROM crawl_state WHERE key = ?",
            (key,),
        ).fetchone()
        return row["value"] if row else None

    def set_state(self, key: str, value: str) -> None:
        self.conn.execute(
            """
            INSERT INTO crawl_state (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (key, value),
        )
        self.conn.commit()

    def record_skip(self, wp_post_id: int, reason: str) -> None:
        self.conn.execute(
            """
            INSERT INTO crawl_skips (wp_post_id, reason, skipped_at)
            VALUES (?, ?, ?)
            ON CONFLICT(wp_post_id) DO UPDATE SET
                reason = excluded.reason,
                skipped_at = excluded.skipped_at
            """,
            (wp_post_id, reason, datetime.now(UTC).isoformat()),
        )
        self.conn.commit()

    def insert_song(self, song: SongRecord) -> int:
        scraped_at = datetime.now(UTC).isoformat()
        cursor = self.conn.execute(
            """
            INSERT INTO songs (
                wp_post_id, title, slug, url, region,
                wp_created_at, wp_modified_at, scraped_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                song.wp_post_id,
                song.title,
                song.slug,
                song.url,
                song.region,
                song.wp_created_at,
                song.wp_modified_at,
                scraped_at,
            ),
        )
        song_id = int(cursor.lastrowid)

        for artist_wp_id in song.artist_wp_category_ids:
            artist_id = self.artist_id_for_wp_category(artist_wp_id)
            if artist_id is not None:
                self.conn.execute(
                    "INSERT OR IGNORE INTO song_artists (song_id, artist_id) VALUES (?, ?)",
                    (song_id, artist_id),
                )

        for section_index, section in enumerate(song.sections):
            self.conn.execute(
                """
                INSERT INTO song_sections (song_id, section_index, key_signature, raw_text)
                VALUES (?, ?, ?, ?)
                """,
                (song_id, section_index, section.key_signature, section.raw_text),
            )
            for stanza_index, stanza in enumerate(section.stanzas):
                stanza_cursor = self.conn.execute(
                    """
                    INSERT INTO stanzas (
                        song_id, section_index, stanza_index, stanza_type, lyric
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        song_id,
                        section_index,
                        stanza_index,
                        stanza.stanza_type,
                        stanza.lyric,
                    ),
                )
                stanza_id = int(stanza_cursor.lastrowid)
                for line_index, chord_line in enumerate(stanza.chord_lines):
                    self.conn.execute(
                        """
                        INSERT INTO chord_lines (stanza_id, line_index, raw_line)
                        VALUES (?, ?, ?)
                        """,
                        (stanza_id, line_index, chord_line),
                    )
                for placement in stanza.placements:
                    self.conn.execute(
                        """
                        INSERT INTO chord_placements (
                            stanza_id, chord_line_index, column_pos, chord
                        ) VALUES (?, ?, ?, ?)
                        """,
                        (
                            stanza_id,
                            placement.chord_line_index,
                            placement.column_pos,
                            placement.chord,
                        ),
                    )

        for chord, count in unique_chords(song.sections).items():
            self.conn.execute(
                """
                INSERT INTO song_chords (song_id, chord, occurrence_count)
                VALUES (?, ?, ?)
                """,
                (song_id, chord, count),
            )

        self.conn.commit()
        return song_id

    def stats(self) -> dict[str, int]:
        return {
            "artists": self.conn.execute("SELECT COUNT(*) FROM artists").fetchone()[0],
            "songs": self.conn.execute("SELECT COUNT(*) FROM songs").fetchone()[0],
            "sections": self.conn.execute("SELECT COUNT(*) FROM song_sections").fetchone()[0],
            "stanzas": self.conn.execute("SELECT COUNT(*) FROM stanzas").fetchone()[0],
            "placements": self.conn.execute("SELECT COUNT(*) FROM chord_placements").fetchone()[0],
            "unique_chords": self.conn.execute(
                "SELECT COUNT(DISTINCT chord) FROM song_chords"
            ).fetchone()[0],
            "skipped": self.conn.execute("SELECT COUNT(*) FROM crawl_skips").fetchone()[0],
        }
