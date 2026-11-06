import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { audioController } from "@/lib/audio/controller";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatClock, getRemaining } from "@/lib/timer";
import { appActions, getState, hydrate, onAppEvent, timerActions, useApp } from "@/state/app-store";

function notify(title: string, body: string) {
  const { settings } = getState();
  if (!settings.desktopNotifications || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted" || !document.hidden) return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

/**
 * Mounted once in the root layout. Owns the single timer ticker, hydration,
 * theme application, tab-title countdown and completion side effects.
 */
export function AppRuntime() {
  const theme = useApp((s) => s.settings.theme);
  const reduced = useApp((s) => s.settings.reducedMotion);
  const baseTitle = useRef<string | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = theme;
    root.dataset["motion"] = reduced ? "reduced" : "full";
    root.style.colorScheme = theme === "midnight" ? "dark" : "light";
  }, [theme, reduced]);

  // Single ticker — timestamp based, so throttled background tabs stay accurate.
  useEffect(() => {
    const tick = () => {
      timerActions.tick();
      const { timer } = getState();
      if (timer.status === "running") {
        if (baseTitle.current == null) baseTitle.current = document.title;
        const label = timer.phase === "focus" ? "Focus" : "Break";
        document.title = `${formatClock(getRemaining(timer, Date.now()))} · ${label} — Dozi`;
      } else if (baseTitle.current != null) {
        document.title = baseTitle.current;
        baseTitle.current = null;
      }
    };
    const id = window.setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  useEffect(() => {
    const off = onAppEvent((e) => {
        if (e.type === "focus-complete") {
          if (!e.silent) audioController.chime("focus");
          toast("One more session in the books!", {
            description: `+${e.points} focus points${e.bonus ? ` · +${e.bonus} daily goal bonus` : ""}`,
          });
          notify("Focus session complete", "Time for a little break.");
          for (const id of e.achievements) {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            if (a) toast(`Badge unlocked: ${a.title}`, { description: a.description });
          }
        } else {
          if (!e.silent) audioController.chime("break");
          toast("Break's over", { description: "Ready for the next session?" });
          notify("Break finished", "Ready for the next focus session?");
        }
    });
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    const onAct = () => appActions.noteInteraction();
    window.addEventListener("pointerdown", onAct);
    window.addEventListener("keydown", onAct);
    return () => {
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, []);

  return null;
}

/** Runs before paint so returning visitors don't see a theme flash. */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('dozi:v1:settings')||'{}');var d=document.documentElement;d.dataset.theme=s.theme||'cafe';if(s.reducedMotion)d.dataset.motion='reduced';}catch(e){}})();`;
