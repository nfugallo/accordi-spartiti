"use client";

import { BrandMark } from "@/lib/brand-mark";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

type SiteLogoProps = {
  showTagline?: boolean;
  markSize?: number;
  className?: string;
  size?: "default" | "large";
};

export function SiteLogo({
  showTagline = false,
  markSize = 48,
  className,
  size = "default",
}: SiteLogoProps) {
  const titleClass =
    size === "large"
      ? "text-4xl font-bold tracking-tight sm:text-5xl"
      : "text-3xl font-bold tracking-tight sm:text-4xl";

  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ""}`}>
      <BrandMark size={markSize} />
      <div className="text-center">
        <p className={titleClass}>{SITE_NAME}</p>
        {showTagline && (
          <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">{SITE_TAGLINE}</p>
        )}
      </div>
    </div>
  );
}
