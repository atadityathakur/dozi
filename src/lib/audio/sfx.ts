/**
 * Room sound effects (petting, lamp click, munching…). Always respects the
 * "Room sounds" setting and its own volume, separate from music & ambience.
 */
import { getState } from "@/state/app-store";

import { engine, type SfxKind } from "./engine";

/**
 * Play a room sound. `passive` sounds (not triggered by a click) only play
 * once audio has already been unlocked by the user.
 */
export function playSfx(kind: SfxKind | null | undefined, opts: { passive?: boolean | undefined } = {}): boolean {
  if (!kind) return false;
  const { sfxEnabled, sfxVolume } = getState().settings;
  if (!sfxEnabled || sfxVolume <= 0) return false;
  if (opts.passive && !engine.ctx) return false;
  engine.sfx(kind, sfxVolume);
  return true;
}

/**
 * Call inside a click handler when a sound will play a moment later (after
 * the pet walks somewhere) so the browser lets it through.
 */
export function primeSfx() {
  const { sfxEnabled, sfxVolume } = getState().settings;
  if (sfxEnabled && sfxVolume > 0) engine.ensure();
}

export function startPurr(): boolean {
  const { sfxEnabled, sfxVolume } = getState().settings;
  if (!sfxEnabled || sfxVolume <= 0) return false;
  engine.startPurr(sfxVolume * 0.8);
  return true;
}

export function stopPurr() {
  engine.stopPurr();
}
