import { currentStreak, totalMinutes } from "./stats";
import type { Progress, StudySession } from "./types";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: "sprout" | "hourglass" | "sunrise" | "moon" | "flame" | "mountain" | "trophy" | "target";
  test: (ctx: { sessions: StudySession[]; progress: Progress; now: number }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-session",
    title: "First Focus",
    description: "Complete your very first focus session.",
    icon: "sprout",
    test: ({ sessions }) => sessions.length >= 1,
  },
  {
    id: "first-hour",
    title: "First Hour",
    description: "Study for a total of 60 minutes.",
    icon: "hourglass",
    test: ({ sessions }) => totalMinutes(sessions) >= 60,
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Finish a session before 8 AM.",
    icon: "sunrise",
    test: ({ sessions }) => sessions.some((s) => new Date(s.end).getHours() < 8 && new Date(s.end).getHours() >= 4),
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Finish a session after 10 PM.",
    icon: "moon",
    test: ({ sessions }) =>
      sessions.some((s) => {
        const h = new Date(s.end).getHours();
        return h >= 22 || h < 4;
      }),
  },
  {
    id: "goal-getter",
    title: "Goal Getter",
    description: "Hit your daily focus goal.",
    icon: "target",
    test: ({ progress }) => progress.goalBonusDays.length >= 1,
  },
  {
    id: "streak-5",
    title: "5-Day Streak",
    description: "Study five days in a row.",
    icon: "flame",
    test: ({ sessions, now }) => currentStreak(sessions, now) >= 5,
  },
  {
    id: "ten-hours",
    title: "10 Hours of Focus",
    description: "Reach 10 hours of total focus time.",
    icon: "mountain",
    test: ({ sessions }) => totalMinutes(sessions) >= 600,
  },
  {
    id: "hundred-sessions",
    title: "Centurion",
    description: "Complete 100 focus sessions.",
    icon: "trophy",
    test: ({ sessions }) => sessions.length >= 100,
  },
];

/** Returns ids of achievements newly unlocked by the given state. */
export function evaluateAchievements(sessions: StudySession[], progress: Progress, now: number): string[] {
  return ACHIEVEMENTS.filter((a) => !progress.achievements[a.id] && a.test({ sessions, progress, now })).map(
    (a) => a.id,
  );
}

/** Focus points earned for a completed session: one point per focused minute. */
export function pointsForSession(minutes: number): number {
  return Math.max(0, Math.round(minutes));
}
