import { Link } from "@tanstack/react-router";

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" style={{ fill: "var(--primary)" }} />
      <path d="M9 17 L11 7 L18 13 Z M31 17 L29 7 L22 13 Z" style={{ fill: "var(--highlight)" }} />
      <ellipse cx="20" cy="22" rx="12" ry="10" style={{ fill: "var(--highlight)" }} />
      <path d="M14 21 q2 2 4 0 M22 21 q2 2 4 0" style={{ stroke: "var(--primary)", strokeWidth: 1.8, fill: "none", strokeLinecap: "round" }} />
      <path d="M18.8 25 h2.4 l-1.2 1.4 Z" style={{ fill: "var(--accent)" }} />
    </svg>
  );
}

export function BrandLogo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Dozi — study room">
      <BrandMark />
      <span className="font-display text-2xl font-semibold tracking-tight text-foreground">dozi</span>
    </Link>
  );
}
