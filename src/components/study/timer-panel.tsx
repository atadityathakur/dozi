import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNow } from "@/hooks/use-now";
import { audioController } from "@/lib/audio/controller";
import { MODE_ORDER, getMode } from "@/lib/defaults";
import { sessionsOnDay } from "@/lib/stats";
import { formatClock, getProgress, getRemaining } from "@/lib/timer";
import { cn } from "@/lib/utils";
import { appActions, timerActions, useApp } from "@/state/app-store";

const ENCOURAGE_FOCUS = [
  "You're doing great. Keep going.",
  "Stay with it — one line at a time.",
  "Quiet mind, steady hands.",
  "Future you says thank you.",
];
const ENCOURAGE_BREAK = ["Rest your eyes for a bit.", "Stretch, sip, breathe.", "You earned this pause."];

function Confetti({ burstKey }: { burstKey: number }) {
  if (!burstKey) return null;
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 90 + (i % 3) * 30;
    return {
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 20}px`,
      rot: `${(i % 2 ? 1 : -1) * (120 + i * 20)}deg`,
      color: ["var(--accent)", "var(--highlight)", "var(--primary)", "var(--chart-4)"][i % 4],
      round: i % 3 === 0,
    };
  });
  return (
    <div key={burstKey} className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn("motion-safe-anim a-confetti absolute h-2 w-2", p.round ? "rounded-full" : "rounded-[2px]")}
          style={{ background: p.color, ["--dx" as string]: p.dx, ["--dy" as string]: p.dy, ["--rot" as string]: p.rot }}
        />
      ))}
    </div>
  );
}

export function TimerPanel() {
  const timer = useApp((s) => s.timer);
  const settings = useApp((s) => s.settings);
  const sessions = useApp((s) => s.sessions);
  const subjects = useApp((s) => s.subjects);
  const study = useApp((s) => s.study);
  const celebrateAt = useApp((s) => s.runtime.celebrateAt);
  const hydrated = useApp((s) => s.hydrated);
  const running = timer.status === "running";
  const now = useNow(250, running);
  const [clockNow, setClockNow] = useState(0);
  useEffect(() => setClockNow(Date.now()), [timer, celebrateAt]);
  const t = running ? now || clockNow : clockNow;

  const mode = getMode(timer.modeId, settings);
  const remaining = getRemaining(timer, t || Date.now());
  const progress = t ? getProgress(timer, t) : 0;
  const isFocus = timer.phase === "focus";
  const recentlyDone = !!celebrateAt && (t || 0) - celebrateAt < 5000;

  const todayCount = clockNow ? sessionsOnDay(sessions, clockNow).length : 0;
  const goalSessions = settings.dailyGoalSessions;

  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMsgIdx((i) => i + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const message = recentlyDone
    ? "One more session in the books!"
    : isFocus
      ? ENCOURAGE_FOCUS[msgIdx % ENCOURAGE_FOCUS.length]
      : ENCOURAGE_BREAK[msgIdx % ENCOURAGE_BREAK.length];

  const R = 132;
  const C = 2 * Math.PI * R;
  const knobAngle = progress * Math.PI * 2 - Math.PI / 2;

  const mainLabel = running ? "Pause" : timer.status === "paused" ? "Resume" : "Start";

  const onMain = () => {
    // Use this click (a user gesture) to unlock audio so the completion chime can play later.
    if (!running && settings.soundNotifications) audioController.unlock();
    timerActions.toggle();
  };

  return (
    <section className="surface relative flex h-full flex-col overflow-hidden p-5 sm:p-7" aria-label="Study timer">
      {/* mode selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Timer mode" className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
          {MODE_ORDER.map((id) => {
            const m = getMode(id, settings);
            const active = timer.modeId === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => timerActions.setMode(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm",
                  active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1 text-xs font-semibold">
          {(["focus", "break"] as const).map((p) => (
            <button
              key={p}
              onClick={() => timerActions.setPhase(p)}
              aria-pressed={timer.phase === p}
              className={cn(
                "rounded-full px-3 py-1 capitalize transition-colors",
                timer.phase === p
                  ? p === "focus"
                    ? "bg-primary text-primary-foreground"
                    : "bg-highlight text-highlight-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {timer.modeId === "custom" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            Focus
            <Input
              type="number"
              min={1}
              max={240}
              value={settings.customFocusMin}
              disabled={timer.status !== "idle"}
              onChange={(e) => appActions.updateSettings({ customFocusMin: Math.min(240, Math.max(1, Number(e.target.value) || 1)) })}
              className="h-8 w-20"
            />
            min
          </label>
          <label className="flex items-center gap-2">
            Break
            <Input
              type="number"
              min={1}
              max={60}
              value={settings.customBreakMin}
              disabled={timer.status !== "idle"}
              onChange={(e) => appActions.updateSettings({ customBreakMin: Math.min(60, Math.max(1, Number(e.target.value) || 1)) })}
              className="h-8 w-20"
            />
            min
          </label>
        </div>
      )}

      {/* ring + digits */}
      <div className="relative mx-auto my-6 aspect-square w-full max-w-[330px]">
        <svg viewBox="0 0 300 300" className="h-full w-full -rotate-0">
          <circle cx="150" cy="150" r={R} fill="none" style={{ stroke: "var(--muted)" }} strokeWidth="10" />
          <circle
            cx="150"
            cy="150"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            transform="rotate(-90 150 150)"
            style={{ stroke: isFocus ? "var(--accent)" : "var(--highlight)", transition: "stroke-dashoffset 0.3s linear" }}
          />
          {progress > 0 && (
            <circle
              cx={150 + Math.cos(knobAngle) * R}
              cy={150 + Math.sin(knobAngle) * R}
              r="9"
              style={{ fill: "var(--card)", stroke: isFocus ? "var(--accent)" : "var(--highlight)" }}
              strokeWidth="4"
            />
          )}
        </svg>
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center rounded-full text-center", recentlyDone && "motion-safe-anim a-ring-pulse")}>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {isFocus ? mode.sessionLabel : `${mode.breakMin} min break`}
          </span>
          <span
            className="tabular mt-1 font-sans text-6xl font-light tracking-tight text-foreground sm:text-7xl"
            aria-live="off"
            suppressHydrationWarning
          >
            {formatClock(hydrated ? remaining : timer.durationMs)}
          </span>
          <span className="mt-2 max-w-[70%] font-display text-sm italic text-muted-foreground sm:text-base">{message}</span>
        </div>
        <Confetti burstKey={recentlyDone ? (celebrateAt ?? 0) : 0} />
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="soft" size="icon-lg" onClick={() => timerActions.reset()} aria-label="Reset timer">
          <RotateCcw />
        </Button>
        <Button variant="hero" size="xl" onClick={onMain} className="min-w-40">
          {running ? <Pause /> : <Play />}
          {mainLabel}
        </Button>
        <Button
          variant="soft"
          size="icon-lg"
          onClick={() => timerActions.skip()}
          aria-label={isFocus ? "Skip to break" : "Skip break"}
          title={isFocus ? "Skip to break (no credit)" : "Skip break"}
        >
          <SkipForward />
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {isFocus ? `Up next: ${mode.breakMin}-minute break` : `Up next: ${mode.focusMin}-minute focus`}
        {" · "}
        {todayCount}/{goalSessions} sessions today
      </p>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: Math.max(goalSessions, todayCount) }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-5 rounded-full", i < todayCount ? "bg-accent" : "bg-muted")} />
        ))}
      </div>

      {/* subject + task */}
      <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        <Select
          value={study.subjectId ?? "none"}
          onValueChange={(v) => appActions.setStudy({ subjectId: v === "none" ? null : v })}
        >
          <SelectTrigger aria-label="Subject">
            <SelectValue placeholder="Choose a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No subject</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="What are you working on?"
          value={study.task}
          maxLength={60}
          onChange={(e) => appActions.setStudy({ task: e.target.value })}
          aria-label="Current task"
        />
      </div>
    </section>
  );
}
