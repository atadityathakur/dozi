/**
 * Central app store (tiny external store + useSyncExternalStore).
 * Persisted slices are written through the persistence adapter, so the
 * same actions can later sync to a cloud backend without touching UI code.
 */
import { useSyncExternalStore } from "react";

import { evaluateAchievements, pointsForSession } from "@/lib/achievements";
import {
  DAILY_GOAL_BONUS,
  DEFAULT_AUDIO,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  DEFAULT_SUBJECTS,
  PREFS_VERSION,
  SUBJECT_COLORS,
  getMode,
} from "@/lib/defaults";
import { SOUND_CATEGORIES } from "@/lib/audio/catalog";
import { localPersistence, type PersistenceAdapter } from "@/lib/persistence";
import { isPetId, petFromCoat } from "@/lib/pets";
import { dayKey, minutesOnDay } from "@/lib/stats";
import * as T from "@/lib/timer";
import type {
  AudioPrefs,
  ModeId,
  Phase,
  Progress,
  Settings,
  StudyContext,
  StudySession,
  Subject,
  TimerState,
} from "@/lib/types";

export interface Runtime {
  musicPlaying: boolean;
  ambiencePlaying: boolean;
  celebrateAt: number | null;
  petAt: number | null;
  lastInteraction: number;
  lastCompleted: { phase: Phase; at: number } | null;
  /** Sound ids whose audio file failed to load. */
  unavailable: string[];
}

export interface AppState {
  hydrated: boolean;
  settings: Settings;
  timer: TimerState;
  sessions: StudySession[];
  subjects: Subject[];
  study: StudyContext;
  progress: Progress;
  audio: AudioPrefs;
  runtime: Runtime;
}

const PERSISTED = ["settings", "timer", "sessions", "subjects", "study", "progress", "audio"] as const;
type PersistedKey = (typeof PERSISTED)[number];

function initialTimer(settings: Settings): TimerState {
  const mode = getMode(settings.defaultMode, settings);
  return T.createTimer(mode.id, "focus", mode.focusMin);
}

export function createInitialState(): AppState {
  return {
    hydrated: false,
    settings: DEFAULT_SETTINGS,
    timer: initialTimer(DEFAULT_SETTINGS),
    sessions: [],
    subjects: DEFAULT_SUBJECTS,
    study: { subjectId: null, task: "" },
    progress: DEFAULT_PROGRESS,
    audio: DEFAULT_AUDIO,
    runtime: {
      musicPlaying: false,
      ambiencePlaying: false,
      celebrateAt: null,
      petAt: null,
      lastInteraction: 0,
      lastCompleted: null,
      unavailable: [],
    },
  };
}

const SERVER_STATE = createInitialState();
let state: AppState = createInitialState();
const listeners = new Set<() => void>();
let persistence: PersistenceAdapter = localPersistence;

export function getState() {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  const prev = state;
  state = { ...state, ...p };
  if (state.hydrated) {
    for (const key of PERSISTED) {
      if (state[key] !== prev[key]) persistence.save(key, state[key]);
    }
  }
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<R>(selector: (s: AppState) => R): R {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(SERVER_STATE),
  );
}

/* ---------------- events (for side effects like sounds & toasts) ---------------- */

export type AppEvent =
  | {
      type: "focus-complete";
      minutes: number;
      points: number;
      bonus: number;
      achievements: string[];
      silent: boolean;
    }
  | { type: "break-complete"; silent: boolean };

const eventListeners = new Set<(e: AppEvent) => void>();
export function onAppEvent(l: (e: AppEvent) => void) {
  eventListeners.add(l);
  return () => eventListeners.delete(l);
}
function emit(e: AppEvent) {
  eventListeners.forEach((l) => l(e));
}

/* ---------------- hydration ---------------- */

