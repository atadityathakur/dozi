/**
 * Bridges persisted audio preferences (store) and the Web Audio engine.
 * UI components call these actions; they never talk to the engine directly.
 */
import { appActions, getState } from "@/state/app-store";

import { LAYERS, MIXES, TRACKS, getTrack } from "./catalog";
import { engine } from "./engine";

let endTimer: number | null = null;

function scheduleEnd() {
  if (endTimer) window.clearTimeout(endTimer);
  endTimer = null;
  const { audio } = getState();
  if (audio.repeat) return;
  const def = getTrack(audio.trackId);
  endTimer = window.setTimeout(() => audioController.next(), def.lengthSec * 1000);
}

function applyVolumes() {
  const { audio } = getState();
  engine.setMusicVolume(audio.musicMuted ? 0 : audio.musicVolume);
  engine.setAmbienceVolume(audio.ambienceMuted ? 0 : audio.ambienceVolume);
}

function categoryTracks(category: string) {
  return TRACKS.filter((t) => t.category === category);
}

export const audioController = {
  supported() {
    return engine.supported;
  },

  /** Create/resume the audio context from a user gesture. */
  unlock() {
    engine.ensure();
  },

  play() {
    const { audio } = getState();
    if (!engine.ensure()) return;
    applyVolumes();
    engine.playTrack(getTrack(audio.trackId));
    appActions.setRuntime({ musicPlaying: true });
    scheduleEnd();
  },

  pause() {
    engine.stopTrack();
    if (endTimer) window.clearTimeout(endTimer);
    appActions.setRuntime({ musicPlaying: false });
  },

  toggle() {
    if (getState().runtime.musicPlaying) audioController.pause();
    else audioController.play();
  },

  select(trackId: string) {
    const def = getTrack(trackId);
    appActions.updateAudio({ trackId: def.id, category: def.category });
    audioController.play();
  },

  setCategory(category: string) {
    appActions.updateAudio({ category });
  },

  step(dir: 1 | -1) {
    const { audio, runtime } = getState();
    const current = getTrack(audio.trackId);
    const list = categoryTracks(current.category);
    const idx = list.findIndex((t) => t.id === current.id);
    const next = list[(idx + dir + list.length) % list.length];
    if (!next) return;
    appActions.updateAudio({ trackId: next.id });
    if (runtime.musicPlaying) audioController.play();
  },
  next() {
    audioController.step(1);
  },
  prev() {
    audioController.step(-1);
  },

  setRepeat(repeat: boolean) {
    appActions.updateAudio({ repeat });
    if (getState().runtime.musicPlaying) scheduleEnd();
  },

  setMusicVolume(v: number) {
    appActions.updateAudio({ musicVolume: v, musicMuted: v === 0 ? true : false });
    applyVolumes();
  },
  toggleMusicMute() {
    appActions.updateAudio({ musicMuted: !getState().audio.musicMuted });
    applyVolumes();
  },
  setAmbienceVolume(v: number) {
    appActions.updateAudio({ ambienceVolume: v, ambienceMuted: v === 0 ? true : false });
    applyVolumes();
  },
  toggleAmbienceMute() {
    appActions.updateAudio({ ambienceMuted: !getState().audio.ambienceMuted });
    applyVolumes();
  },

  /** Toggle or re-level one ambience layer. Starting a layer resumes the mix. */
  setLayer(id: string, patch: { on?: boolean; volume?: number }) {
    const def = LAYERS.find((l) => l.id === id);
    if (!def) return;
    const { audio, runtime } = getState();
    const prev = audio.layers[id] ?? { on: false, volume: 0.6 };
    const next = { ...prev, ...patch };
    appActions.updateAudio({ layers: { ...audio.layers, [id]: next } });
    if (patch.on === true && !runtime.ambiencePlaying) {
      audioController.playAmbience();
      return;
    }
    if (runtime.ambiencePlaying || patch.on === false) {
      if (!engine.ensure()) return;
      applyVolumes();
      engine.setLayer(def, next.on, next.volume);
    }
  },

  playAmbience() {
    if (!engine.ensure()) return;
    applyVolumes();
    const { audio } = getState();
    for (const def of LAYERS) {
      const pref = audio.layers[def.id];
      engine.setLayer(def, !!pref?.on, pref?.volume ?? 0.6);
    }
    appActions.setRuntime({ ambiencePlaying: true });
  },

  pauseAmbience() {
    engine.stopAllLayers();
    appActions.setRuntime({ ambiencePlaying: false });
  },

  toggleAmbience() {
    if (getState().runtime.ambiencePlaying) audioController.pauseAmbience();
    else audioController.playAmbience();
  },

  hasSelectedLayers() {
    return Object.values(getState().audio.layers).some((l) => l.on);
  },

  applyMix(mixId: string) {
    const mix = MIXES.find((m) => m.id === mixId);
    if (!mix) return;
    const layers: Record<string, { on: boolean; volume: number }> = {};
    for (const def of LAYERS) {
      const prev = getState().audio.layers[def.id];
      layers[def.id] = { on: def.id in mix.layers, volume: mix.layers[def.id] ?? prev?.volume ?? 0.6 };
    }
    appActions.updateAudio({ layers });
    audioController.playAmbience();
    if (mix.trackId) audioController.select(mix.trackId);
    else audioController.pause();
  },

  stopEverything() {
    audioController.pause();
    audioController.pauseAmbience();
  },

  chime(kind: "focus" | "break") {
    const { settings } = getState();
    if (!settings.soundNotifications) return;
    engine.chime(settings.notificationVolume, kind);
  },

  analyser() {
    return engine.analyser;
  },
};
