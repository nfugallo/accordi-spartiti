import type { Metadata } from "next";
import OfflinePageClient from "./offline-page";

export const metadata: Metadata = {
  title: "Offline songs",
  description: "Songs saved on this device for offline use",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
