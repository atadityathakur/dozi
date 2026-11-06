import { createFileRoute } from "@tanstack/react-router";
import { CloudRain, Moon, Sun, Sunrise, Sunset } from "lucide-react";

import { MusicPlayer } from "@/components/audio/music-player";
import { GoalCard } from "@/components/study/goal-card";
import { StudyScene } from "@/components/study/study-scene";
import { TimerPanel } from "@/components/study/timer-panel";
import { TodayCard } from "@/components/study/today-card";
import { getDaypart, useNow } from "@/hooks/use-now";
import { useApp } from "@/state/app-store";

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
  const rain = useApp((s) => s.runtime.ambiencePlaying && !!s.audio.layers["rain"]?.on);
  const daypart = getDaypart(now);
  const meta = DAYPART_META[daypart];
  const Icon = rain ? CloudRain : meta.icon;
  const d = now ? new Date(now) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-accent" />
        {rain ? "Rain on the window" : meta.label} · tap {name} to say hi
      </span>
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
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MusicPlayer />
        <GoalCard />
        <TodayCard />
      </div>
    </main>
  );
}
