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
import { getSiteUrl } from "./site-url";
import {
  buildSongJsonLdGraph,
  collectSongChords,
  formatArtistNames,
  serializeJsonLd,
} from "./song-geo";
import type { ArtistRef, SongDetail, SongSummary } from "./types";

export { getSiteUrl, serializeJsonLd, buildSongJsonLdGraph };

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
  const artists = formatArtistNames(song.artists);
  const keys = song.keys.length > 0 ? song.keys.join(" / ") : null;
  const chords = collectSongChords(song);
  const summary = buildSongSummaryParagraph(song);
  const title = artists
    ? `Accordi ${song.title} — ${artists}`
    : `Accordi ${song.title}`;

  const keywords = [
    `accordi ${song.title}`,
    `testo ${song.title}`,
    "accordi chitarra",
    "testo e accordi",
    "spartito chitarra",
    artists ? `accordi ${artists}` : null,
    keys ? `tonalità ${keys}` : null,
    ...chords.slice(0, 8),
  ].filter((value): value is string => Boolean(value));

  return {
    title,
    description: summary,
    keywords,
    alternates: {
      canonical: `/song/${song.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      title,
      description: summary,
      url: `/song/${song.slug}`,
      type: "article",
      locale: "it_IT",
    },
    twitter: {
      card: "summary",
      title,
      description: summary,
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
  const regionLabel = region.replace(/-/g, " ");
  const description = `${songCount} canzoni con accordi e testi di ${formatted} (${regionLabel}). Spartiti per chitarra, trasponibili su Strimpello.`;
  const title = `Accordi ${formatted}`;

  return {
    title,
    description,
    keywords: [
      `accordi ${formatted}`,
      `canzoni ${formatted}`,
      `${formatted} testi e accordi`,
      "accordi chitarra",
      regionLabel,
    ],
    alternates: {
      canonical: `/artist/${region}/${slug}`,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: `/artist/${region}/${slug}`,
      locale: "it_IT",
    },
  };
}

export function buildExploreMetadata(totalArtists: number, regionCount: number): Metadata {
  const description = `Esplora ${totalArtists.toLocaleString("it-IT")} artisti in ${regionCount} regioni. Accordi e testi per chitarra su Strimpello.`;
  return {
    title: "Esplora artisti",
    description,
    alternates: { canonical: "/explore" },
    openGraph: { title: "Esplora artisti | Strimpello", description, url: "/explore" },
  };
}

export function buildRegionMetadata(label: string, artistCount: number, regionSlug: string): Metadata {
  const description = `${artistCount.toLocaleString("it-IT")} artisti ${label} con accordi e testi per chitarra su Strimpello.`;
  return {
    title: `Accordi ${label}`,
    description,
    alternates: { canonical: `/explore/${regionSlug}` },
    openGraph: {
      title: `Accordi ${label} | Strimpello`,
      description,
      url: `/explore/${regionSlug}`,
    },
  };
}

export function buildArtistJsonLd(
  displayName: string,
  region: string,
  slug: string,
  songs: SongSummary[],
): object {
  const siteUrl = getSiteUrl();
  const formatted = formatArtistDisplayName(displayName);
  const pageUrl = `${siteUrl}/artist/${region}/${slug}`;
  const regionLabel = region.replace(/-/g, " ");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `Accordi ${formatted}`,
        description: `${songs.length} canzoni con accordi e testi di ${formatted} (${regionLabel}).`,
        inLanguage: "it-IT",
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        mainEntity: { "@id": `${pageUrl}#artist` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Esplora", item: `${siteUrl}/explore` },
          {
            "@type": "ListItem",
            position: 3,
            name: formatted,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "MusicGroup",
        "@id": `${pageUrl}#artist`,
        name: formatted,
        url: pageUrl,
        genre: regionLabel,
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#songs`,
        name: `Canzoni di ${formatted}`,
        numberOfItems: songs.length,
        itemListElement: songs.slice(0, 100).map((song, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: song.title,
          url: `${siteUrl}/song/${song.slug}`,
        })),
      },
    ],
  };
}

export function buildSongJsonLd(song: SongDetail, relatedSongs: SongSummary[] = []): object {
  return buildSongJsonLdGraph(song, relatedSongs);
}

export function artistRefDisplay(artist: ArtistRef): string {
  return formatArtistDisplayName(artist.displayName);
}
import { buildSongSummaryParagraph } from "./song-geo";

export { SITE_BACKGROUND_COLOR, SITE_THEME_COLOR };
