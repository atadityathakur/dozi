import { Pencil, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNow } from "@/hooks/use-now";
import { formatMinutes, minutesOnDay, sessionsOnDay } from "@/lib/stats";
import { appActions, useApp } from "@/state/app-store";

export function GoalCard() {
  const now = useNow(30_000);
  const sessions = useApp((s) => s.sessions);
  const goalMin = useApp((s) => s.settings.dailyGoalMinutes);
  const goalSessions = useApp((s) => s.settings.dailyGoalSessions);
  const task = useApp((s) => s.study.task);

  const minutes = now ? minutesOnDay(sessions, now) : 0;
  const count = now ? sessionsOnDay(sessions, now).length : 0;
  const pct = Math.min(1, goalMin ? minutes / goalMin : 0);
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <section className="surface flex flex-col gap-4 p-5" aria-label="Daily goal">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Target className="h-3.5 w-3.5" /> Today's goal
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Edit daily goal">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-hours">Focus time (minutes)</Label>
              <Input
                id="goal-hours"
                type="number"
                min={10}
                max={960}
                step={10}
                value={goalMin}
                onChange={(e) => appActions.updateSettings({ dailyGoalMinutes: Math.max(10, Math.min(960, Number(e.target.value) || 10)) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-sessions">Focus sessions</Label>
              <Input
                id="goal-sessions"
                type="number"
                min={1}
                max={24}
                value={goalSessions}
                onChange={(e) => appActions.updateSettings({ dailyGoalSessions: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 110 110" className="h-full w-full">
            <circle cx="55" cy="55" r={R} fill="none" strokeWidth="9" style={{ stroke: "var(--muted)" }} />
            <circle
              cx="55"
              cy="55"
              r={R}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 55 55)"
              style={{ stroke: "var(--primary)", transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl text-foreground">{Math.round(pct * 100)}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight text-foreground">
            {formatMinutes(minutes)} <span className="text-base text-muted-foreground">/ {formatMinutes(goalMin)}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {count} of {goalSessions} sessions
          </p>
          {pct >= 1 && <p className="mt-2 text-sm font-semibold text-accent">Goal reached — lovely work.</p>}
        </div>
      </div>
      {task && (
        <p className="truncate rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
          <span className="text-muted-foreground">Working on: </span>
          {task}
        </p>
      )}
    </section>
  );
}
