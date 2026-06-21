"use client";

import { exportSongAsText } from "@/lib/export-sheet";
import { useFavorites } from "./favorites-provider";
import { useSongPageRequired } from "./song-page-provider";

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function SongHeaderActions() {
  const { song, settings } = useSongPageRequired();
  const { toggleFavorite, isFavorite } = useFavorites();

  const href = `/song/${song.slug}`;
  const favorited = isFavorite("song", href);
  const effectiveTranspose = settings.transpose - settings.capo;

  const handleCopy = async () => {
    const text = exportSongAsText(song, effectiveTranspose);
    await navigator.clipboard.writeText(text);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: song.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-1">
      <ActionButton label="Copy sheet" onClick={handleCopy}>
        Copy
      </ActionButton>
      <ActionButton label="Print sheet" onClick={handlePrint}>
        Print
      </ActionButton>
      <ActionButton label="Share link" onClick={handleShare}>
        Share
      </ActionButton>
      <ActionButton
        label={favorited ? "Remove favorite" : "Add favorite"}
        onClick={() =>
          toggleFavorite({
            type: "song",
            slug: song.slug,
            title: song.title,
            href,
          })
        }
        active={favorited}
      >
        {favorited ? "Saved" : "Save"}
      </ActionButton>
    </div>
  );
}
