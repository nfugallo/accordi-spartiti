"use client";

import { usePathname } from "next/navigation";
import { GlobalNav } from "./global-nav";

export function AdaptiveBottomBar() {
  const pathname = usePathname();
  const isSongPage = pathname.startsWith("/song/");

  return (
    <nav className="adaptive-bottom-bar pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={`pointer-events-auto w-full max-w-lg transition-all duration-300 ease-out ${
          isSongPage ? "expanded" : ""
        }`}
      >
        <div className="mx-auto flex w-fit items-center rounded-full border border-white/25 bg-white/50 px-1.5 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <GlobalNav />
        </div>
      </div>
    </nav>
  );
}
