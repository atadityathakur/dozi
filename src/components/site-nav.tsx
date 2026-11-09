import { Link } from "@tanstack/react-router";
import { Check, Menu, Palette, Radio, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { THEMES } from "@/lib/defaults";
import { appActions, useApp } from "@/state/app-store";

import { BrandLogo } from "./brand-logo";

const LINKS = [
  { to: "/", label: "Study Room" },
  { to: "/stats", label: "Statistics" },
  { to: "/sounds", label: "Sounds" },
  { to: "/sessions", label: "Sessions" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
  { to: "/yapdash", label: "YapDash" },
] as const;

function ThemeMenu() {
  const theme = useApp((s) => s.settings.theme);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Choose theme">
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Room theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => appActions.updateSettings({ theme: t.id })} className="gap-3 py-2">
            <span className="flex -space-x-1">
              {t.swatch.map((c) => (
                <span key={c} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />
              ))}
            </span>
            <span className="flex-1">{t.name}</span>
            {theme === t.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PointsPill() {
  const points = useApp((s) => s.progress.points);
  return (
    <Link
      to="/stats"
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-soft transition-colors hover:border-accent"
      title="Focus points"
    >
      <Sparkles className="h-4 w-4 text-accent" />
      <span className="tabular">{points}</span>
    </Link>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogo />
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: true }}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-card data-[status=active]:text-foreground data-[status=active]:shadow-soft"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5">
          <Link
            to="/yapdash"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-soft transition-all hover:scale-105 hover:opacity-90"
            title="Go to YapDash"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>YapDash</span>
          </Link>
          <PointsPill />
          <ThemeMenu />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <BrandLogo />
                </SheetTitle>
              </SheetHeader>
              <ul className="mt-6 flex flex-col gap-1 px-2">
                {LINKS.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      onClick={() => setOpen(false)}
                      activeOptions={{ exact: true }}
                      className="block rounded-xl px-4 py-3 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-card data-[status=active]:text-foreground data-[status=active]:shadow-soft"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
