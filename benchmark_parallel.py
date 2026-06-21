#!/usr/bin/env python3
"""Benchmark parallel fetch rates against accordiespartiti.it WP API."""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field

BASE_URL = "https://www.accordiespartiti.it/wp-json/wp/v2"
USER_AGENT = "accordi-spartiti-benchmark/0.1"


@dataclass
class FetchResult:
    page: int
    ok: bool
    status: int | None
    posts: int
    elapsed_ms: float
    error: str | None = None


@dataclass
class BenchmarkRun:
    workers: int
    pages: int
    delay: float
    results: list[FetchResult] = field(default_factory=list)

    @property
    def ok_count(self) -> int:
        return sum(1 for r in self.results if r.ok)

    @property
    def error_count(self) -> int:
        return sum(1 for r in self.results if not r.ok)

    @property
    def total_posts(self) -> int:
        return sum(r.posts for r in self.results if r.ok)

    @property
    def wall_seconds(self) -> float:
        if not self.results:
            return 0.0
        return max(r.elapsed_ms for r in self.results) / 1000

    @property
    def statuses(self) -> dict[int, int]:
        counts: dict[int, int] = {}
        for result in self.results:
            if result.status is not None:
                counts[result.status] = counts.get(result.status, 0) + 1
        return counts


def fetch_page(page: int, delay: float) -> FetchResult:
    params = urllib.parse.urlencode({"page": page, "per_page": 100})
    url = f"{BASE_URL}/posts?{params}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    if delay:
        time.sleep(delay)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read()
            elapsed_ms = (time.perf_counter() - started) * 1000
            posts = json.loads(body)
            return FetchResult(
                page=page,
                ok=True,
                status=response.status,
                posts=len(posts),
                elapsed_ms=elapsed_ms,
            )
    except urllib.error.HTTPError as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        return FetchResult(
            page=page,
            ok=False,
            status=exc.code,
            posts=0,
            elapsed_ms=elapsed_ms,
            error=str(exc),
        )
    except Exception as exc:  # noqa: BLE001 — benchmark captures all failures
        elapsed_ms = (time.perf_counter() - started) * 1000
        return FetchResult(
            page=page,
            ok=False,
            status=None,
            posts=0,
            elapsed_ms=elapsed_ms,
            error=f"{type(exc).__name__}: {exc}",
        )


def run_benchmark(
    *,
    workers: int,
    pages: int,
    start_page: int,
    delay: float,
) -> BenchmarkRun:
    run = BenchmarkRun(workers=workers, pages=pages, delay=delay)
    page_numbers = list(range(start_page, start_page + pages))
    batch_started = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_page, page, delay): page for page in page_numbers}
        for future in as_completed(futures):
            run.results.append(future.result())
    batch_elapsed = time.perf_counter() - batch_started
    run._batch_elapsed = batch_elapsed  # type: ignore[attr-defined]
    return run


def print_run(run: BenchmarkRun) -> None:
    batch_elapsed = getattr(run, "_batch_elapsed", run.wall_seconds)
    posts_per_sec = run.total_posts / batch_elapsed if batch_elapsed else 0
    pages_per_sec = run.ok_count / batch_elapsed if batch_elapsed else 0
    avg_latency = (
        sum(r.elapsed_ms for r in run.results if r.ok) / run.ok_count if run.ok_count else 0
    )
    print(
        f"workers={run.workers:2d}  delay={run.delay:.2f}s  "
        f"ok={run.ok_count}/{run.pages}  posts={run.total_posts}  "
        f"{posts_per_sec:6.0f} posts/s  {pages_per_sec:5.1f} pages/s  "
        f"avg_latency={avg_latency:.0f}ms  wall={batch_elapsed:.1f}s"
    )
    if run.statuses:
        print(f"  HTTP statuses: {dict(sorted(run.statuses.items()))}")
    errors = [r for r in run.results if not r.ok]
    if errors:
        sample = errors[:3]
        for err in sample:
            print(f"  error page {err.page}: status={err.status} {err.error}")
        if len(errors) > 3:
            print(f"  ... and {len(errors) - 3} more errors")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages", type=int, default=20, help="Pages per worker config")
    parser.add_argument("--start-page", type=int, default=50, help="Avoid already-crawled pages")
    parser.add_argument(
        "--workers",
        type=int,
        nargs="*",
        default=[1, 2, 4, 8, 16],
        help="Concurrency levels to test",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Per-request delay inside each worker (seconds)",
    )
    args = parser.parse_args()

    print(
        f"Benchmark: {args.pages} pages starting at {args.start_page}, "
        f"delay={args.delay}s per request\n"
    )
    for workers in args.workers:
        run = run_benchmark(
            workers=workers,
            pages=args.pages,
            start_page=args.start_page,
            delay=args.delay,
        )
        print_run(run)
        time.sleep(1)


if __name__ == "__main__":
    main()
