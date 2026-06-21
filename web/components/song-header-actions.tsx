"use client";

import { useEffect, useRef, useState } from "react";
import { exportSongAsText } from "@/lib/export-sheet";
import { shareUrl } from "@/lib/share-url";
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
  const [shareLabel, setShareLabel] = useState("Share");
  const shareResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const href = `/song/${song.slug}`;
  const favorited = isFavorite("song", href);
  const effectiveTranspose = settings.transpose - settings.capo;

  useEffect(() => {
    return () => {
      if (shareResetRef.current) {
        clearTimeout(shareResetRef.current);
      }
    };
  }, []);

  const flashShareLabel = (label: string) => {
    if (shareResetRef.current) {
      clearTimeout(shareResetRef.current);
    }
    setShareLabel(label);
    shareResetRef.current = setTimeout(() => setShareLabel("Share"), 2000);
  };

  const handleCopy = async () => {
    const text = exportSongAsText(song, effectiveTranspose);
    await navigator.clipboard.writeText(text);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const result = await shareUrl({
      title: song.title,
      url: window.location.href,
    });

    if (result === "copied") {
      flashShareLabel("Link copied!");
    } else if (result === "failed") {
      flashShareLabel("Couldn't share");
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
        {shareLabel}
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
