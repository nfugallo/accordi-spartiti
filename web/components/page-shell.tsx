import type { ReactNode } from "react";

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-28 pt-8 sm:px-6 sm:pt-12 ${className}`}
    >
      <div className="w-full">{children}</div>
    </main>
  );
}
