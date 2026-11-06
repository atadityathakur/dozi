import { Flame, Hourglass, Lock, Moon, Mountain, Sprout, Sunrise, Target, Trophy } from "lucide-react";

import type { AchievementDef } from "@/lib/achievements";
import { cn } from "@/lib/utils";

const ICONS = { sprout: Sprout, hourglass: Hourglass, sunrise: Sunrise, moon: Moon, flame: Flame, mountain: Mountain, trophy: Trophy, target: Target };

export function AchievementBadge({ def, unlockedAt }: { def: AchievementDef; unlockedAt?: number | undefined }) {
  const Icon = ICONS[def.icon];
  const unlocked = !!unlockedAt;
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-3", unlocked ? "border-border bg-card" : "border-dashed border-border bg-transparent")}>
      <div
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          unlocked ? "bg-highlight text-highlight-foreground shadow-soft" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
        {!unlocked && <Lock className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-card p-0.5" />}
      </div>
      <div className="min-w-0">
        <p className={cn("font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>{def.title}</p>
        <p className="text-xs text-muted-foreground">
          {unlocked ? `Earned ${new Date(unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : def.description}
        </p>
      </div>
    </div>
  );
}
