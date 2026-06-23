import { parseChordLine } from "./chord-line";
import { exportSongAsText } from "./export-sheet";
import { formatArtistDisplayName } from "./artist-name";
import { getSiteUrl } from "./site-url";
import type { ArtistRef, SongDetail, SongSummary } from "./types";

export type SongFaqEntry = {
  question: string;
  answer: string;
};

export function collectSongChords(song: SongDetail): string[] {
  const seen = new Set<string>();
  const chords: string[] = [];

  for (const section of song.sections) {
    for (const stanza of section.stanzas) {
      for (const chordLine of stanza.chordLines) {
        for (const segment of parseChordLine(chordLine.rawLine)) {
          if (!segment.isChord || seen.has(segment.text)) {
            continue;
          }
          seen.add(segment.text);
          chords.push(segment.text);
        }
      }
    }
  }

  return chords;
}

export function collectSongLyrics(song: SongDetail): string {
  return song.sections
    .flatMap((section) => section.stanzas)
    .map((stanza) => stanza.lyric)
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function formatArtistNames(artists: ArtistRef[]): string {
  return artists.map((artist) => formatArtistDisplayName(artist.displayName)).join(", ");
}

export function buildSongSummaryParagraph(song: SongDetail): string {
  const artists = formatArtistNames(song.artists);
  const keys = song.keys.length > 0 ? song.keys.join(" / ") : null;
  const chords = collectSongChords(song);
  const chordSummary =
    chords.length > 0 ? ` Accordi principali: ${chords.slice(0, 16).join(", ")}.` : "";

  const artistPhrase = artists ? ` di ${artists}` : "";
  const keyPhrase = keys ? ` Tonalità: ${keys}.` : "";

  return (
    `Accordi e testo completo di "${song.title}"${artistPhrase} per chitarra.` +
    `${keyPhrase}${chordSummary} Spartito con accordi sopra il testo, trasponibile su Strimpello.`
  );
}

export function buildSongFaqEntries(song: SongDetail): SongFaqEntry[] {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/song/${song.slug}`;
  const artists = formatArtistNames(song.artists);
  const keys = song.keys.length > 0 ? song.keys.join(" / ") : "non indicata";
  const chords = collectSongChords(song);
  const chordAnswer =
    chords.length > 0
      ? `Gli accordi usati in "${song.title}"${artists ? ` di ${artists}` : ""} sono: ${chords.join(", ")}.`
      : `Gli accordi di "${song.title}" sono disponibili nello spartito completo su ${pageUrl}.`;

  const entries: SongFaqEntry[] = [
    {
      question: `Quali sono gli accordi di ${song.title}${artists ? ` di ${artists}` : ""}?`,
      answer: `${chordAnswer} Tonalità: ${keys}.`,
    },
    {
      question: `In che tonalità è ${song.title}?`,
      answer: `"${song.title}"${artists ? ` di ${artists}` : ""} è in tonalità ${keys}.`,
    },
    {
      question: `Dove trovo il testo e gli accordi di ${song.title}?`,
      answer: `Testo e accordi completi di "${song.title}" sono su Strimpello: ${pageUrl}.`,
    },
  ];

  if (artists) {
    entries.push({
      question: `Chi canta ${song.title}?`,
      answer: `"${song.title}" è interpretata da ${artists}.`,
    });
  }

  return entries;
}

export function buildSongPlainDocument(song: SongDetail): string {
  return exportSongAsText(song, 0);
}

function artistSchemaEntities(artists: ArtistRef[], siteUrl: string) {
  return artists.map((artist) => ({
    "@type": "MusicGroup" as const,
    name: formatArtistDisplayName(artist.displayName),
    url: `${siteUrl}/artist/${artist.region}/${artist.slug}`,
  }));
}

export function buildSongJsonLdGraph(song: SongDetail, relatedSongs: SongSummary[] = []): object {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/song/${song.slug}`;
  const artists = formatArtistNames(song.artists);
  const keys = song.keys;
  const chords = collectSongChords(song);
  const lyrics = collectSongLyrics(song);
  const plainDocument = buildSongPlainDocument(song);
  const summary = buildSongSummaryParagraph(song);
  const faqEntries = buildSongFaqEntries(song);

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Esplora", path: "/explore" },
  ];
  if (song.artists[0]) {
    const artist = song.artists[0];
    breadcrumbItems.push({
      name: formatArtistDisplayName(artist.displayName),
      path: `/artist/${artist.region}/${artist.slug}`,
    });
  }
  breadcrumbItems.push({ name: song.title, path: `/song/${song.slug}` });

  const graph: object[] = [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Strimpello",
      url: siteUrl,
      inLanguage: "it-IT",
    },
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: `${song.title}${artists ? ` — ${artists}` : ""} | Accordi e testo`,
      description: summary,
      inLanguage: "it-IT",
      isPartOf: { "@id": `${siteUrl}/#website` },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      mainEntity: { "@id": `${pageUrl}#composition` },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".song-geo-summary", ".song-geo-chords"],
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${siteUrl}${item.path}`,
      })),
    },
    {
      "@type": "MusicComposition",
      "@id": `${pageUrl}#composition`,
      name: song.title,
      url: pageUrl,
      inLanguage: "it",
      composer: song.artists.length > 0 ? artistSchemaEntities(song.artists, siteUrl) : undefined,
      musicalKey: keys.length > 0 ? keys : undefined,
      keywords: [
        `accordi ${song.title}`,
        `testo ${song.title}`,
        artists ? `accordi ${artists}` : null,
        "accordi chitarra",
        "testo e accordi",
      ].filter(Boolean),
      ...(lyrics
        ? {
            lyrics: {
              "@type": "CreativeWork",
              text: lyrics,
            },
          }
        : {}),
      ...(chords.length > 0
        ? {
            subjectOf: {
              "@type": "DigitalDocument",
              name: `Accordi di ${song.title}`,
              text: plainDocument,
              encodingFormat: "text/plain",
            },
          }
        : {}),
    },
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqEntries.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.answer,
        },
      })),
    },
  ];

  if (relatedSongs.length > 0 && song.artists[0]) {
    graph.push({
      "@type": "ItemList",
      "@id": `${pageUrl}#related`,
      name: `Altre canzoni di ${formatArtistDisplayName(song.artists[0].displayName)}`,
      itemListElement: relatedSongs.map((related, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: related.title,
        url: `${siteUrl}/song/${related.slug}`,
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
