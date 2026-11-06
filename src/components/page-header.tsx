import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl text-foreground sm:text-5xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}
