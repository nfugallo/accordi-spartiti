import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: [
          "Googlebot",
          "Google-InspectionTool",
          "Bingbot",
          "DuckDuckBot",
          "Applebot",
          "Claude-SearchBot",
          "Claude-User",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
        ],
        allow: ["/", "/song/", "/artist/", "/explore", "/llms.txt"],
        disallow: ["/api/", "/favorites", "/offline"],
      },
      {
        userAgent: ["ClaudeBot", "GPTBot", "CCBot", "Amazonbot", "Bytespider"],
        allow: ["/llms.txt"],
        disallow: ["/"],
        crawlDelay: 60,
      },
      {
        userAgent: ["SemrushBot", "AhrefsBot", "MJ12bot", "DotBot", "BLEXBot"],
        disallow: ["/"],
      },
      {
        userAgent: "*",
        allow: ["/", "/llms.txt"],
        disallow: ["/api/", "/favorites", "/offline"],
        crawlDelay: 10,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
