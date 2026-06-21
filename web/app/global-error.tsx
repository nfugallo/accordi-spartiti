"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body className="flex min-h-screen items-center justify-center bg-white p-4 text-center text-black">
        <div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-full bg-black px-4 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
