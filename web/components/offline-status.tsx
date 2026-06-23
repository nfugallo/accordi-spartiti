"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type OfflineContextValue = {
  online: boolean;
};

const OfflineContext = createContext<OfflineContextValue>({ online: true });

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const value = useMemo(() => ({ online }), [online]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOfflineStatus() {
  return useContext(OfflineContext);
}

export function OfflineBanner() {
  const { online } = useOfflineStatus();

  if (online) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto rounded-full border border-white/20 bg-neutral-900/85 px-3 py-1 text-[11px] text-neutral-100 shadow-lg backdrop-blur-xl dark:bg-neutral-950/90">
        Offline mode ·{" "}
        <Link href="/offline" className="underline underline-offset-2">
          saved songs
        </Link>{" "}
        still work
      </div>
    </div>
  );
}
