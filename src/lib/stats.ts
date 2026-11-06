import type { StudySession, Subject } from "./types";

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function minutesByDay(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.end);
    map.set(k, (map.get(k) ?? 0) + s.minutes);
  }
  return map;
}

export function sessionsOnDay(sessions: StudySession[], ts: number): StudySession[] {
  const k = dayKey(ts);
  return sessions.filter((s) => dayKey(s.end) === k);
}

export function minutesOnDay(sessions: StudySession[], ts: number): number {
  return sessionsOnDay(sessions, ts).reduce((a, s) => a + s.minutes, 0);
}

export function totalMinutes(sessions: StudySession[]): number {
  return sessions.reduce((a, s) => a + s.minutes, 0);
}

/** Consecutive days with at least one session, ending today (or yesterday if nothing yet today). */
export function currentStreak(sessions: StudySession[], now: number): number {
  const days = new Set(sessions.map((s) => dayKey(s.end)));
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(sessions: StudySession[]): number {
  const days = [...new Set(sessions.map((s) => dayKey(s.end)))].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const [y = 0, m = 1, d = 1] = k.split("-").map(Number);
    const ts = new Date(y, m - 1, d).getTime();
    run = prev != null && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = ts;
  }
  return best;
}

export function longestSession(sessions: StudySession[]): number {
  return sessions.reduce((a, s) => Math.max(a, s.minutes), 0);
}

export function lastNDays(sessions: StudySession[], now: number, n: number) {
  const byDay = minutesByDay(sessions);
  const out: { key: string; label: string; short: string; minutes: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ts = addDays(startOfDay(now), -i);
    const d = new Date(ts);
    out.push({
      key: dayKey(ts),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      short: d.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: byDay.get(dayKey(ts)) ?? 0,
    });
  }
  return out;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function mostProductiveWeekday(sessions: StudySession[]): { day: string; minutes: number } | null {
  if (!sessions.length) return null;
  const totals = new Array(7).fill(0);
  for (const s of sessions) totals[new Date(s.end).getDay()] += s.minutes;
  let best = 0;
  for (let i = 1; i < 7; i++) if (totals[i] > totals[best]) best = i;
  return { day: WEEKDAYS[best] ?? "", minutes: totals[best] ?? 0 };
}

export function bySubject(sessions: StudySession[], subjects: Subject[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = s.subjectId ?? "none";
    map.set(k, (map.get(k) ?? 0) + s.minutes);
  }
  return [...map.entries()]
    .map(([id, minutes]) => {
      const subj = subjects.find((x) => x.id === id);
      return {
        id,
        name: subj?.name ?? "No subject",
        color: subj?.color ?? "var(--border)",
        minutes,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/** Weeks x 7 grid (Sunday-first) ending this week, for the heatmap. */
export function heatmap(sessions: StudySession[], now: number, weeks: number) {
  const byDay = minutesByDay(sessions);
  const today = startOfDay(now);
  const endOfWeek = addDays(today, 6 - new Date(today).getDay());
  const start = addDays(endOfWeek, -(weeks * 7 - 1));
  const cols: { key: string; minutes: number; future: boolean; ts: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const ts = addDays(start, w * 7 + d);
      col.push({ key: dayKey(ts), minutes: byDay.get(dayKey(ts)) ?? 0, future: ts > today, ts });
    }
    cols.push(col);
  }
  return cols;
}

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
