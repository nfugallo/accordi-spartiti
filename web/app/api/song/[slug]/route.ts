import { NextResponse } from "next/server";
import { getRelatedSongs, getSongBySlug } from "@/lib/queries";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const song = await getSongBySlug(slug);

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const relatedSongs = await getRelatedSongs(song.id, 5);
  return NextResponse.json(
    { song, relatedSongs },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
