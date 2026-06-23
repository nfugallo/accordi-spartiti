import type { Client } from "@libsql/client";

export type CorrectionKind = "chord" | "lyric" | "other";

export type CorrectionSubmission = {
  songSlug: string;
  songTitle: string;
  kind: CorrectionKind;
  message: string;
  context?: string;
  userAgent?: string;
};

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS sheet_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_slug TEXT NOT NULL,
    song_title TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('chord', 'lyric', 'other')),
    message TEXT NOT NULL,
    context TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'applied', 'rejected'))
  )
`;

export async function ensureCorrectionsTable(db: Client): Promise<void> {
  await db.execute(CREATE_TABLE);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_sheet_corrections_song_slug ON sheet_corrections(song_slug)",
  );
}

export async function insertCorrection(db: Client, submission: CorrectionSubmission): Promise<void> {
  await ensureCorrectionsTable(db);
  await db.execute({
    sql: `
      INSERT INTO sheet_corrections (song_slug, song_title, kind, message, context, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      submission.songSlug,
      submission.songTitle,
      submission.kind,
      submission.message,
      submission.context ?? null,
      submission.userAgent ?? null,
      new Date().toISOString(),
    ],
  });
}
