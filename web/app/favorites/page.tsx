import type { Metadata } from "next";
import FavoritesPageClient from "./favorites-page";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your saved songs and artists",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesPageClient />;
}
