import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, CloudRain, Moon, Sun, Sunrise, Sunset } from "lucide-react";

import { MusicPlayer } from "@/components/audio/music-player";
import { GoalCard } from "@/components/study/goal-card";
import { StudyScene } from "@/components/study/study-scene";
import { TimerPanel } from "@/components/study/timer-panel";
import { TodayCard } from "@/components/study/today-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDaypart, useNow } from "@/hooks/use-now";
import { RAINY_THEMES } from "@/lib/defaults";
import { PETS, getPet } from "@/lib/pets";
import { appActions, useApp } from "@/state/app-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study Room — Dozi" },
      { name: "description", content: "Sit down in your cozy study room: a focus timer, lo-fi music and a little cat who studies with you." },
      { property: "og:title", content: "Study Room — Dozi" },
      { property: "og:description", content: "A cozy focus timer, lo-fi music and a study cat that keeps you company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyRoom,
});

const DAYPART_META = {
  morning: { icon: Sunrise, label: "Early light" },
  day: { icon: Sun, label: "Bright afternoon" },
  evening: { icon: Sunset, label: "Golden evening" },
  night: { icon: Moon, label: "Quiet night" },
} as const;

function SceneCaption() {
  const now = useNow(1000);
  const clock24 = useApp((s) => s.settings.clock24h);
  const name = useApp((s) => s.settings.companionName);
  const petId = useApp((s) => s.settings.pet);
  const currentPet = getPet(petId);
  const rain = useApp(
    (s) => (s.runtime.ambiencePlaying && !!s.audio.layers["rain"]?.on) || RAINY_THEMES.includes(s.settings.theme),
  );
  const daypart = getDaypart(now);
  const meta = DAYPART_META[daypart];
  const Icon = rain ? CloudRain : meta.icon;
  const d = now ? new Date(now) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-accent" />
          {rain ? "Rain on the window" : meta.label} · hold {name} to pet
        </span>
        <span className="text-border">·</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-accent cursor-pointer"
              title="Change study companion"
            >
              <span>{currentPet.name}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Study companion</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PETS.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() =>
                  appActions.updateSettings({
                    pet: p.id,
                    companionCoat: p.id === "cat-orange" ? "ginger" : p.id === "cat-black" ? "midnight" : "snow",
                  })
                }
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-xs">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">{p.blurb}</span>
                </div>
                {currentPet.id === p.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="tabular font-semibold text-foreground" suppressHydrationWarning>
        {d
          ? `${d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !clock24 })}`
          : "\u00a0"}
      </span>
    </div>
  );
}

function StudyRoom() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <h1 className="sr-only">Dozi study room</h1>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <TimerPanel />
        </div>
        <div className="lg:col-span-7">
          <section className="surface h-full overflow-hidden" aria-label="Study room">
            <StudyScene />
            <SceneCaption />
          </section>
        </div>
      </div>

      {/* Lo-fi radio, just below the study room */}
      <section className="surface mt-6 overflow-hidden" aria-label="Lo-fi radio">
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full"
            src="https://www.youtube.com/embed/rFZHOHl-L8A"
            title="lofi hip hop radio 📚 beats to relax/study to"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </section>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MusicPlayer />
        <GoalCard />
        <TodayCard />
      </div>
    </main>
  );
}
