import type { Metadata } from "next";
import { getRegions } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const regions = await getRegions();
  const total = regions.reduce((sum, r) => sum + r.artistCount, 0);
  return {
    title: "Explore",
    description: `Browse ${total.toLocaleString()} artists across ${regions.length} regions.`,
    alternates: { canonical: "/explore" },
  };
}

export { default } from "./explore-page";
