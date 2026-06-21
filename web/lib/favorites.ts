export type FavoriteItem = {
  type: "song" | "artist";
  slug: string;
  title: string;
  href: string;
  addedAt: string;
};

const STORAGE_KEY = "accordi-favorites";

export function readFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as FavoriteItem[];
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function toggleFavoriteItem(item: Omit<FavoriteItem, "addedAt">): FavoriteItem[] {
  const current = readFavorites();
  const index = current.findIndex((f) => f.type === item.type && f.href === item.href);
  if (index >= 0) {
    const next = [...current.slice(0, index), ...current.slice(index + 1)];
    writeFavorites(next);
    return next;
  }
  const next = [{ ...item, addedAt: new Date().toISOString() }, ...current];
  writeFavorites(next);
  return next;
}

export function isFavoriteItem(type: FavoriteItem["type"], href: string): boolean {
  return readFavorites().some((f) => f.type === type && f.href === href);
}
