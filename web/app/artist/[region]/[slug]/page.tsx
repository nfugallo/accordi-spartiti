import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getArtistSongs } from "@/lib/queries";
import { buildArtistMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ region: string; slug: string }>;
};

export const revalidate = 86_400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, slug } = await params;
  const artist = await getArtistSongs(region, slug);
  if (!artist) {
    return { title: "Artist not found" };
  }
  return buildArtistMetadata(slug, artist.displayName, region, artist.songs.length);
}

export default async function ArtistPage({ params }: PageProps) {
  const { region, slug } = await params;
  const artist = await getArtistSongs(region, slug);

  if (!artist) {
    notFound();
  }

  return (
    <PageShell>
      <header className="mb-8 text-center sm:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{artist.displayName}</h1>
        <p className="mt-2 text-sm capitalize text-muted-foreground">
          {region.replace(/-/g, " ")} · {artist.songs.length} songs
        </p>
      </header>
      <ul className="divide-y divide-border">
        {artist.songs.map((song) => (
          <li key={song.slug}>
            <Link
              href={`/song/${song.slug}`}
              className="block py-3 text-sm transition-colors hover:text-muted-foreground"
            >
              {song.title}
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
