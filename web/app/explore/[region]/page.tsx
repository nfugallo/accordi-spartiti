import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistFilter } from "@/components/artist-filter";
import { PageShell } from "@/components/page-shell";
import { getArtistsByRegion, getRegions } from "@/lib/queries";

type PageProps = {
  params: Promise<{ region: string }>;
};

export async function generateStaticParams() {
  const regions = await getRegions();
  return regions.map((region) => ({ region: region.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region } = await params;
  const regions = await getRegions();
  const regionMeta = regions.find((item) => item.slug === region);

  if (!regionMeta) {
    return { title: "Region not found" };
  }

  return {
    title: regionMeta.label,
    description: `Browse ${regionMeta.artistCount.toLocaleString()} artists in ${regionMeta.label}.`,
    alternates: { canonical: `/explore/${region}` },
  };
}

export default async function RegionExplorePage({ params }: PageProps) {
  const { region } = await params;
  const [regions, artists] = await Promise.all([getRegions(), getArtistsByRegion(region)]);

  const regionMeta = regions.find((item) => item.slug === region);
  if (!regionMeta) {
    notFound();
  }

  return (
    <PageShell>
      <header className="mb-8 text-center sm:mb-10">
        <Link
          href="/explore"
          className="mb-4 inline-block text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← All regions
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{regionMeta.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {regionMeta.artistCount.toLocaleString()} artists
        </p>
      </header>

      <ArtistFilter artists={artists} region={region} regionLabel={regionMeta.label} />
    </PageShell>
  );
}
