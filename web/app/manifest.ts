import type { MetadataRoute } from "next";
import {
  SITE_BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_THEME_COLOR,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    start_url: "/",
    display: "standalone",
    background_color: SITE_BACKGROUND_COLOR,
    theme_color: SITE_THEME_COLOR,
    lang: "it",
    orientation: "portrait",
    categories: ["music", "entertainment"],
    shortcuts: [
      {
        name: "Favorites",
        url: "/favorites",
      },
      {
        name: "Offline songs",
        url: "/offline",
      },
    ],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
