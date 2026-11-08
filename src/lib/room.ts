/**
 * Pure helpers for the interactive study room: where the pet can walk,
 * how weather and the lamp are resolved, and click-burst detection.
 */
import { DARK_THEMES, RAINY_THEMES } from "./defaults";
import type { LampSetting, ThemeId, Weather, WeatherSetting } from "./types";

export type Spot = "home" | "bed" | "food" | "water" | "toy";

/** X position (scene units) of each place the pet can go. All sit on the desk line. */
export const SPOT_X: Record<Spot, number> = { home: 400, bed: 751, food: 580, water: 618, toy: 172 };
export const PET_Y = 400;
export const PET_SCALE = 0.72;

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
