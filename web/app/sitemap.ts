import type { MetadataRoute } from "next";
import {
  countArtists,
  countSongs,
  getRegions,
  listArtistRoutes,
  listSongSlugs,
} from "@/lib/queries";
import { getSiteUrl } from "@/lib/site-url";

const CHUNK_SIZE = 5000;

export async function generateSitemaps() {
  const [songCount, artistCount] = await Promise.all([countSongs(), countArtists()]);
  const songPages = Math.max(1, Math.ceil(songCount / CHUNK_SIZE));
  const artistPages = Math.max(1, Math.ceil(artistCount / CHUNK_SIZE));
  const ids: { id: number }[] = [{ id: 0 }];
  for (let i = 1; i <= songPages; i++) {
    ids.push({ id: i });
  }
  for (let i = 0; i < artistPages; i++) {
    ids.push({ id: songPages + 1 + i });
  }
  return ids;
}

export default async function sitemap(props: {
  id: Promise<number>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const siteUrl = getSiteUrl();
  const now = new Date();

  if (id === 0) {
    const regions = await getRegions();
    return [
      { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
      { url: `${siteUrl}/explore`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
      ...regions.map((region) => ({
        url: `${siteUrl}/explore/${region.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  }

  const songPages = Math.max(1, Math.ceil((await countSongs()) / CHUNK_SIZE));

  if (id >= 1 && id <= songPages) {
    const offset = (id - 1) * CHUNK_SIZE;
    const songs = await listSongSlugs(offset, CHUNK_SIZE);
    return songs.map((song) => ({
      url: `${siteUrl}/song/${song.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  const artistIndex = id - songPages - 1;
  const artists = await listArtistRoutes(artistIndex * CHUNK_SIZE, CHUNK_SIZE);
  return artists.map((artist) => ({
    url: `${siteUrl}/artist/${artist.region}/${artist.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}
