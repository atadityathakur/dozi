import type { AudioPrefs, ModeId, Progress, Settings, Subject, ThemeId, TimerMode } from "./types";

export const MODES: Record<Exclude<ModeId, "custom">, TimerMode> = {
  pomodoro: { id: "pomodoro", label: "Pomodoro", sessionLabel: "Pomodoro Session", focusMin: 25, breakMin: 5 },
  deep: { id: "deep", label: "Deep Focus", sessionLabel: "Deep Focus Session", focusMin: 50, breakMin: 10 },
  long: { id: "long", label: "Long Study", sessionLabel: "Long Study Session", focusMin: 90, breakMin: 15 },
};

export const MODE_ORDER: ModeId[] = ["pomodoro", "deep", "long", "custom"];

export function getMode(id: ModeId, settings: Pick<Settings, "customFocusMin" | "customBreakMin">): TimerMode {
  if (id === "custom") {
    return {
      id: "custom",
      label: "Custom",
      sessionLabel: "Custom Session",
      focusMin: settings.customFocusMin,
      breakMin: settings.customBreakMin,
    };
  }
  return MODES[id];
}

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: "quant", name: "Quantitative Aptitude", color: "var(--chart-1)" },
  { id: "ga", name: "General Awareness", color: "var(--chart-2)" },
  { id: "english", name: "English", color: "var(--chart-3)" },
  { id: "accounting", name: "Accounting", color: "var(--chart-4)" },
  { id: "finance", name: "Finance", color: "var(--chart-5)" },
  { id: "other", name: "Other", color: "var(--muted-foreground)" },
];

export const SUBJECT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

/** Bump to re-apply the default theme + cat coat once for returning visitors. */
export const PREFS_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  defaultMode: "pomodoro",
  customFocusMin: 40,
  customBreakMin: 8,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundNotifications: true,
  desktopNotifications: false,
  notificationVolume: 0.6,
  reducedMotion: false,
  ambientAnimations: true,
  animations: { rain: true, clouds: true, lamp: true, steam: true, plant: true, dust: true, lights: true },
  clock24h: false,
  theme: "midnight-library",
  dailyGoalMinutes: 180,
  dailyGoalSessions: 6,
  companionName: "Mochi",
  companionCoat: "snow",
  pet: "cat-white",
  sfxEnabled: true,
  sfxVolume: 0.5,
  lamp: "auto",
  weather: "auto",
  prefsVersion: PREFS_VERSION,
};

export const DEFAULT_PROGRESS: Progress = { points: 0, achievements: {}, goalBonusDays: [] };

export const DEFAULT_AUDIO: AudioPrefs = {
  category: "lofi",
  trackId: "cozy-beats",
  musicVolume: 0.55,
  musicMuted: false,
  ambienceVolume: 0.7,
  ambienceMuted: false,
  repeat: true,
  layers: { rain: { on: true, volume: 0.6 } },
};

export const THEMES: { id: ThemeId; name: string; blurb: string; swatch: string[] }[] = [
  { id: "midnight-library", name: "Midnight Library", blurb: "Deep green shelves, night sky and rain on the glass", swatch: ["#13201F", "#1E3B36", "#E6B866", "#8FB3C9"] },
  { id: "cafe", name: "Cozy Café", blurb: "Warm cream, brown and terracotta", swatch: ["#F5F0E8", "#263A32", "#C98267", "#E6C77A"] },
  { id: "library", name: "Rainy Library", blurb: "Deep green, charcoal and muted blue", swatch: ["#DCE3DE", "#1F3A33", "#6E8CA6", "#2B3033"] },
  { id: "midnight", name: "Midnight Study", blurb: "Dark navy, lamp light and gold", swatch: ["#111829", "#1B2440", "#E8B86A", "#D98E5F"] },
];

/** Bonus points for hitting the daily focus goal (once per day). */
export const DAILY_GOAL_BONUS = 50;

/** Themes where it is always raining outside the window. */
export const RAINY_THEMES: ThemeId[] = ["midnight-library", "library"];
/** Dark themes (lamp always on, dark colour scheme). */
export const DARK_THEMES: ThemeId[] = ["midnight-library", "midnight"];
