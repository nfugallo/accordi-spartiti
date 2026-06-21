import type { Metadata } from "next";
import {
  SITE_BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_THEME_COLOR,
} from "./brand";
import { formatArtistDisplayName } from "./artist-name";
import type { ArtistRef, SongDetail } from "./types";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function buildDefaultMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [...SITE_KEYWORDS],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "music",
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-icon", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_TAGLINE,
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_TAGLINE,
    },
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    other: {
      "theme-color": SITE_THEME_COLOR,
      "msapplication-TileColor": SITE_THEME_COLOR,
      "mobile-web-app-capable": "yes",
    },
  };
}

export function buildHomeMetadata(): Metadata {
  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: "/",
    },
  };
}

export function buildWebsiteJsonLd(): object {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    inLanguage: "it-IT",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSongMetadata(song: SongDetail): Metadata {
  const artists = song.artists.map((a) => formatArtistDisplayName(a.displayName)).join(", ");
  const keys = song.keys.length > 0 ? ` — Tonalità ${song.keys.join(" / ")}` : "";
  const description = `Accordi e testo di ${song.title}${artists ? ` di ${artists}` : ""}${keys}.`;

  return {
    title: `${song.title}${artists ? ` — ${artists}` : ""}`,
    description,
    alternates: {
      canonical: `/song/${song.slug}`,
    },
    openGraph: {
      title: song.title,
      description,
      url: `/song/${song.slug}`,
      type: "article",
    },
  };
}

export function buildArtistMetadata(
  slug: string,
  displayName: string,
  region: string,
  songCount: number,
): Metadata {
  const formatted = formatArtistDisplayName(displayName);
  const description = `${songCount} canzoni con accordi di ${formatted} (${region.replace(/-/g, " ")}).`;

  return {
    title: formatted,
    description,
    alternates: {
      canonical: `/artist/${region}/${slug}`,
    },
    openGraph: {
      title: formatted,
      description,
      url: `/artist/${region}/${slug}`,
    },
  };
}

export function buildSongJsonLd(song: SongDetail): object {
  const siteUrl = getSiteUrl();
  const artists = song.artists.map((a) => formatArtistDisplayName(a.displayName));

  return {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: song.title,
    url: `${siteUrl}/song/${song.slug}`,
    composer: artists.length > 0 ? artists : undefined,
    inLanguage: "it",
  };
}

export function artistRefDisplay(artist: ArtistRef): string {
  return formatArtistDisplayName(artist.displayName);
}

export { SITE_BACKGROUND_COLOR, SITE_THEME_COLOR };
