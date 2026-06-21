import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  const results = await searchCatalog(query);
  return NextResponse.json(results);
}
