/**
 * Pure, timestamp-based timer logic. No React, no intervals.
 * Remaining time is always derived from `endsAt - now`, so the countdown
 * stays accurate across tab switches, throttling and page reloads.
 */
import type { ModeId, Phase, TimerState } from "./types";

export const MIN = 60_000;

export function createTimer(modeId: ModeId, phase: Phase, minutes: number): TimerState {
  const durationMs = Math.max(1, Math.round(minutes * MIN));
  return { modeId, phase, status: "idle", durationMs, endsAt: null, remainingMs: durationMs, startedAt: null };
}

export function getRemaining(t: TimerState, now: number): number {
  if (t.status === "running" && t.endsAt != null) return Math.max(0, t.endsAt - now);
  return Math.max(0, t.remainingMs);
}

export function getProgress(t: TimerState, now: number): number {
  if (t.durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - getRemaining(t, now) / t.durationMs));
}

export function start(t: TimerState, now: number): TimerState {
  if (t.status === "running") return t;
  const remaining = t.remainingMs > 0 ? t.remainingMs : t.durationMs;
  return {
    ...t,
    status: "running",
    endsAt: now + remaining,
    remainingMs: remaining,
    startedAt: t.startedAt ?? now,
  };
}

export function pause(t: TimerState, now: number): TimerState {
  if (t.status !== "running") return t;
  return { ...t, status: "paused", remainingMs: getRemaining(t, now), endsAt: null };
}

export function reset(t: TimerState): TimerState {
  return { ...t, status: "idle", endsAt: null, remainingMs: t.durationMs, startedAt: null };
}

export function isComplete(t: TimerState, now: number): boolean {
  return t.status === "running" && t.endsAt != null && now >= t.endsAt;
}

/** Minutes of focus actually elapsed in the current phase. */
export function elapsedMinutes(t: TimerState, now: number): number {
  return (t.durationMs - getRemaining(t, now)) / MIN;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
