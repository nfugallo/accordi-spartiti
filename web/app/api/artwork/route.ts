import { NextResponse } from "next/server";

const USER_AGENT = "Strimpello/1.0 (https://github.com/accordi-spartiti)";

type ArtworkResult = {
  url: string;
  source: "itunes" | "musicbrainz";
};

const cache = new Map<string, { result: ArtworkResult | null; expiresAt: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let lastMusicBrainzRequest = 0;

async function searchItunes(title: string, artist: string): Promise<ArtworkResult | null> {
  const term = encodeURIComponent(`${artist} ${title}`);
  const response = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=song&limit=3`,
    { next: { revalidate: 604800 } },
  );
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: { artworkUrl100?: string }[];
  };
  const artwork = data.results?.[0]?.artworkUrl100;
  if (!artwork) {
    return null;
  }

  return {
    url: artwork.replace("100x100bb", "600x600bb"),
    source: "itunes",
  };
}

async function waitForMusicBrainzRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastMusicBrainzRequest;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastMusicBrainzRequest = Date.now();
}

async function searchMusicBrainz(title: string, artist: string): Promise<ArtworkResult | null> {
  await waitForMusicBrainzRateLimit();

  const query = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
  const searchResponse = await fetch(
    `https://musicbrainz.org/ws/2/recording?query=${query}&fmt=json&limit=1`,
    { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 604800 } },
  );
  if (!searchResponse.ok) {
    return null;
  }

  const searchData = (await searchResponse.json()) as {
    recordings?: { releases?: { id: string }[] }[];
  };
  const releaseId = searchData.recordings?.[0]?.releases?.[0]?.id;
  if (!releaseId) {
    return null;
  }

  const artResponse = await fetch(`https://coverartarchive.org/release/${releaseId}/front-250`, {
    redirect: "follow",
    next: { revalidate: 604800 },
  });
  if (!artResponse.ok) {
    return null;
  }

  return {
    url: artResponse.url,
    source: "musicbrainz",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const artist = searchParams.get("artist")?.trim();

  if (!title || !artist) {
    return NextResponse.json({ error: "title and artist required" }, { status: 400 });
  }

  const cacheKey = `${artist.toLowerCase()}::${title.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.result) {
      return NextResponse.json({ url: null }, { status: 404 });
    }
    return NextResponse.json(cached.result, {
      headers: { "Cache-Control": "public, max-age=604800" },
    });
  }

  const itunes = await searchItunes(title, artist);
  const result = itunes ?? (await searchMusicBrainz(title, artist));

  cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });

  if (!result) {
    return NextResponse.json({ url: null }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=604800" },
  });
}
