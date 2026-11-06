import { Link } from "@tanstack/react-router";
import { Pause, Play, Repeat, Repeat1, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { audioController } from "@/lib/audio/controller";
import { LAYERS, MUSIC_CATEGORIES, TRACKS, getTrack } from "@/lib/audio/catalog";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-store";

import { LAYER_ICONS } from "./layer-icon";
import { Visualizer } from "./visualizer";

export function TrackControls({ size = "md" }: { size?: "md" | "lg" }) {
  const playing = useApp((s) => s.runtime.musicPlaying);
  const repeat = useApp((s) => s.audio.repeat);
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => audioController.prev()} aria-label="Previous track">
        <SkipBack />
      </Button>
      <Button
        variant="hero"
        size={size === "lg" ? "icon-lg" : "icon"}
        className={size === "lg" ? "h-14 w-14" : "h-11 w-11"}
        onClick={() => audioController.toggle()}
        aria-label={playing ? "Pause music" : "Play music"}
      >
        {playing ? <Pause /> : <Play className="translate-x-[1px]" />}
      </Button>
      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => audioController.next()} aria-label="Next track">
        <SkipForward />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("rounded-full", repeat ? "text-accent" : "text-muted-foreground")}
        onClick={() => audioController.setRepeat(!repeat)}
        aria-label={repeat ? "Repeat this track: on" : "Repeat this track: off"}
        aria-pressed={repeat}
        title={repeat ? "Repeating this track" : "Moving to next track when done"}
      >
        {repeat ? <Repeat1 /> : <Repeat />}
      </Button>
    </div>
  );
}

export function VolumeRow({
  label,
  value,
  muted,
  onChange,
  onMute,
}: {
  label: string;
  value: number;
  muted: boolean;
  onChange: (v: number) => void;
  onMute: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onMute}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
      <Slider
        value={[muted ? 0 : Math.round(value * 100)]}
        max={100}
        step={1}
        onValueChange={([v]) => onChange(v / 100)}
        aria-label={`${label} volume`}
      />
    </div>
  );
}

/** Compact player for the study room: now playing, controls, volumes and quick ambience chips. */
export function MusicPlayer() {
  const audio = useApp((s) => s.audio);
  const playing = useApp((s) => s.runtime.musicPlaying);
  const ambiencePlaying = useApp((s) => s.runtime.ambiencePlaying);
  const track = getTrack(audio.trackId);
  const categoryTracks = TRACKS.filter((t) => t.category === audio.category);

  return (
    <section className="surface flex flex-col gap-4 p-5" aria-label="Music player">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {playing ? "Now playing" : "Paused"}
          </p>
          <h3 className="truncate font-display text-xl text-foreground">{track.title}</h3>
          <p className="truncate text-xs text-muted-foreground">{track.mood}</p>
        </div>
        <Visualizer active={playing || ambiencePlaying} bars={14} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {MUSIC_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => audioController.setCategory(c.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                audio.category === c.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <TrackControls />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categoryTracks.map((t) => (
          <button
            key={t.id}
            onClick={() => audioController.select(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              t.id === track.id && playing
                ? "border-accent bg-accent text-accent-foreground"
                : t.id === track.id
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {t.title}
          </button>
        ))}
      </div>

      <VolumeRow
        label="Music"
        value={audio.musicVolume}
        muted={audio.musicMuted}
        onChange={(v) => audioController.setMusicVolume(v)}
        onMute={() => audioController.toggleMusicMute()}
      />

      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Ambience</p>
          <Link to="/sounds" className="text-xs font-semibold text-accent hover:underline">
            Full mixer
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {LAYERS.slice(0, 8).map((l) => {
            const Icon = LAYER_ICONS[l.id];
            const on = !!audio.layers[l.id]?.on;
            const live = on && ambiencePlaying;
            return (
              <button
                key={l.id}
                onClick={() => audioController.setLayer(l.id, { on: !on })}
                aria-pressed={on}
                title={l.name}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition-all",
                  live
                    ? "border-primary bg-primary text-primary-foreground"
                    : on
                      ? "border-primary/50 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{l.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <VolumeRow
              label="Ambience"
              value={audio.ambienceVolume}
              muted={audio.ambienceMuted}
              onChange={(v) => audioController.setAmbienceVolume(v)}
              onMute={() => audioController.toggleAmbienceMute()}
            />
          </div>
          {Object.values(audio.layers).some((l) => l.on) && (
            <Button variant="soft" size="sm" className="rounded-full" onClick={() => audioController.toggleAmbience()}>
              {ambiencePlaying ? <Pause /> : <Play />}
              {ambiencePlaying ? "Pause" : "Resume mix"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
