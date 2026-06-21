import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { getRegions } from "@/lib/queries";

export default async function ExplorePage() {
  const regions = await getRegions();

  return (
    <PageShell>
      <header className="mb-8 text-center sm:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Explore</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse artists by region</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {regions.map((region) => (
          <Link
            key={region.slug}
            href={`/explore/${region.slug}`}
            className="py-4 transition-colors hover:text-muted-foreground"
          >
            <h2 className="font-medium">{region.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {region.artistCount.toLocaleString()} artists
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