export function hydrate(adapter: PersistenceAdapter = localPersistence) {
  persistence = adapter;
  const loaded: Partial<Record<PersistedKey, unknown>> = {};
  for (const key of PERSISTED) loaded[key] = adapter.load(key);

  const settingsRaw = (loaded.settings ?? {}) as Partial<Settings>;
  const outdated = loaded.settings != null && (settingsRaw.prefsVersion ?? 1) < PREFS_VERSION;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...settingsRaw,
    ...(outdated
      ? { theme: DEFAULT_SETTINGS.theme, companionCoat: DEFAULT_SETTINGS.companionCoat, prefsVersion: PREFS_VERSION }
      : {}),
    animations: { ...DEFAULT_SETTINGS.animations, ...(settingsRaw.animations ?? {}) },
  };
  // Pick up the saved pet, or derive it from the cat coat older saves stored.
  settings.pet = isPetId(settingsRaw.pet)
    ? settingsRaw.pet
    : outdated
      ? DEFAULT_SETTINGS.pet
      : petFromCoat(settingsRaw.companionCoat);
  const audioRaw = (loaded.audio ?? {}) as Partial<AudioPrefs>;
  if (audioRaw.category && !SOUND_CATEGORIES.some((c) => c.id === audioRaw.category)) audioRaw.category = "lofi";
  const timer = (loaded.timer as TimerState | null) ?? initialTimer(settings);

  state = {
    ...state,
    settings,
    timer,
    sessions: Array.isArray(loaded.sessions) ? (loaded.sessions as StudySession[]) : [],
    subjects: Array.isArray(loaded.subjects) && (loaded.subjects as Subject[]).length
      ? (loaded.subjects as Subject[])
      : DEFAULT_SUBJECTS,
    study: { subjectId: null, task: "", ...((loaded.study as StudyContext | null) ?? {}) },
    progress: { ...DEFAULT_PROGRESS, ...((loaded.progress as Progress | null) ?? {}) },
    audio: { ...DEFAULT_AUDIO, ...audioRaw, layers: { ...DEFAULT_AUDIO.layers, ...(audioRaw.layers ?? {}) } },
    runtime: { ...state.runtime, lastInteraction: Date.now() },
    hydrated: true,
  };
  listeners.forEach((l) => l());

  // A phase that finished while the tab was closed is credited now.
  const now = Date.now();
  if (T.isComplete(state.timer, now)) completePhase(state.timer.endsAt ?? now, true);
}

/* ---------------- timer actions ---------------- */

function timerFor(modeId: ModeId, phase: Phase, settings = state.settings) {
  const mode = getMode(modeId, settings);
  return T.createTimer(modeId, phase, phase === "focus" ? mode.focusMin : mode.breakMin);
}

export const timerActions = {
  setMode(modeId: ModeId) {
    setState({ timer: timerFor(modeId, "focus") });
  },
  setPhase(phase: Phase) {
    setState((s) => ({ timer: timerFor(s.timer.modeId, phase) }));
  },
  start() {
    setState((s) => ({ timer: T.start(s.timer, Date.now()) }));
  },
  pause() {
    setState((s) => ({ timer: T.pause(s.timer, Date.now()) }));
  },
  toggle() {
    const t = state.timer;
    if (t.status === "running") timerActions.pause();
    else timerActions.start();
  },
  reset() {
    setState((s) => ({ timer: T.reset(s.timer) }));
  },
  skip() {
    const t = state.timer;
    const next = timerFor(t.modeId, t.phase === "focus" ? "break" : "focus");
    setState({ timer: next });
  },
  tick(now = Date.now()) {
    const t = state.timer;
    if (T.isComplete(t, now)) completePhase(t.endsAt ?? now, false);
  },
};

