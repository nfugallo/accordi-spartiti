import {
  buildSongFaqEntries,
  buildSongPlainDocument,
  buildSongSummaryParagraph,
  collectSongChords,
  formatArtistNames,
} from "@/lib/song-geo";
import type { SongDetail } from "@/lib/types";

export function SongGeoContent({ song }: { song: SongDetail }) {
  const artists = formatArtistNames(song.artists);
  const keys = song.keys.length > 0 ? song.keys.join(" / ") : "Non indicata";
  const chords = collectSongChords(song);
  const summary = buildSongSummaryParagraph(song);
  const faqEntries = buildSongFaqEntries(song);
  const plainDocument = buildSongPlainDocument(song);

  return (
    <article className="sr-only" aria-label={`Accordi e testo di ${song.title}`}>
      <p className="song-geo-summary">{summary}</p>

      <section aria-labelledby={`song-geo-keys-${song.slug}`}>
        <h2 id={`song-geo-keys-${song.slug}`}>Tonalità</h2>
        <p>{keys}</p>
      </section>

      {chords.length > 0 && (
        <section aria-labelledby={`song-geo-chords-${song.slug}`}>
          <h2 id={`song-geo-chords-${song.slug}`}>Accordi</h2>
          <p className="song-geo-chords">{chords.join(", ")}</p>
        </section>
      )}

      <section aria-labelledby={`song-geo-faq-${song.slug}`}>
        <h2 id={`song-geo-faq-${song.slug}`}>Domande frequenti</h2>
        <dl>
          {faqEntries.map((entry) => (
            <div key={entry.question}>
              <dt>{entry.question}</dt>
              <dd>{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby={`song-geo-sheet-${song.slug}`}>
        <h2 id={`song-geo-sheet-${song.slug}`}>Spartito completo</h2>
        <pre>{plainDocument}</pre>
      </section>
    </article>
  );
}
