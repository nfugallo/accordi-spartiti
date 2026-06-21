#!/usr/bin/env python3
"""Crawl accordiespartiti.it into a local SQLite database."""

from __future__ import annotations

import argparse
import html
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from accordi_spartiti.api import ApiClient, _header
from accordi_spartiti.db import ArtistRecord, Database, SongRecord
from accordi_spartiti.parser import extract_sections, region_from_url

DEFAULT_DB = Path("data/accordi.db")


def strip_html(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text))


def _header_from_api(api: ApiClient, path: str, params: dict, name: str) -> str | None:
    payload = api.get_json(path, params)
    headers = payload.get("_headers", {}) if isinstance(payload, dict) else {}
    return _header(headers, name)


def sync_artists(db: Database, api: ApiClient) -> int:
    count = 0
    for region in api.fetch_regions():
        region_slug = region["slug"]
        count += _sync_artist_branch(db, api, region["id"], region_slug)
    db.conn.commit()
    return count


def _sync_artist_branch(
    db: Database,
    api: ApiClient,
    parent_id: int,
    region_slug: str,
) -> int:
    count = 0
    for category in api.paginate("categories", {"parent": parent_id}):
        if category["count"] > 0:
            db.upsert_artist(
                ArtistRecord(
                    wp_category_id=category["id"],
                    name=strip_html(category["name"]),
                    slug=category["slug"],
                    region=region_slug,
                    url=category["link"],
                )
            )
            count += 1
            continue
        count += _sync_artist_branch(db, api, category["id"], region_slug)
    return count


def post_to_song_record(post: dict, artist_wp_ids: set[int]) -> SongRecord | None:
    content = post.get("content", {}).get("rendered", "")
    sections = extract_sections(content)
    if not sections:
        return None
    linked_artists = [cat_id for cat_id in post.get("categories", []) if cat_id in artist_wp_ids]
    return SongRecord(
        wp_post_id=post["id"],
        title=strip_html(post["title"]["rendered"]),
        slug=post["slug"],
        url=post["link"],
        region=region_from_url(post["link"]),
        wp_created_at=post.get("date"),
        wp_modified_at=post.get("modified"),
        artist_wp_category_ids=linked_artists,
        sections=sections,
    )


def sync_songs(
    db: Database,
    api: ApiClient,
    *,
    start_page: int,
    limit: int | None,
    resume: bool,
    workers: int = 1,
) -> dict[str, int]:
    artist_wp_ids = db.known_artist_wp_ids()
    if not artist_wp_ids:
        raise RuntimeError("No artists in database. Run sync-artists first.")

    if resume:
        saved = db.get_state("last_completed_page")
        if saved:
            start_page = max(start_page, int(saved) + 1)

    inserted = 0
    skipped = 0
    processed = 0
    db_lock = threading.Lock()

    total_posts = int(_header_from_api(api, "posts", {"per_page": 1, "page": 1}, "X-WP-Total") or 0)
    total_pages = max(1, (total_posts + 99) // 100)
    print(
        f"Scanning up to {total_posts} WP posts across ~{total_pages} pages "
        f"(workers={workers})"
    )

    page = start_page
    started = time.perf_counter()

    while page <= total_pages:
        if limit is not None and processed >= limit:
            break

        batch_end = min(total_pages, page + workers - 1)
        if limit is not None:
            remaining_pages = max(1, (limit - processed + 99) // 100)
            batch_end = min(batch_end, page + remaining_pages - 1)

        page_numbers = list(range(page, batch_end + 1))

        def fetch_page(page_number: int) -> tuple[int, list[dict], int]:
            fetch_api = ApiClient(delay_seconds=0)
            posts, page_total = fetch_api.fetch_posts(page=page_number, per_page=100)
            return page_number, posts, page_total

        fetched: dict[int, tuple[list[dict], int]] = {}
        if workers == 1:
            page_number, posts, page_total = fetch_page(page_numbers[0])
            fetched[page_number] = (posts, page_total)
        else:
            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = [pool.submit(fetch_page, n) for n in page_numbers]
                for future in as_completed(futures):
                    page_number, posts, page_total = future.result()
                    fetched[page_number] = (posts, page_total)

        for page_number in sorted(fetched):
            posts, page_total = fetched[page_number]
            if not posts:
                continue

            for post in posts:
                if limit is not None and processed >= limit:
                    break

                processed += 1
                wp_post_id = post["id"]
                with db_lock:
                    if db.song_exists(wp_post_id):
                        continue

                    song = post_to_song_record(post, artist_wp_ids)
                    if song is None:
                        db.record_skip(wp_post_id, "no_chiave_block")
                        skipped += 1
                        continue

                    db.insert_song(song)
                    inserted += 1

            with db_lock:
                db.set_state("last_completed_page", str(page_number))

            elapsed = time.perf_counter() - started
            rate = processed / elapsed if elapsed else 0
            print(
                f"Page {page_number}/{page_total} — "
                f"inserted {inserted}, skipped {skipped}, "
                f"{rate:.0f} posts/s"
            )

            if page_number >= page_total:
                page = total_pages + 1
                break

        page = batch_end + 1

    elapsed = time.perf_counter() - started
    return {
        "inserted": inserted,
        "skipped": skipped,
        "processed": processed,
        "stopped_at_page": page - 1,
        "elapsed_seconds": round(elapsed, 1),
        "posts_per_second": round(processed / elapsed, 1) if elapsed else 0,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB,
        help=f"SQLite database path (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Seconds between API requests for sequential mode (default: 0.25)",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init-db", help="Create database schema")

    sub.add_parser("sync-artists", help="Fetch all artist categories")

    songs = sub.add_parser("sync-songs", help="Fetch and parse all posts with chords")
    songs.add_argument("--start-page", type=int, default=1)
    songs.add_argument("--limit", type=int, default=None, help="Max posts to process")
    songs.add_argument(
        "--resume",
        action="store_true",
        help="Continue from last completed page stored in DB",
    )
    songs.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Parallel page fetchers (default: 1)",
    )

    sub.add_parser("stats", help="Show database counts")

    all_cmd = sub.add_parser("sync-all", help="sync-artists then sync-songs")
    all_cmd.add_argument("--start-page", type=int, default=1)
    all_cmd.add_argument("--limit", type=int, default=None)
    all_cmd.add_argument("--resume", action="store_true")
    all_cmd.add_argument("--workers", type=int, default=1)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    db = Database(args.db)
    api = ApiClient(delay_seconds=args.delay)

    try:
        if args.command == "init-db":
            print(f"Database ready at {args.db}")
            return 0

        if args.command == "stats":
            for key, value in db.stats().items():
                print(f"{key}: {value}")
            last_page = db.get_state("last_completed_page")
            if last_page:
                print(f"last_completed_page: {last_page}")
            return 0

        if args.command == "sync-artists":
            count = sync_artists(db, api)
            print(f"Synced {count} artists into {args.db}")
            return 0

        if args.command == "sync-songs":
            result = sync_songs(
                db,
                api,
                start_page=args.start_page,
                limit=args.limit,
                resume=args.resume,
                workers=args.workers,
            )
            print(result)
            return 0

        if args.command == "sync-all":
            artist_count = sync_artists(db, api)
            print(f"Synced {artist_count} artists")
            result = sync_songs(
                db,
                api,
                start_page=args.start_page,
                limit=args.limit,
                resume=args.resume,
                workers=args.workers,
            )
            print(result)
            return 0

        parser.error(f"Unknown command: {args.command}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
