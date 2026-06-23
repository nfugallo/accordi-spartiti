import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { insertCorrection, type CorrectionKind } from "@/lib/corrections-db";

const MAX_MESSAGE_LENGTH = 1200;
const MAX_CONTEXT_LENGTH = 240;
const MAX_TITLE_LENGTH = 200;
const MAX_SLUG_LENGTH = 160;

function isCorrectionKind(value: unknown): value is CorrectionKind {
  return value === "chord" || value === "lyric" || value === "other";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const songSlug = String(payload.songSlug ?? "").trim().slice(0, MAX_SLUG_LENGTH);
  const songTitle = String(payload.songTitle ?? "").trim().slice(0, MAX_TITLE_LENGTH);
  const kind = payload.kind;
  const message = String(payload.message ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  const context = payload.context ? String(payload.context).trim().slice(0, MAX_CONTEXT_LENGTH) : undefined;

  if (!songSlug || !songTitle || !isCorrectionKind(kind) || message.length < 8) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const db = getDb();
  await insertCorrection(db, {
    songSlug,
    songTitle,
    kind,
    message,
    context,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
