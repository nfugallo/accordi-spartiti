type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, limit, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

const INDEXING_CRAWLER =
  /googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|petalbot|claude-searchbot|claude-user|oai-searchbot|chatgpt-user|perplexitybot|facebookexternalhit|twitterbot|linkedinbot|discordbot|slackbot|whatsapp|telegrambot/i;

const AGGRESSIVE_BOT =
  /semrushbot|ahrefsbot|mj12bot|dotbot|blexbot|serpstatbot|dataforseo|bytespider|scrapy|python-requests|go-http-client|curl\/|wget\/|httpclient|libwww-perl/i;

const BLOCKED_BOT =
  /claudebot|anthropic-ai|claude-web|gptbot|ccbot|commoncrawl|amazonbot|meta-externalagent|meta-externalfetcher/i;

export function isIndexingCrawler(userAgent: string): boolean {
  return INDEXING_CRAWLER.test(userAgent);
}

export function isAggressiveBot(userAgent: string): boolean {
  return AGGRESSIVE_BOT.test(userAgent);
}

export function isBlockedBot(userAgent: string): boolean {
  return BLOCKED_BOT.test(userAgent);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
