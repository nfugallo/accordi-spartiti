import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SongGeoContent } from "@/components/song-geo-content";
import { SongViewer } from "@/components/song-viewer";
import { getRelatedSongs, getSongBySlug } from "@/lib/queries";
import { buildSongJsonLd, buildSongMetadata } from "@/lib/seo";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 86_400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) {
    return { title: "Song not found" };
  }
  return buildSongMetadata(song);
}

export default async function SongPage({ params }: PageProps) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const relatedSongs = await getRelatedSongs(song.id, 5, song.slug);
  const jsonLd = buildSongJsonLd(song, relatedSongs);

  return (
    <>
      <JsonLd data={jsonLd} />
      <SongGeoContent song={song} />
      <SongViewer song={song} relatedSongs={relatedSongs} />
    </>
  );
}
