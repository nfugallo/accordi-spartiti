import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  clientIp,
  isAggressiveBot,
  isBlockedBot,
  isIndexingCrawler,
} from "@/lib/rate-limit";

const WINDOW_MS = 60_000;

function rateLimitResponse(result: ReturnType<typeof checkRateLimit>): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

function applyLimit(
  request: NextRequest,
  key: string,
  limit: number,
): NextResponse | null {
  const result = checkRateLimit(key, limit, WINDOW_MS);
  if (!result.allowed) {
    return rateLimitResponse(result);
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const ip = clientIp(request);

  if (process.env.VERCEL_ENV === "production" && host === "accordi-spartiti.vercel.app") {
    const target = request.nextUrl.clone();
    target.protocol = "https";
    target.host = "strimpello.com";
    return NextResponse.redirect(target, 308);
  }

  if (isBlockedBot(userAgent)) {
    return new NextResponse("Blocked crawler", {
      status: 403,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (isIndexingCrawler(userAgent)) {
    return NextResponse.next();
  }

  if (isAggressiveBot(userAgent)) {
    const blocked = applyLimit(request, `bot:${ip}`, 6);
    if (blocked) {
      return blocked;
    }
  }

  if (pathname === "/random") {
    const blocked = applyLimit(request, `random:${ip}`, 15);
    if (blocked) {
      return blocked;
    }
  }

  if (pathname.startsWith("/api/search")) {
    const blocked = applyLimit(request, `search:${ip}`, 40);
    if (blocked) {
      return blocked;
    }
  }

  if (pathname.startsWith("/api/song/")) {
    const blocked = applyLimit(request, `api-song:${ip}`, 60);
    if (blocked) {
      return blocked;
    }
  }

  if (pathname.startsWith("/api/corrections")) {
    const blocked = applyLimit(request, `corrections:${ip}`, 8);
    if (blocked) {
      return blocked;
    }
  }

  if (
    pathname.startsWith("/song/") ||
    pathname.startsWith("/artist/") ||
    pathname.startsWith("/explore")
  ) {
    const blocked = applyLimit(request, `pages:${ip}`, 120);
    if (blocked) {
      return blocked;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/random",
    "/song/:path*",
    "/artist/:path*",
    "/explore/:path*",
    "/api/search",
    "/api/song/:path*",
    "/api/corrections",
  ],
};
