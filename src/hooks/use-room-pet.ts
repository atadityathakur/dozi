import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SfxKind } from "@/lib/audio/engine";
import { playSfx, primeSfx, startPurr, stopPurr } from "@/lib/audio/sfx";
import { ACTION_LINES, MOOD_LINES, PET_LINES, canSpeak, pickLine, type MoodId, type MESSAGE_GAP } from "@/lib/companion-lines";
import { getPet, type PetKind } from "@/lib/pets";
import { ClickBurst, SPOT_X, pickIdleBehaviour, walkDuration, type PetAction, type PetZone, type Spot } from "@/lib/room";
import { minutesOnDay, sessionsOnDay } from "@/lib/stats";
import { appActions, useApp } from "@/state/app-store";

const SLEEP_AFTER_MS = 3 * 60_000;

/** Each pet's little voice. */
export const PET_VOICE: Record<PetKind, SfxKind> = { cat: "mew", puppy: "boof", bunny: "squeak", shiba: "awoo" };

type SpeakKind = keyof typeof MESSAGE_GAP;

export interface Bubble {
  id: number;
  text: string;
}

export function useReducedMotion() {
  const setting = useApp((s) => s.settings.reducedMotion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setSystem(mq.matches);
    const on = () => setSystem(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return setting || system;
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Brain of the room pet: mood from the timer, walking between spots,
 * reactions to clicks, random idle behaviours and throttled speech bubbles.
 */
export function useRoomPet(now: number) {
  const petId = useApp((s) => s.settings.pet);
  const name = useApp((s) => s.settings.companionName);
  const status = useApp((s) => s.timer.status);
  const phase = useApp((s) => s.timer.phase);
  const celebrateAt = useApp((s) => s.runtime.celebrateAt);
  const petAt = useApp((s) => s.runtime.petAt);
  const lastInteraction = useApp((s) => s.runtime.lastInteraction);
  const sessions = useApp((s) => s.sessions);
  const reduced = useReducedMotion();
  const kind = getPet(petId).kind;

  const todayCount = useMemo(() => (now ? sessionsOnDay(sessions, now).length : 0), [sessions, now]);
  const todayMinutes = useMemo(() => (now ? minutesOnDay(sessions, now) : 0), [sessions, now]);

  let mood: MoodId = "idle";
  if (celebrateAt && now - celebrateAt < 4500) mood = "celebrate";
  else if (status === "running") mood = phase === "break" ? "break" : todayCount >= 2 ? "focused" : "studying";
  else if (status === "paused") mood = "paused";
  else if (now && lastInteraction && now - lastInteraction > SLEEP_AFTER_MS) mood = "sleeping";
  else if (phase === "break" && status === "idle") mood = "break";

  const petting = !!petAt && now - petAt < 2600;

  const [spot, setSpot] = useState<Spot>("home");
  const [walkMs, setWalkMs] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facingRight, setFacingRight] = useState(false);
  const [action, setAction] = useState<PetAction>("none");
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const spotRef = useRef<Spot>("home");
  const gen = useRef(0);
  const busy = useRef(false);
  const holding = useRef(false);
  const lastSaid = useRef(0);
  const lastLine = useRef("");
  const lastDone = useRef(0);
  const nextIdleAt = useRef(0);
  const burst = useRef(new ClickBurst(2500));
  const rollNext = useRef(false);
  const lastPetTick = useRef(0);
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const actionRef = useRef(action);
  actionRef.current = action;

  /* ---------------- speech ---------------- */

  const say = useCallback((lines: string[] | string, kindOf: SpeakKind = "interaction") => {
    const t = Date.now();
    if (!canSpeak(lastSaid.current, t, kindOf)) return false;
    const text = Array.isArray(lines) ? pickLine(lines, lastLine.current) : lines;
    if (!text) return false;
    lastSaid.current = t;
    lastLine.current = text;
    setBubble({ id: t, text });
    return true;
  }, []);

  useEffect(() => {
    if (!bubble) return;
    const id = window.setTimeout(() => setBubble(null), Math.min(7000, 2800 + bubble.text.length * 55));
    return () => window.clearTimeout(id);
  }, [bubble]);

  // A line whenever the mood changes (celebrations always get through).
  useEffect(() => {
    if (!now) return;
    let lines = MOOD_LINES[mood];
    if ((mood === "studying" || mood === "focused") && todayMinutes >= 50 && Math.random() < 0.4) {
      lines = [`We've studied ${Math.round(todayMinutes)} minutes today. Proud of us!`];
    }
    if (mood === "celebrate") lastSaid.current = 0;
    say(lines, mood === "celebrate" ? "object" : "interaction");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, !!now]);

  /* ---------------- movement & actions ---------------- */

  const walkTo = useCallback(
    async (target: Spot, g: number) => {
      const from = spotRef.current;
      if (from === target) return true;
      const ms = reduced ? 0 : walkDuration(from, target);
      setFacingRight(SPOT_X[target] > SPOT_X[from]);
      setAction("none");
      setWalkMs(ms);
      setWalking(ms > 0);
      setSpot(target);
      spotRef.current = target;
      if (ms) await sleep(ms);
      if (g !== gen.current) return false;
      setWalking(false);
      return true;
    },
    [reduced],
  );

  /** Walk somewhere (if needed), do something for a while, then head back to the desk. */
  const perform = useCallback(
    async (
      target: Spot,
      act: PetAction,
      ms: number,
      opts: { sfx?: SfxKind | undefined; lines?: string[] | undefined; speak?: SpeakKind; stay?: boolean; passive?: boolean | undefined } = {},
    ) => {
      const g = ++gen.current;
      busy.current = true;
      if (!(await walkTo(target, g))) return;
      setAction(act);
      playSfx(opts.sfx, { passive: opts.passive });
      if (opts.lines) say(opts.lines, opts.speak ?? "interaction");
      await sleep(ms);
      if (g !== gen.current) return;
      setAction("none");
      if (!opts.stay && target !== "home") {
        await sleep(350);
        if (g !== gen.current) return;
        if (!(await walkTo("home", g))) return;
      }
      busy.current = false;
      lastDone.current = Date.now();
    },
    [say, walkTo],
  );

  /** React on the spot, wherever the pet currently is. */
  const react = useCallback(
    (act: PetAction, ms: number, opts: { sfx?: SfxKind | undefined; lines?: string[] | undefined; speak?: SpeakKind } = {}) => {
      void perform(spotRef.current, act, ms, { ...opts, stay: true });
    },
    [perform],
  );

  const goTo = useCallback(
    (target: Spot) => {
      appActions.wake();
      primeSfx();
      if (target === "bed" && spotRef.current === "bed" && actionRef.current === "sleep") {
        say(ACTION_LINES.wake, "object");
        void perform("home", "none", 0);
        return;
      }
      if (target === "food") void perform("food", "eat", 3400, { sfx: "munch", lines: ACTION_LINES.eat, speak: "object" });
      else if (target === "water") void perform("water", "drink", 3000, { sfx: "lap", lines: ACTION_LINES.drink, speak: "object" });
      else if (target === "toy") void perform("toy", "play", 3400, { sfx: "squeak", lines: ACTION_LINES.play, speak: "object" });
      else if (target === "bed") void perform("bed", "sleep", 14000, { sfx: "thump", lines: ACTION_LINES.sleep, speak: "object" });
      else void perform("home", "none", 0);
    },
    [perform, say],
  );

  const typeOnLaptop = useCallback(() => {
    appActions.wake();
    primeSfx();
    void perform("home", "type", 3400, { sfx: "type", lines: ACTION_LINES.type, speak: "object" });
  }, [perform]);

  /* ---------------- touching the pet ---------------- */

  const poke = useCallback(
    (zone: PetZone) => {
      appActions.wake();
      const wasAsleep = moodRef.current === "sleeping" || actionRef.current === "sleep";
      const n = burst.current.hit(Date.now());
      if (n >= 6 && !reduced) {
        burst.current.reset();
        react("zoomies", 2300, { sfx: "whoosh", lines: ACTION_LINES.zoomies, speak: "object" });
        return;
      }
      if (n === 4) {
        react("excited", 1300, { sfx: PET_VOICE[kind], lines: ACTION_LINES.tooMuch, speak: "object" });
        return;
      }
      if (wasAsleep) {
        say(ACTION_LINES.wake, "object");
        void perform("home", "stretch", 1400, { sfx: PET_VOICE[kind] });
        return;
      }
      if (zone === "head") return; // handled by hold-to-pet
      if (zone === "paws") {
        react("wave", 1500, { sfx: PET_VOICE[kind], lines: ACTION_LINES.wave });
      } else {
        const roll = rollNext.current;
        rollNext.current = !roll;
        react(roll ? "roll" : "stretch", roll ? 1000 : 1500, { sfx: roll ? "boing" : undefined });
      }
    },
    [kind, perform, react, reduced, say],
  );

  const petStart = useCallback(() => {
    holding.current = true;
    if (actionRef.current === "sleep") {
      gen.current++;
      setAction("none");
    }
    if (kind === "cat") startPurr();
    else playSfx(PET_VOICE[kind]);
    appActions.pet();
    lastPetTick.current = Date.now();
    say(PET_LINES[kind]);
  }, [kind, say]);

  const petTick = useCallback(() => {
    const t = Date.now();
    if (t - lastPetTick.current < 900) return;
    lastPetTick.current = t;
    appActions.pet();
    say(PET_LINES[kind]);
  }, [kind, say]);

  const petEnd = useCallback(() => {
    holding.current = false;
    stopPurr();
  }, []);

  useEffect(() => () => stopPurr(), []);
  useEffect(() => () => void gen.current++, []);

  /* ---------------- life of its own ---------------- */

  useEffect(() => {
    nextIdleAt.current = Date.now() + 20_000;
    const id = window.setInterval(() => {
      if (busy.current || holding.current || document.hidden) return;
      const t = Date.now();
      const m = moodRef.current;
      if (m === "sleeping" || m === "celebrate") return;
      // Wandered off after a poke? Head back to the desk.
      if (spotRef.current !== "home" && t - lastDone.current > 4000) {
        void perform("home", "none", 0);
        return;
      }
      if (t < nextIdleAt.current) return;
      const focusing = m === "studying" || m === "focused";
      nextIdleAt.current = t + (focusing ? 45_000 : 22_000) + Math.random() * 30_000;
      const b = pickIdleBehaviour(m, Math.random());
      const chatty = Math.random() < (focusing ? 0.35 : 0.5);
      if (b) {
        const lines =
          b.action === "eat"
            ? ACTION_LINES.eat
            : b.action === "drink"
              ? ACTION_LINES.drink
              : b.action === "play"
                ? ACTION_LINES.play
                : b.action === "sleep"
                  ? ACTION_LINES.sleep
                  : undefined;
        const sfx: SfxKind | undefined =
          b.action === "eat" ? "munch" : b.action === "drink" ? "lap" : b.action === "play" ? "squeak" : b.action === "type" ? "type" : undefined;
        void perform(b.spot, b.action, b.ms, {
          sfx: focusing ? undefined : sfx,
          lines: chatty ? (lines ?? MOOD_LINES[m]) : undefined,
          speak: "auto",
          passive: true,
        });
      } else if (chatty) {
        say(MOOD_LINES[m], "auto");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [perform, say]);

  // Falling asleep from inactivity: go back to the desk first.
  useEffect(() => {
    if (mood === "sleeping" && spotRef.current !== "home" && actionRef.current !== "sleep") void perform("home", "none", 0);
  }, [mood, perform]);

  return {
    petId,
    kind,
    name,
    mood,
    petting,
    spot,
    walkMs,
    walking,
    facingRight,
    action,
    bubble,
    reduced,
    say,
    react,
    goTo,
    typeOnLaptop,
    poke,
    petStart,
    petTick,
    petEnd,
  };
}

export type RoomPet = ReturnType<typeof useRoomPet>;
