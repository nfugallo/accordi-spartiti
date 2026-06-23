import type { Metadata } from "next";
import { getRegions } from "@/lib/queries";
import { buildExploreMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const regions = await getRegions();
  const total = regions.reduce((sum, region) => sum + region.artistCount, 0);
  return buildExploreMetadata(total, regions.length);
}

export { default } from "./explore-page";
