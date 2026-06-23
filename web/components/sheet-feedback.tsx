"use client";

import { useState } from "react";
import type { CorrectionKind } from "@/lib/corrections-db";

type SheetFeedbackProps = {
  songSlug: string;
  songTitle: string;
  sourceUrl: string | null;
};

const KIND_LABELS: Record<CorrectionKind, string> = {
  chord: "Accordi",
  lyric: "Testo",
  other: "Altro",
};

export function SheetFeedback({ songSlug, songTitle, sourceUrl }: SheetFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CorrectionKind>("chord");
  const [context, setContext] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async () => {
    if (message.trim().length < 8) {
      return;
    }

    setStatus("sending");
    const response = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songSlug,
        songTitle,
        kind,
        message: message.trim(),
        context: context.trim() || undefined,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("sent");
    setMessage("");
    setContext("");
    setTimeout(() => {
      setOpen(false);
      setStatus("idle");
    }, 1200);
  };

  return (
    <footer className="no-print mt-10 text-center">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Spartito importato da fonte pubblica
        {sourceUrl && (
          <>
            {" · "}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              originale
            </a>
          </>
        )}
        {" · "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="underline underline-offset-2 hover:text-foreground"
        >
          suggerisci correzione
        </button>
      </p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 sm:items-center">
          <div
            role="dialog"
            aria-labelledby="sheet-feedback-title"
            className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-left">
                <p id="sheet-feedback-title" className="text-sm font-medium">
                  Suggerisci una correzione
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{songTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60"
              >
                Chiudi
              </button>
            </div>

            <div className="mb-3 flex flex-wrap justify-center gap-1.5">
              {(Object.keys(KIND_LABELS) as CorrectionKind[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    kind === option
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {KIND_LABELS[option]}
                </button>
              ))}
            </div>

            <input
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Riga o accordo (opzionale)"
              className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descrivi cosa correggere"
              rows={4}
              className="mb-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />

            <button
              type="button"
              onClick={submit}
              disabled={status === "sending" || message.trim().length < 8}
              className="w-full rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {status === "sending"
                ? "Invio..."
                : status === "sent"
                  ? "Grazie!"
                  : status === "error"
                    ? "Riprova"
                    : "Invia suggerimento"}
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
