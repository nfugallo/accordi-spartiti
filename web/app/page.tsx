import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { SiteLogo } from "@/components/site-logo";
import { SITE_DESCRIPTION } from "@/lib/brand";
import { buildHomeMetadata, buildWebsiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildHomeMetadata();

export default function HomePage() {
  const jsonLd = buildWebsiteJsonLd();

  return (
    <PageShell className="min-h-[calc(100dvh-8rem)] justify-center">
      <JsonLd data={jsonLd} />
      <div className="flex flex-col items-center text-center">
        <SiteLogo showTagline markSize={64} size="large" />
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
          {SITE_DESCRIPTION}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/explore"
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Esplora
          </Link>
          <Link
            href="/random"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Una a caso
          </Link>
        </div>
        <p className="mt-7 text-xs text-muted-foreground">⌘K per cercare</p>
      </div>
    </PageShell>
  );
}
