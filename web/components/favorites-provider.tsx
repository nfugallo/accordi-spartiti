"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readFavorites, toggleFavoriteItem, type FavoriteItem } from "@/lib/favorites";
import { prefetchFavoriteSongs } from "@/lib/offline-prefetch";

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  isFavorite: (type: FavoriteItem["type"], href: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => readFavorites());

  useEffect(() => {
    prefetchFavoriteSongs(
      readFavorites()
        .filter((item) => item.type === "song")
        .map((item) => item.slug),
    );
  }, []);

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    const next = toggleFavoriteItem(item);
    setFavorites(next);
    if (item.type === "song") {
      prefetchFavoriteSongs([item.slug]);
    }
  }, []);

  const isFavorite = useCallback(
    (type: FavoriteItem["type"], href: string) =>
      favorites.some((f) => f.type === type && f.href === href),
    [favorites],
  );

  const value = useMemo(
    () => ({ favorites, toggleFavorite, isFavorite }),
    [favorites, toggleFavorite, isFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
