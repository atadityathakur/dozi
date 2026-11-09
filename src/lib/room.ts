/**
 * Pure helpers for the interactive study room: where the pet can walk,
 * how weather and the lamp are resolved, idle behaviours and click bursts.
 */
import type { MoodId } from "./companion-lines";
import { DARK_THEMES, RAINY_THEMES } from "./defaults";
import type { LampSetting, ThemeId, Weather, WeatherSetting } from "./types";

export type Spot = "home" | "bed" | "food" | "water" | "toy";
export type PetAction =
  | "none"
  | "stretch"
  | "roll"
  | "wave"
  | "excited"
  | "zoomies"
  | "eat"
  | "drink"
  | "sleep"
  | "play"
  | "type";
export type PetZone = "head" | "body" | "paws";

/** X position (scene units) of each place the pet can go. All sit on the desk line. */
export const SPOT_X: Record<Spot, number> = { home: 410, toy: 300, food: 650, water: 692, bed: 752 };
export const PET_Y = 400;
export const PET_SCALE = 0.75;

/** Walking time between two spots, proportional to distance. */
export function walkDuration(from: Spot, to: Spot): number {
  const d = Math.abs(SPOT_X[from] - SPOT_X[to]);
  if (d === 0) return 0;
  return Math.round(Math.min(2400, Math.max(700, d * 5.5)));
}

export function resolveWeather(setting: WeatherSetting, auto: { theme: ThemeId; rainSound: boolean }): Weather {
  if (setting !== "auto") return setting;
  return auto.rainSound || RAINY_THEMES.includes(auto.theme) ? "rain" : "clear";
}

export function resolveLamp(
  setting: LampSetting,
  auto: { evening: boolean; theme: ThemeId; raining: boolean; focusing: boolean },
): boolean {
  if (setting === "on") return true;
  if (setting === "off") return false;
  return auto.evening || DARK_THEMES.includes(auto.theme) || (auto.raining && auto.focusing);
}

export const NEXT_WEATHER: Record<Weather, Weather> = { clear: "cloudy", cloudy: "rain", rain: "clear" };

export interface Behaviour {
  spot: Spot;
  action: PetAction;
  ms: number;
}

/**
 * Something small the pet does on its own. While you focus it stays at the
 * desk so it never pulls your attention across the room.
 */
export function pickIdleBehaviour(mood: MoodId, r: number): Behaviour | null {
  switch (mood) {
    case "studying":
    case "focused":
      if (r < 0.45) return { spot: "home", action: "type", ms: 3200 };
      if (r < 0.75) return { spot: "home", action: "stretch", ms: 1500 };
      return null;
    case "break":
      if (r < 0.25) return { spot: "food", action: "eat", ms: 3600 };
      if (r < 0.5) return { spot: "water", action: "drink", ms: 3000 };
      if (r < 0.75) return { spot: "toy", action: "play", ms: 3600 };
      return { spot: "home", action: "stretch", ms: 1500 };
    case "idle":
      if (r < 0.2) return { spot: "toy", action: "play", ms: 3400 };
      if (r < 0.4) return { spot: "water", action: "drink", ms: 2800 };
      if (r < 0.55) return { spot: "home", action: "wave", ms: 1600 };
      if (r < 0.75) return { spot: "home", action: "stretch", ms: 1500 };
      if (r < 0.85) return { spot: "bed", action: "sleep", ms: 14000 };
      return null;
    default:
      return null;
  }
}

/** Counts clicks that land within a rolling time window. */
export class ClickBurst {
  private times: number[] = [];
  constructor(private windowMs: number) {}
  hit(now: number): number {
    this.times = this.times.filter((t) => now - t < this.windowMs);
    this.times.push(now);
    return this.times.length;
  }
  reset() {
    this.times = [];
  }
}
