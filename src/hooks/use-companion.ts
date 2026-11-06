import { useEffect, useMemo, useRef, useState } from "react";

import type { CatState } from "@/components/study/cat-companion";
import { minutesOnDay, sessionsOnDay } from "@/lib/stats";
import { useApp } from "@/state/app-store";

const SLEEP_AFTER_MS = 3 * 60_000;

const LINES: Record<CatState | "pet", string[]> = {
  idle: [
    "Ready when you are.",
    "Pick a timer and let's begin.",
    "Tea's warm. Shall we start?",
    "Small steps still count.",
  ],
  studying: [
    "Let's get this done!",
    "One page at a time.",
    "You're doing better than you think.",
    "Deep breath. Next line.",
    "I'm taking notes too.",
  ],
  focused: [
    "We're on a roll today!",
    "Look at us go.",
    "Focus mode: activated.",
    "This is our groove.",
  ],
  break: [
    "Break time! Even I need a nap.",
    "Stretch those paws.",
    "Sip some water, okay?",
    "Rest is part of the plan.",
  ],
  celebrate: ["One more session in the books!", "We did it! Proud of us.", "Another one done. Purrfect."],
  paused: ["Taking a breather?", "I'll wait right here.", "Whenever you're ready."],
  sleeping: ["zzz… wake me when we study…", "*soft snoring*", "Five more minutes…"],
  pet: ["Purrrr…", "Hehe, that tickles!", "More head scratches, please.", "You're my favourite study buddy."],
};

function pick(list: string[], avoid?: string): string {
  const options = list.length > 1 ? list.filter((l) => l !== avoid) : list;
  return options[Math.floor(Math.random() * options.length)] ?? "";
}

export function useCompanion(now: number) {
  const status = useApp((s) => s.timer.status);
  const phase = useApp((s) => s.timer.phase);
  const celebrateAt = useApp((s) => s.runtime.celebrateAt);
  const petAt = useApp((s) => s.runtime.petAt);
  const lastInteraction = useApp((s) => s.runtime.lastInteraction);
  const sessions = useApp((s) => s.sessions);
  const name = useApp((s) => s.settings.companionName);

  const todayCount = useMemo(() => (now ? sessionsOnDay(sessions, now).length : 0), [sessions, now]);
  const todayMinutes = useMemo(() => (now ? minutesOnDay(sessions, now) : 0), [sessions, now]);

  let state: CatState = "idle";
  if (celebrateAt && now - celebrateAt < 4500) state = "celebrate";
  else if (status === "running") state = phase === "break" ? "break" : todayCount >= 2 ? "focused" : "studying";
  else if (status === "paused") state = "paused";
  else if (now && lastInteraction && now - lastInteraction > SLEEP_AFTER_MS) state = "sleeping";
  else if (phase === "break" && status === "idle") state = "break";

  const petting = !!petAt && now - petAt < 2600;

  const [message, setMessage] = useState("");
  const last = useRef("");

  useEffect(() => {
    let line = pick(LINES[state], last.current);
    if (state === "studying" || state === "focused") {
      if (todayMinutes >= 50 && Math.random() < 0.5) {
        line = `We've studied ${Math.round(todayMinutes)} minutes today. Proud of us!`;
      }
    }
    last.current = line;
    setMessage(line);
    if (state === "celebrate" || state === "sleeping") return;
    const id = window.setInterval(() => {
      const next = pick(LINES[state], last.current);
      last.current = next;
      setMessage(next);
    }, 45_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!petAt) return;
    const line = pick(LINES.pet, last.current);
    last.current = line;
    setMessage(line);
  }, [petAt]);

  return { state, petting, message, name };
}
