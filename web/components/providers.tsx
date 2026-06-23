"use client";

import { OfflineBanner, OfflineProvider } from "./offline-status";
import { SearchProvider } from "./search-provider";
import { ServiceWorkerRegister } from "./service-worker-register";
import { ThemeProvider } from "./theme-provider";
import { FavoritesProvider } from "./favorites-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <OfflineProvider>
        <FavoritesProvider>
          <SearchProvider>
            <ServiceWorkerRegister />
            <OfflineBanner />
            {children}
          </SearchProvider>
        </FavoritesProvider>
      </OfflineProvider>
    </ThemeProvider>
  );
}
