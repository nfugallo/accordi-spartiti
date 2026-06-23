import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site-url";

export function GET() {
  const siteUrl = getSiteUrl();
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Strimpello pubblica spartiti per chitarra con accordi sopra il testo, tonalità indicata e trasposizione.
Ogni pagina canzone contiene testo completo, elenco accordi, FAQ strutturate e dati schema.org.

## Pagine principali

- [Home](${siteUrl}/): ricerca e accesso rapido al catalogo
- [Esplora artisti](${siteUrl}/explore): artisti per regione (italiani, internazionali, colonne sonore, …)
- [Canzone](${siteUrl}/song/{slug}): accordi, testo, tonalità, FAQ — sostituire \`{slug}\` con lo slug URL della canzone
- [Artista](${siteUrl}/artist/{region}/{slug}): elenco canzoni di un artista

## Formato URL canzone

\`${siteUrl}/song/{slug}\`

Esempio: \`${siteUrl}/song/angie\`

## Cosa trovare su ogni pagina canzone

- Titolo e artista/i
- Tonalità (se disponibile)
- Elenco completo degli accordi usati
- Testo con accordi posizionati sopra le righe
- Domande frequenti in italiano (accordi, tonalità, testo, interprete)
- JSON-LD: MusicComposition, FAQPage, BreadcrumbList

## Lingua

Contenuto principalmente in italiano (\`it-IT\`).

## Sitemap

Indice: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
