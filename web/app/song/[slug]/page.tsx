import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongViewer } from "@/components/song-viewer";
import { getRelatedSongs, getSongBySlug } from "@/lib/queries";
import { buildSongJsonLd, buildSongMetadata } from "@/lib/seo";

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

  const relatedSongs = await getRelatedSongs(song.id, 5);
  const jsonLd = buildSongJsonLd(song);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SongViewer song={song} relatedSongs={relatedSongs} />
    </>
  );
}
