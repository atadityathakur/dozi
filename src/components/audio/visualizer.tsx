import { useEffect, useRef } from "react";

import { audioController } from "@/lib/audio/controller";
import { cn } from "@/lib/utils";

/** Live frequency bars driven by the audio engine's analyser. Flat when silent. */
export function Visualizer({ active, bars = 18, className }: { active: boolean; bars?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    if (!active) {
      nodes.forEach((n) => (n.style.transform = "scaleY(0.12)"));
      return;
    }
    let raf = 0;
    const data = new Uint8Array(64);
    const loop = () => {
      const analyser = audioController.analyser();
      if (analyser) {
        analyser.getByteFrequencyData(data);
        nodes.forEach((n, i) => {
          const idx = Math.min(data.length - 1, Math.floor(1 + (i / nodes.length) ** 1.4 * 40));
          const v = data[idx] / 255;
          n.style.transform = `scaleY(${Math.max(0.12, v * 1.15)})`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div ref={ref} className={cn("flex h-8 items-end gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="h-full w-[4px] origin-bottom rounded-full bg-accent transition-transform duration-75"
          style={{ transform: "scaleY(0.12)", opacity: 0.55 + (i % 3) * 0.15 }}
        />
      ))}
    </div>
  );
}
