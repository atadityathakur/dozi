import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/page-header";
import { AchievementBadge } from "@/components/stats/achievement-badge";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  addDays,
  bySubject,
  currentStreak,
  dayKey,
  formatMinutes,
  heatmap,
  lastNDays,
  longestSession,
  longestStreak,
  minutesByDay,
  mostProductiveWeekday,
  startOfDay,
  totalMinutes,
} from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-store";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Dozi" },
      { name: "description", content: "Your focus time, streaks, subjects and badges — all in one calm overview." },
      { property: "og:title", content: "Statistics — Dozi" },
      { property: "og:description", content: "Focus time, streaks, subjects and badges in one calm overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function heatLevel(min: number) {
  if (min <= 0) return "bg-muted";
  if (min < 30) return "bg-primary/25";
  if (min < 90) return "bg-primary/50";
  if (min < 180) return "bg-primary/75";
  return "bg-primary";
}

function StatsPage() {
  const now = useNow(60_000);
  const sessions = useApp((s) => s.sessions);
  const subjects = useApp((s) => s.subjects);
  const progress = useApp((s) => s.progress);
  const goal = useApp((s) => s.settings.dailyGoalMinutes);
  const hydrated = useApp((s) => s.hydrated);

  const data = useMemo(() => {
    if (!now) return null;
    const days14 = lastNDays(sessions, now, 14);
    const week = lastNDays(sessions, now, 7);
    const byDay = minutesByDay(sessions);
    const activeDays = [...byDay.values()].filter((m) => m > 0).length;
    const goalDays = [...byDay.values()].filter((m) => m >= goal).length;
    return {
      days14,
      weekMinutes: week.reduce((a, d) => a + d.minutes, 0),
      streak: currentStreak(sessions, now),
      bestStreak: longestStreak(sessions),
      longest: longestSession(sessions),
      productive: mostProductiveWeekday(sessions),
      subjects: bySubject(sessions, subjects),
      heat: heatmap(sessions, now, 18),
      activeDays,
      goalRate: activeDays ? Math.round((goalDays / activeDays) * 100) : 0,
      byDay,
    };
  }, [sessions, subjects, now, goal]);

  if (!data || !hydrated) {
    return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6" />;
  }

  // streak calendar: current month
  const today = new Date(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const lead = new Date(monthStart).getDay();
  const recent = [...sessions].sort((a, b) => b.end - a.end).slice(0, 6);
  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name ?? "No subject";
  const totalSubj = data.subjects.reduce((a, s) => a + s.minutes, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
      <PageHeader eyebrow="Your progress" title="Statistics" />

      {sessions.length === 0 && (
        <div className="surface mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-muted-foreground">No sessions yet. Finish your first focus session and your charts will start to grow.</p>
          <Button asChild variant="hero">
            <Link to="/">Go to the study room</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total focus" value={formatMinutes(totalMinutes(sessions))} />
        <Kpi label="Sessions" value={String(sessions.length)} />
        <Kpi label="Streak" value={`${data.streak} days`} hint={`Best: ${data.bestStreak} days`} />
        <Kpi label="Longest session" value={formatMinutes(data.longest)} />
        <Kpi label="This week" value={formatMinutes(data.weekMinutes)} />
        <Kpi label="Focus points" value={String(progress.points)} hint={`Goal hit on ${data.goalRate}% of study days`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-xl text-foreground">Daily study time</h2>
          <p className="text-sm text-muted-foreground">Last 14 days · dashed line is your daily goal</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.days14} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }}
                  formatter={(v: any) => [formatMinutes(Number(v) || 0), "Focus"]}
                  labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ""}
                />
                <Bar dataKey="minutes" radius={[8, 8, 3, 3]}>
                  {data.days14.map((d) => (
                    <Cell key={d.key} fill={d.minutes >= goal ? "var(--accent)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-xl text-foreground">By subject</h2>
          {data.subjects.length ? (
            <>
              <div className="mx-auto mt-2 h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.subjects} dataKey="minutes" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="var(--card)">
                      {data.subjects.map((s) => (
                        <Cell key={s.id} fill={s.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {data.subjects.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 truncate text-foreground">{s.name}</span>
                    <span className="tabular text-muted-foreground">
                      {formatMinutes(s.minutes)} · {Math.round((s.minutes / totalSubj) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Pick a subject before your next session to see a breakdown here.</p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface overflow-x-auto p-5 lg:col-span-2">
          <h2 className="font-display text-xl text-foreground">Activity</h2>
          <p className="text-sm text-muted-foreground">
            {data.activeDays} study days
            {data.productive ? ` · most productive on ${data.productive.day}s` : ""}
          </p>
          <div className="mt-4 flex gap-1">
            {data.heat.map((col, i) => (
              <div key={i} className="flex flex-col gap-1">
                {col.map((cell) => (
                  <div
                    key={cell.key}
                    title={`${new Date(cell.ts).toLocaleDateString()} · ${formatMinutes(cell.minutes)}`}
                    className={cn("h-3.5 w-3.5 rounded-[4px] sm:h-4 sm:w-4", cell.future ? "bg-transparent" : heatLevel(cell.minutes))}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            Less
            {[0, 20, 60, 120, 200].map((m) => (
              <span key={m} className={cn("h-3 w-3 rounded-[3px]", heatLevel(m))} />
            ))}
            More
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-xl text-foreground">
            {today.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <p className="text-sm text-muted-foreground">Streak calendar</p>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px]">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="font-semibold text-muted-foreground">
                {d}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`l${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const ts = addDays(monthStart, i);
              const mins = data.byDay.get(dayKey(ts)) ?? 0;
              const isToday = dayKey(ts) === dayKey(startOfDay(now));
              return (
                <span
                  key={i}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full text-xs",
                    mins >= goal ? "bg-accent text-accent-foreground" : mins > 0 ? "bg-primary/20 text-foreground" : "text-muted-foreground",
                    isToday && "ring-2 ring-ring",
                  )}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-foreground">Recent sessions</h2>
            <Link to="/sessions" className="text-sm font-semibold text-accent hover:underline">
              See all
            </Link>
          </div>
          {recent.length ? (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{s.task || subjectName(s.subjectId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {subjectName(s.subjectId)}
                    </p>
                  </div>
                  <span className="tabular text-muted-foreground">{formatMinutes(s.minutes)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
          )}
        </section>
        <section className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-xl text-foreground">Badges</h2>
          <p className="text-sm text-muted-foreground">
            {Object.keys(progress.achievements).length} of {ACHIEVEMENTS.length} earned · 1 focus point per focused minute, +50 for hitting your daily goal
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => (
              <AchievementBadge key={a.id} def={a} unlockedAt={progress.achievements[a.id]} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
