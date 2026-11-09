import { createFileRoute } from "@tanstack/react-router";
import { Check, Download, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { PetCompanion } from "@/components/pets/pet-companion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MODE_ORDER, THEMES, getMode } from "@/lib/defaults";
import { PETS } from "@/lib/pets";
import type { AnimationToggles, ModeId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { appActions, useApp } from "@/state/app-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Dozi" },
      { name: "description", content: "Choose your room theme, your study cat, timer lengths, sounds and daily goals." },
      { property: "og:title", content: "Settings — Dozi" },
      { property: "og:description", content: "Make the study room yours: theme, cat, timers, sounds and goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="surface p-5">
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="bg-background"
      />
    </div>
  );
}

const ANIMS: { id: keyof AnimationToggles; label: string }[] = [
  { id: "rain", label: "Rain" },
  { id: "clouds", label: "Drifting clouds" },
  { id: "lamp", label: "Lamp flicker" },
  { id: "steam", label: "Tea steam" },
  { id: "plant", label: "Swaying plants" },
  { id: "dust", label: "Dust in the sunbeam" },
  { id: "lights", label: "Fairy lights" },
];

function SettingsPage() {
  const s = useApp((st) => st.settings);
  const update = appActions.updateSettings;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(appActions.exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dozi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
      <PageHeader eyebrow="Make it yours" title="Settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Room theme" hint="Changes the colours of the whole site and the study room.">
          <div className="grid gap-3 sm:grid-cols-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ theme: t.id })}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors",
                  s.theme === t.id ? "border-primary bg-muted" : "border-border hover:border-accent",
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="flex -space-x-1">
                    {t.swatch.map((c) => (
                      <span key={c} className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />
                    ))}
                  </span>
                  {s.theme === t.id && <Check className="h-4 w-4 text-primary" />}
                </span>
                <span className="font-semibold text-foreground">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.blurb}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Your study companion" hint="Give your companion a name and pick who studies with you.">
          <div className="grid items-center gap-4 sm:grid-cols-[140px_1fr]">
            <div className="mx-auto h-36 w-36">
              <PetCompanion petId={s.pet || "cat-white"} mood="idle" standalone label={`${s.companionName} preview`} />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="companion-name" className="text-sm font-semibold">Name</Label>
                <Input
                  id="companion-name"
                  value={s.companionName}
                  maxLength={20}
                  onChange={(e) => update({ companionName: e.target.value || "Mochi" })}
                  className="bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PETS.map((p) => {
                  const active = (s.pet || "cat-white") === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        update({
                          pet: p.id,
                          companionCoat: p.id === "cat-orange" ? "ginger" : p.id === "cat-black" ? "midnight" : "snow",
                        })
                      }
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-xl border p-2 text-left transition-colors",
                        active ? "border-primary bg-muted shadow-sm" : "border-border hover:border-accent bg-card/50",
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground flex items-center justify-between w-full">
                        <span>{p.name}</span>
                        {active && <Check className="h-3 w-3 text-primary" />}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{p.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Timer">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Default timer</Label>
            <Select value={s.defaultMode} onValueChange={(v) => update({ defaultMode: v as ModeId })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_ORDER.map((id) => {
                  const m = getMode(id, s);
                  return (
                    <SelectItem key={id} value={id}>
                      {m.label} · {m.focusMin}/{m.breakMin} min
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Custom focus (min)" value={s.customFocusMin} min={5} max={180} onChange={(v) => update({ customFocusMin: v })} />
            <NumberField label="Custom break (min)" value={s.customBreakMin} min={1} max={60} onChange={(v) => update({ customBreakMin: v })} />
          </div>
          <Toggle label="Start breaks automatically" checked={s.autoStartBreaks} onChange={(v) => update({ autoStartBreaks: v })} />
          <Toggle label="Start the next session after a break" checked={s.autoStartFocus} onChange={(v) => update({ autoStartFocus: v })} />
          <Toggle label="24-hour clock" checked={s.clock24h} onChange={(v) => update({ clock24h: v })} />
        </Card>

        <Card title="Daily goal">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Minutes per day" value={s.dailyGoalMinutes} min={15} max={720} onChange={(v) => update({ dailyGoalMinutes: v })} />
            <NumberField label="Sessions per day" value={s.dailyGoalSessions} min={1} max={30} onChange={(v) => update({ dailyGoalSessions: v })} />
          </div>
        </Card>

        <Card title="Notifications">
          <Toggle label="Chime when a session ends" checked={s.soundNotifications} onChange={(v) => update({ soundNotifications: v })} />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Chime volume</Label>
            <Slider
              value={[Math.round(s.notificationVolume * 100)]}
              max={100}
              step={5}
              onValueChange={([v]) => update({ notificationVolume: (v ?? 0) / 100 })}
              aria-label="Chime volume"
            />
          </div>
          <Toggle
            label="Desktop notifications"
            hint="Shows a pop-up when you're in another tab."
            checked={s.desktopNotifications}
            onChange={async (v) => {
              if (v && typeof Notification !== "undefined" && Notification.permission !== "granted") {
                const p = await Notification.requestPermission();
                if (p !== "granted") {
                  toast("Notifications are blocked", { description: "Allow them in your browser settings to turn this on." });
                  return;
                }
              }
              update({ desktopNotifications: v });
            }}
          />
        </Card>

        <Card title="Motion">
          <Toggle label="Reduce motion" hint="Stops all animations in the room." checked={s.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
          <Toggle label="Room animations" checked={s.ambientAnimations} onChange={(v) => update({ ambientAnimations: v })} />
          <div className={cn("grid grid-cols-2 gap-x-6 gap-y-3", !s.ambientAnimations && "pointer-events-none opacity-50")}>
            {ANIMS.map((a) => (
              <Toggle
                key={a.id}
                label={a.label}
                checked={s.animations[a.id]}
                onChange={(v) => update({ animations: { ...s.animations, [a.id]: v } })}
              />
            ))}
          </div>
        </Card>

        <Card title="Your data" hint="Everything is stored on this device only.">
          <div className="flex flex-wrap gap-3">
            <Button variant="soft" onClick={exportData}>
              <Download /> Download a backup
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <RotateCcw /> Reset everything
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Dozi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes all your sessions, points, badges and settings on this device. It can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my data</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      appActions.resetAll();
                      toast("Fresh start", { description: "Everything has been reset." });
                    }}
                  >
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </main>
  );
}
