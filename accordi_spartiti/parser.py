"""Parse chord sheet HTML / monospace text from accordiespartiti.it."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

_CHORD_BODY = (
    r"(?:DO|RE|MI|FA|SOL|LA|SI)(?:b|#)?(?:\d+[+\-]?)?"
    r"(?:m?(?:aug|dim|add|b|#)?(?:\d+[+\-]?)?(?:/?\d+[+\-]?)?)?"
    r"(?:/(?:DO|RE|MI|FA|SOL|LA|SI)(?:b|#)*)?"
)
CHORD = re.compile(_CHORD_BODY)
CHORD_LINE = re.compile(rf"^\s*(?:{_CHORD_BODY}\s*)+$")
CHIAVE_BLOCKS = re.compile(
    r'<div class="chiave" name="([^"]+)">\s*(.*?)\s*</div>',
    re.S,
)


@dataclass
class ChordPlacement:
    chord_line_index: int
    column_pos: int
    chord: str


@dataclass
class Stanza:
    stanza_type: str
    lyric: str | None
    chord_lines: list[str] = field(default_factory=list)
    placements: list[ChordPlacement] = field(default_factory=list)


@dataclass
class SongSection:
    key_signature: str
    raw_text: str
    stanzas: list[Stanza] = field(default_factory=list)


def chords_in_line(line: str) -> list[tuple[int, str]]:
    return [(match.start(), match.group()) for match in CHORD.finditer(line)]


def is_chord_line(line: str) -> bool:
    return bool(line.strip()) and bool(CHORD_LINE.match(line))


def parse_stanzas(text: str) -> list[Stanza]:
    lines = text.replace("\r\n", "\n").split("\n")
    stanzas: list[Stanza] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if is_chord_line(line):
            chord_lines = [line]
            next_index = index + 1
            while next_index < len(lines) and is_chord_line(lines[next_index]):
                chord_lines.append(lines[next_index])
                next_index += 1
            while next_index < len(lines) and not lines[next_index].strip():
                next_index += 1
            if next_index < len(lines) and not is_chord_line(lines[next_index]):
                placements: list[ChordPlacement] = []
                for chord_line_index, chord_line in enumerate(chord_lines):
                    for column_pos, chord in chords_in_line(chord_line):
                        placements.append(
                            ChordPlacement(
                                chord_line_index=chord_line_index,
                                column_pos=column_pos,
                                chord=chord,
                            )
                        )
                stanzas.append(
                    Stanza(
                        stanza_type="pair",
                        lyric=lines[next_index],
                        chord_lines=chord_lines,
                        placements=placements,
                    )
                )
                index = next_index + 1
                continue
            stanzas.append(
                Stanza(
                    stanza_type="chords_only",
                    lyric=None,
                    chord_lines=chord_lines,
                    placements=[
                        ChordPlacement(chord_line_index=i, column_pos=col, chord=ch)
                        for i, chord_line in enumerate(chord_lines)
                        for col, ch in chords_in_line(chord_line)
                    ],
                )
            )
            index = next_index
            continue
        stanzas.append(Stanza(stanza_type="lyric_only", lyric=line))
        index += 1
    return stanzas


def extract_sections(html: str) -> list[SongSection]:
    sections: list[SongSection] = []
    for key_signature, raw_text in CHIAVE_BLOCKS.findall(html):
        normalized = raw_text.replace("\r\n", "\n")
        sections.append(
            SongSection(
                key_signature=key_signature,
                raw_text=normalized,
                stanzas=parse_stanzas(normalized),
            )
        )
    return sections


def region_from_url(url: str) -> str | None:
    match = re.search(r"/accordi/([^/]+)/", url)
    return match.group(1) if match else None


def unique_chords(sections: list[SongSection]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for section in sections:
        for stanza in section.stanzas:
            for placement in stanza.placements:
                counts[placement.chord] = counts.get(placement.chord, 0) + 1
    return counts
