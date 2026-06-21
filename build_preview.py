#!/usr/bin/env python3
"""Parse accordiespartiti.it chord sheet text into HTML with aligned chords."""

from __future__ import annotations

import html
import json
import sys
import urllib.request
from pathlib import Path

from accordi_spartiti.parser import extract_sections, parse_stanzas


def fetch_post(post_id: int) -> dict:
    url = f"https://www.accordiespartiti.it/wp-json/wp/v2/posts/{post_id}"
    with urllib.request.urlopen(url) as resp:
        return json.load(resp)


def build_chord_line_html(line: str) -> str:
    from accordi_spartiti.parser import CHORD, chords_in_line

    if not line.strip():
        return "&nbsp;"
    parts: list[str] = []
    last = 0
    for col, chord in chords_in_line(line):
        parts.append(html.escape(line[last:col]))
        parts.append(f'<span class="chord">{html.escape(chord)}</span>')
        last = col + len(chord)
    parts.append(html.escape(line[last:]))
    return "".join(parts) if parts else html.escape(line)


def render_html(title: str, key: str, blocks: list) -> str:
    body_parts: list[str] = []
    for block in blocks:
        stanza_type = block.stanza_type if hasattr(block, "stanza_type") else block["type"]
        if stanza_type == "pair":
            chord_lines = block.chord_lines if hasattr(block, "chord_lines") else block["chord_lines"]
            lyric = block.lyric if hasattr(block, "lyric") else block["lyric"]
            body_parts.append('<div class="stanza">')
            for cl in chord_lines:
                body_parts.append(f'<div class="chord-row">{build_chord_line_html(cl)}</div>')
            body_parts.append(f'<div class="lyric-row">{html.escape(lyric)}</div>')
            body_parts.append("</div>")
        elif stanza_type == "chords_only":
            chord_lines = block.chord_lines if hasattr(block, "chord_lines") else block["chord_lines"]
            body_parts.append('<div class="stanza chords-only">')
            for cl in chord_lines:
                body_parts.append(f'<div class="chord-row">{build_chord_line_html(cl)}</div>')
            body_parts.append("</div>")
        else:
            lyric = block.lyric if hasattr(block, "lyric") else block["lyric"]
            body_parts.append(f'<div class="lyric-only">{html.escape(lyric)}</div>')

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{html.escape(title)} — chord preview</title>
  <style>
    :root {{
      --bg: #0f1117;
      --panel: #1a1d27;
      --text: #e8eaed;
      --muted: #9aa0a6;
      --chord: #ff6b6b;
      --accent: #7c9cff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: "SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace;
      line-height: 1.45;
    }}
    .wrap {{
      max-width: 920px;
      margin: 0 auto;
      padding: 2rem 1.25rem 4rem;
    }}
    header {{
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #2a2f3a;
    }}
    h1 {{
      margin: 0 0 .35rem;
      font-size: 1.75rem;
      font-family: system-ui, sans-serif;
      font-weight: 650;
    }}
    .meta {{
      color: var(--muted);
      font-family: system-ui, sans-serif;
      font-size: .95rem;
    }}
    .meta strong {{ color: var(--accent); }}
    .sheet {{
      background: var(--panel);
      border: 1px solid #2a2f3a;
      border-radius: 12px;
      padding: 1.5rem 1.25rem;
      overflow-x: auto;
    }}
    .stanza {{ margin-bottom: .35rem; }}
    .chord-row, .lyric-row, .lyric-only {{
      white-space: pre;
      font-size: 15px;
    }}
    .chord-row {{
      color: var(--chord);
      font-weight: 700;
      min-height: 1.35em;
    }}
    .lyric-row {{ color: var(--text); }}
    .lyric-only {{
      color: var(--text);
      margin: .15rem 0;
    }}
    .chord {{ color: var(--chord); }}
    footer {{
      margin-top: 1.5rem;
      color: var(--muted);
      font-family: system-ui, sans-serif;
      font-size: .85rem;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>{html.escape(title)}</h1>
      <div class="meta">Key <strong>{html.escape(key)}</strong> · parsed from accordiespartiti.it</div>
    </header>
    <div class="sheet">
{''.join(body_parts)}
    </div>
    <footer>
      Column positions preserved from source monospace layout.
    </footer>
  </div>
</body>
</html>
"""


def main() -> None:
    post_id = int(sys.argv[1]) if len(sys.argv) > 1 else 116736
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("poesie-clandestine.html")
    post = fetch_post(post_id)
    sections = extract_sections(post["content"]["rendered"])
    if not sections:
        raise SystemExit("No chord sections found")
    section = sections[0]
    out.write_text(
        render_html(post["title"]["rendered"], section.key_signature, section.stanzas),
        encoding="utf-8",
    )
    print(f"Wrote {out} ({len(section.stanzas)} stanzas, key={section.key_signature})")


if __name__ == "__main__":
    main()
