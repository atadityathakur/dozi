import { Link, useRouterState } from "@tanstack/react-router";
import { Pause, Play, Square } from "lucide-react";

import { audioController } from "@/lib/audio/controller";
import { getTrack } from "@/lib/audio/catalog";
import { useApp } from "@/state/app-store";

import { Visualizer } from "./visualizer";

/** Floating pill shown on other pages while music or ambience plays. */
export function MiniPlayer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const playing = useApp((s) => s.runtime.musicPlaying);
  const ambience = useApp((s) => s.runtime.ambiencePlaying);
  const trackId = useApp((s) => s.audio.trackId);
  if (!(playing || ambience) || pathname === "/" || pathname === "/sounds") return null;
  const track = getTrack(trackId);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-full border border-border bg-card py-2 pl-2 pr-4 shadow-card">
      <button
        onClick={() => audioController.toggle()}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label={playing ? "Pause music" : "Play music"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <Link to="/sounds" className="min-w-0">
        <p className="max-w-36 truncate text-sm font-semibold text-foreground">{playing ? track.title : "Ambience"}</p>
        <p className="text-[11px] text-muted-foreground">Open sounds</p>
      </Link>
      <Visualizer active bars={6} className="h-5" />
      <button
        onClick={() => audioController.stopEverything()}
        className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Stop all sound"
      >
        <Square className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
