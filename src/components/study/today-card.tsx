import { Coffee, Flame, Sparkles, Timer } from "lucide-react";

import { useNow } from "@/hooks/use-now";
import { getMode } from "@/lib/defaults";
import { currentStreak, sessionsOnDay } from "@/lib/stats";
import { getRemaining } from "@/lib/timer";
import { useApp } from "@/state/app-store";

const QUOTES = [
  "Slow progress is still progress.",
  "Done is a kind of beautiful.",
  "Show up, even softly.",
  "Little by little, a little becomes a lot.",
  "Your pace is the right pace.",
  "Rest, then rise again.",
  "Consistency beats intensity.",
];

export function TodayCard() {
  const now = useNow(1000);
  const sessions = useApp((s) => s.sessions);
  const points = useApp((s) => s.progress.points);
  const timer = useApp((s) => s.timer);
  const settings = useApp((s) => s.settings);

  const today = now ? sessionsOnDay(sessions, now) : [];
  const streak = now ? currentStreak(sessions, now) : 0;
  const quote = QUOTES[now ? new Date(now).getDate() % QUOTES.length : 0];
  const mode = getMode(timer.modeId, settings);
  const minsLeft = now ? Math.ceil(getRemaining(timer, now) / 60000) : 0;

  let upcoming: { icon: typeof Coffee; text: string };
  if (timer.phase === "focus") {
    upcoming =
      timer.status === "running"
        ? { icon: Coffee, text: `Break in ${minsLeft} min` }
        : { icon: Coffee, text: `${mode.breakMin}-min break after this session` };
  } else {
    upcoming =
      timer.status === "running"
        ? { icon: Timer, text: `Back to focus in ${minsLeft} min` }
        : { icon: Timer, text: "Break ready — start when you like" };
  }
  const UpIcon = upcoming.icon;

  return (
    <section className="surface flex flex-col gap-4 p-5" aria-label="Today">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Today</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted p-3">
          <p className="font-display text-2xl text-foreground">{today.length}</p>
          <p className="text-[11px] text-muted-foreground">sessions</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="flex items-center gap-1 font-display text-2xl text-foreground">
            {streak}
            <Flame className="h-4 w-4 text-accent" />
          </p>
          <p className="text-[11px] text-muted-foreground">day streak</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="flex items-center gap-1 font-display text-2xl text-foreground">
            {points}
            <Sparkles className="h-4 w-4 text-highlight" />
          </p>
          <p className="text-[11px] text-muted-foreground">focus pts</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-foreground">
        <UpIcon className="h-4 w-4 text-accent" />
        {upcoming.text}
      </div>
      {today.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {today
            .slice(-3)
            .reverse()
            .map((s) => (
              <li key={s.id} className="flex justify-between text-muted-foreground">
                <span className="truncate">{s.task || "Focus session"}</span>
                <span className="tabular shrink-0 pl-2">
                  {Math.round(s.minutes)}m · {new Date(s.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !settings.clock24h })}
                </span>
              </li>
            ))}
        </ul>
      )}
      <blockquote className="mt-auto border-l-2 border-accent pl-3 font-display text-lg italic leading-snug text-foreground">
        “{quote}”
      </blockquote>
    </section>
  );
}
