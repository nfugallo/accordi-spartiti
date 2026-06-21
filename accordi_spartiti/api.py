"""WordPress REST API client for accordiespartiti.it."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

BASE_URL = "https://www.accordiespartiti.it/wp-json/wp/v2"
USER_AGENT = "accordi-spartiti-scraper/0.1 (personal archive)"
REGION_PARENT_ID = 1557


def _header(headers: dict[str, str], name: str) -> str | None:
    target = name.lower()
    for key, value in headers.items():
        if key.lower() == target:
            return value
    return None


class ApiClient:
    def __init__(self, delay_seconds: float = 0.25) -> None:
        self.delay_seconds = delay_seconds
        self._last_request_at = 0.0

    def _wait(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.delay_seconds:
            time.sleep(self.delay_seconds - elapsed)

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        url = f"{BASE_URL}/{path.lstrip('/')}{query}"
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        self._wait()
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                self._last_request_at = time.monotonic()
                body = response.read()
                headers = response.headers
        except urllib.error.HTTPError as exc:
            if exc.code == 400 and params and "page" in params:
                return []
            raise
        payload = json.loads(body)
        if isinstance(payload, list):
            payload = {"items": payload, "_headers": dict(headers)}
        elif isinstance(payload, dict):
            payload["_headers"] = dict(headers)
        return payload

    def paginate(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        per_page: int = 100,
    ):
        page = 1
        base_params = dict(params or {})
        base_params["per_page"] = per_page
        while True:
            base_params["page"] = page
            payload = self.get_json(path, base_params)
            items = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
            if not items:
                break
            for item in items:
                yield item
            headers = payload.get("_headers", {}) if isinstance(payload, dict) else {}
            total_pages = int(_header(headers, "X-WP-TotalPages") or page)
            if page >= total_pages:
                break
            page += 1

    def fetch_regions(self) -> list[dict[str, Any]]:
        return list(self.paginate("categories", {"parent": REGION_PARENT_ID}))

    def fetch_artists_for_region(self, region_id: int) -> list[dict[str, Any]]:
        return list(self.paginate("categories", {"parent": region_id}))

    def fetch_posts(self, *, page: int, per_page: int = 100) -> tuple[list[dict[str, Any]], int]:
        payload = self.get_json("posts", {"page": page, "per_page": per_page})
        items = payload["items"]
        headers = payload["_headers"]
        total_pages = int(_header(headers, "X-WP-TotalPages") or 1)
        return items, total_pages
