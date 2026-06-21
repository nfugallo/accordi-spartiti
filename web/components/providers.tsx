"use client";

import { SearchProvider } from "./search-provider";
import { ThemeProvider } from "./theme-provider";
import { FavoritesProvider } from "./favorites-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <SearchProvider>{children}</SearchProvider>
      </FavoritesProvider>
    </ThemeProvider>
  );
}
