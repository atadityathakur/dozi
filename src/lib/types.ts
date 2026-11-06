export type ModeId = "pomodoro" | "deep" | "long" | "custom";
export type Phase = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";
export type ThemeId = "midnight-library" | "cafe" | "library" | "midnight";
export type CoatId = "snow" | "ginger" | "grey" | "midnight" | "cream";

export interface TimerMode {
  id: ModeId;
  label: string;
  sessionLabel: string;
  focusMin: number;
  breakMin: number;
}

export interface TimerState {
  modeId: ModeId;
  phase: Phase;
  status: TimerStatus;
  /** Planned length of the current phase in ms. */
  durationMs: number;
  /** Epoch ms when the running phase ends. Only set while running. */
  endsAt: number | null;
  /** Remaining ms while paused/idle. */
  remainingMs: number;
  /** Epoch ms when the current focus phase was first started. */
  startedAt: number | null;
}

export interface Subject {
  id: string;
  name: string;
  color: string; // css color token reference, e.g. "var(--chart-1)"
}

export interface StudySession {
  id: string;
  start: number;
  end: number;
  minutes: number;
  modeId: ModeId;
  subjectId: string | null;
  task?: string;
}

export interface AnimationToggles {
  rain: boolean;
  clouds: boolean;
  lamp: boolean;
  steam: boolean;
  plant: boolean;
  dust: boolean;
  lights: boolean;
}

export interface Settings {
  defaultMode: ModeId;
  customFocusMin: number;
  customBreakMin: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundNotifications: boolean;
  desktopNotifications: boolean;
  notificationVolume: number; // 0..1
  reducedMotion: boolean;
  ambientAnimations: boolean;
  animations: AnimationToggles;
  clock24h: boolean;
  theme: ThemeId;
  dailyGoalMinutes: number;
  dailyGoalSessions: number;
  companionName: string;
  companionCoat: CoatId;
  /** Bumped when new defaults should be applied once to returning visitors. */
  prefsVersion?: number;
}

export interface AmbienceLayerPref {
  on: boolean;
  volume: number; // 0..1
}

export interface AudioPrefs {
  category: string;
  trackId: string;
  musicVolume: number;
  musicMuted: boolean;
  ambienceVolume: number;
  ambienceMuted: boolean;
  repeat: boolean;
  layers: Record<string, AmbienceLayerPref>;
}

export interface Progress {
  points: number;
  achievements: Record<string, number>; // id -> unlocked at
  goalBonusDays: string[]; // day keys where the daily goal bonus was awarded
}

export interface StudyContext {
  subjectId: string | null;
  task: string;
}
