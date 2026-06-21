export type StanzaType = "pair" | "lyric_only" | "chords_only";

export type ChordLine = {
  lineIndex: number;
  rawLine: string;
};

export type Stanza = {
  sectionIndex: number;
  stanzaIndex: number;
  stanzaType: StanzaType;
  lyric: string | null;
  chordLines: ChordLine[];
};

export type SongSection = {
  sectionIndex: number;
  keySignature: string;
  stanzas: Stanza[];
};

export type ArtistRef = {
  name: string;
  displayName: string;
  slug: string;
  region: string;
};

export type SongDetail = {
  id: number;
  title: string;
  slug: string;
  region: string | null;
  sourceUrl: string | null;
  artists: ArtistRef[];
  keys: string[];
  sections: SongSection[];
};

export type SongSummary = {
  title: string;
  slug: string;
};

export type SearchResult = {
  type: "song" | "artist";
  title: string;
  slug: string;
  subtitle: string;
  href: string;
};

export type RegionSummary = {
  slug: string;
  label: string;
  artistCount: number;
};

export type ArtistSummary = {
  name: string;
  displayName: string;
  slug: string;
  region: string;
  songCount: number;
};

export type DisplayMode = "both" | "chords" | "lyrics";

export type SongSettings = {
  transpose: number;
  capo: number;
  fontScale: number;
  displayMode: DisplayMode;
  autoscrollSpeed: number;
};

export const DEFAULT_SONG_SETTINGS: SongSettings = {
  transpose: 0,
  capo: 0,
  fontScale: 1,
  displayMode: "both",
  autoscrollSpeed: 1,
};
