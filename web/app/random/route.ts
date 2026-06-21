import { redirect } from "next/navigation";
import { getRandomSong } from "@/lib/queries";

export async function GET() {
  const song = await getRandomSong();
  if (!song) {
    redirect("/");
  }
  redirect(`/song/${song.slug}`);
}
