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

type FavoritesContextValue = {
  favorites: FavoriteItem[];
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  isFavorite: (type: FavoriteItem["type"], href: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites(toggleFavoriteItem(item));
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
