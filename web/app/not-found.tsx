"use client";

import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SiteLogo } from "@/components/site-logo";
import { useSearch } from "@/components/search-provider";

export default function NotFound() {
  const { openSearch } = useSearch();

  return (
    <PageShell className="min-h-[70vh] justify-center">
      <div className="text-center">
        <SiteLogo markSize={40} className="mb-8 opacity-80" />
        <h1 className="text-4xl font-semibold tracking-tight">404</h1>
        <p className="mt-3 text-muted-foreground">Pagina non trovata</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={openSearch}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
          >
            Search
          </button>
          <Link href="/explore" className="text-sm text-muted-foreground underline hover:text-foreground">
            Explore
          </Link>
          <Link href="/random" className="text-sm text-muted-foreground underline hover:text-foreground">
            Random song
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
