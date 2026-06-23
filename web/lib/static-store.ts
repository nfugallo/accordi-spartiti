import { readFileSync, existsSync } from "fs";
import path from "path";
import type {
  ArtistSummary,
  RegionSummary,
  SongDetail,
  SongSummary,
} from "./types";

export type StaticSongRecord = SongDetail & {
  relatedSongs: SongSummary[];
};

export type StaticArtistRecord = {
  name: string;
  displayName: string;
  songs: SongSummary[];
};

export type StaticManifest = {
  version: number;
  songCount: number;
  artistCount: number;
  builtAt: string;
};

const GENERATED_DIR = path.join(process.cwd(), "generated");

let manifest: StaticManifest | null = null;
let songSlugs: string[] | null = null;
let regions: RegionSummary[] | null = null;
let artistRoutes: { region: string; slug: string }[] | null = null;

export function hasStaticData(): boolean {
  return existsSync(path.join(GENERATED_DIR, "manifest.json"));
}

function songFilePath(slug: string): string {
  const prefix = slug.slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, "x") || "xx";
  return path.join(GENERATED_DIR, "songs", prefix, `${slug}.json`);
}

function artistFilePath(region: string, slug: string): string {
  return path.join(GENERATED_DIR, "artists", region, `${slug}.json`);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function getStaticManifest(): StaticManifest {
  if (!manifest) {
    manifest = readJson<StaticManifest>(path.join(GENERATED_DIR, "manifest.json"));
  }
  return manifest;
}

export function getStaticSongSlugs(): string[] {
  if (!songSlugs) {
    songSlugs = readJson<string[]>(path.join(GENERATED_DIR, "song-slugs.json"));
  }
  return songSlugs;
}

export function getStaticRegions(): RegionSummary[] {
  if (!regions) {
    regions = readJson<RegionSummary[]>(path.join(GENERATED_DIR, "regions.json"));
  }
  return regions;
}

export function getStaticArtistRoutes(): { region: string; slug: string }[] {
  if (!artistRoutes) {
    artistRoutes = readJson<{ region: string; slug: string }[]>(
      path.join(GENERATED_DIR, "artist-routes.json"),
    );
  }
  return artistRoutes;
}

export function getStaticSong(slug: string): StaticSongRecord | null {
  const filePath = songFilePath(slug);
  if (!existsSync(filePath)) {
    return null;
  }
  return readJson<StaticSongRecord>(filePath);
}

export function getStaticArtist(region: string, slug: string): StaticArtistRecord | null {
  const filePath = artistFilePath(region, slug);
  if (!existsSync(filePath)) {
    return null;
  }
  return readJson<StaticArtistRecord>(filePath);
}

export function getStaticArtistsByRegion(region: string): ArtistSummary[] {
  const filePath = path.join(GENERATED_DIR, "regions", `${region}.json`);
  if (!existsSync(filePath)) {
    return [];
  }
  return readJson<ArtistSummary[]>(filePath);
}

export function getStaticRandomSong(): SongSummary | null {
  const slugs = getStaticSongSlugs();
  if (slugs.length === 0) {
    return null;
  }
  const slug = slugs[Math.floor(Math.random() * slugs.length)]!;
  const song = getStaticSong(slug);
  if (!song) {
    return { title: slug, slug };
  }
  return { title: song.title, slug: song.slug };
}

export function listStaticSongSlugs(offset: number, limit: number): { slug: string }[] {
  return getStaticSongSlugs()
    .slice(offset, offset + limit)
    .map((slug) => ({ slug }));
}

export function listStaticArtistRoutes(
  offset: number,
  limit: number,
): { region: string; slug: string }[] {
  return getStaticArtistRoutes().slice(offset, offset + limit);
}

export function countStaticSongs(): number {
  return getStaticManifest().songCount;
}

export function countStaticArtists(): number {
  return getStaticManifest().artistCount;
}
