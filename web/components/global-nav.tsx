"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearch } from "./search-provider";
import { useTheme } from "./theme-provider";

const iconSize = 18;

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 20.5 10.55 19.2C5.4 14.73 2 11.61 2 7.75 2 4.84 4.22 2.75 7.05 2.75c1.62 0 3.18.77 4.95 2.26 1.77-1.49 3.33-2.26 4.95-2.26C19.78 2.75 22 4.84 22 7.75c0 3.86-3.4 6.98-8.55 11.45L12 20.5Z" />
    </svg>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  if (dark) {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 6.5 6.5 0 0 0 21 14.5Z" />
    </svg>
  );
}

export function GlobalNav() {
  const pathname = usePathname();
  const { openSearch } = useSearch();
  const { theme, toggleTheme } = useTheme();

  const homeActive = pathname === "/";
  const exploreActive =
    pathname.startsWith("/explore") ||
    pathname.startsWith("/artist") ||
    pathname === "/favorites";
  const favoritesActive = pathname === "/favorites";

  const itemClass = (active: boolean) =>
    `flex size-9 items-center justify-center rounded-full transition-colors ${
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex items-center gap-0.5">
      <Link href="/" className={itemClass(homeActive)} aria-label="Home">
        <HomeIcon active={homeActive} />
      </Link>
      <Link href="/explore" className={itemClass(exploreActive && !favoritesActive)} aria-label="Explore">
        <ExploreIcon active={exploreActive && !favoritesActive} />
      </Link>
      <button type="button" onClick={openSearch} className={itemClass(false)} aria-label="Search">
        <SearchIcon />
      </button>
      <Link href="/favorites" className={itemClass(favoritesActive)} aria-label="Favorites">
        <HeartIcon active={favoritesActive} />
      </Link>
      <button
        type="button"
        onClick={toggleTheme}
        className={itemClass(false)}
        aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        <ThemeIcon dark={theme === "dark"} />
      </button>
    </div>
  );
}
