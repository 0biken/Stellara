import type { ReactNode } from "react";

export function ChildShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-5 py-6 text-lg leading-7">
      {children}
    </main>
  );
}
export function AdultShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 text-[15px] leading-6">
      {children}
    </main>
  );
}
export function StudioShell({
  children,
  narrowMessage,
}: {
  children: ReactNode;
  narrowMessage: string;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6 text-[15px] leading-6">
      <p className="st-studio-narrow">{narrowMessage}</p>
      <div className="st-studio-content">{children}</div>
    </main>
  );
}