export function completePhase(at: number, silent: boolean) {
  const s = state;
  const t = s.timer;
  const now = Date.now();

  if (t.phase === "focus") {
    const minutes = Math.round((t.durationMs / T.MIN) * 10) / 10;
    const session: StudySession = {
      id: `${at}-${Math.random().toString(36).slice(2, 8)}`,
      start: t.startedAt ?? at - t.durationMs,
      end: at,
      minutes,
      modeId: t.modeId,
      subjectId: s.study.subjectId,
      ...(s.study.task ? { task: s.study.task } : {}),
    };
    const sessions = [...s.sessions, session];
    const points = pointsForSession(minutes);
    let bonus = 0;
    let progress: Progress = { ...s.progress, points: s.progress.points + points };
    const today = dayKey(at);
    if (minutesOnDay(sessions, at) >= s.settings.dailyGoalMinutes && !progress.goalBonusDays.includes(today)) {
      bonus = DAILY_GOAL_BONUS;
      progress = { ...progress, points: progress.points + bonus, goalBonusDays: [...progress.goalBonusDays, today] };
    }
    const unlocked = evaluateAchievements(sessions, progress, at);
    if (unlocked.length) {
      const ach = { ...progress.achievements };
      unlocked.forEach((id) => (ach[id] = at));
      progress = { ...progress, achievements: ach };
    }
    let next = timerFor(t.modeId, "break");
    if (s.settings.autoStartBreaks) next = T.start(next, now);
    setState({
      sessions,
      progress,
      timer: next,
      runtime: { ...s.runtime, celebrateAt: now, lastCompleted: { phase: "focus", at: now } },
    });
    emit({ type: "focus-complete", minutes, points, bonus, achievements: unlocked, silent });
  } else {
    let next = timerFor(t.modeId, "focus");
    if (s.settings.autoStartFocus) next = T.start(next, now);
    setState({ timer: next, runtime: { ...s.runtime, lastCompleted: { phase: "break", at: now } } });
    emit({ type: "break-complete", silent });
  }
}

/* ---------------- other actions ---------------- */

export const appActions = {
  updateSettings(patch: Partial<Settings>) {
    const settings = { ...state.settings, ...patch };
    const t = state.timer;
    const durationsChanged =
      patch.customFocusMin !== undefined || patch.customBreakMin !== undefined;
    let timer = t;
    if (durationsChanged && t.modeId === "custom" && t.status === "idle") timer = timerFor("custom", t.phase, settings);
    setState({ settings, timer });
  },
  setStudy(patch: Partial<StudyContext>) {
    setState((s) => ({ study: { ...s.study, ...patch } }));
  },
  addSubject(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      subjects: [
        ...s.subjects,
        {
          id: `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
          name: trimmed,
          color: SUBJECT_COLORS[s.subjects.length % SUBJECT_COLORS.length] ?? "var(--chart-1)",
        },
      ],
    }));
  },
  renameSubject(id: string, name: string) {
    setState((s) => ({ subjects: s.subjects.map((x) => (x.id === id ? { ...x, name } : x)) }));
  },
  removeSubject(id: string) {
    setState((s) => ({
      subjects: s.subjects.filter((x) => x.id !== id),
      study: s.study.subjectId === id ? { ...s.study, subjectId: null } : s.study,
    }));
  },
  deleteSession(id: string) {
    setState((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
  },
  updateAudio(patch: Partial<AudioPrefs>) {
    setState((s) => ({ audio: { ...s.audio, ...patch } }));
  },
  setRuntime(patch: Partial<Runtime>) {
    setState((s) => ({ runtime: { ...s.runtime, ...patch } }));
  },
  pet() {
    setState((s) => ({ runtime: { ...s.runtime, petAt: Date.now(), lastInteraction: Date.now() } }));
  },
  noteInteraction() {
    const now = Date.now();
    if (now - state.runtime.lastInteraction < 15_000) return;
    setState((s) => ({ runtime: { ...s.runtime, lastInteraction: now } }));
  },
  resetAll() {
    for (const key of PERSISTED) persistence.remove(key);
    const fresh = createInitialState();
    setState({ ...fresh, hydrated: true, runtime: { ...fresh.runtime, lastInteraction: Date.now() } });
  },
  exportData() {
    const { settings, sessions, subjects, progress, audio, study } = state;
    return { app: "dozi", version: 1, exportedAt: new Date().toISOString(), settings, sessions, subjects, progress, audio, study };
  },
};

/** Test helper: replace state wholesale. */
export function __setStateForTests(next: AppState) {
  state = next;
}
