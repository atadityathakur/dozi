import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` with the current timestamp (0 during SSR). */
export function useNow(intervalMs = 1000, active = true) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

export type Daypart = "morning" | "day" | "evening" | "night";

export function getDaypart(ts: number): Daypart {
  if (!ts) return "day";
  const d = new Date(ts);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 9) return "morning";
  if (h >= 9 && h < 16.5) return "day";
  if (h >= 16.5 && h < 19.5) return "evening";
  return "night";
}
