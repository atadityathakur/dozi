import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Sparkles } from "lucide-react";

import { LAYER_ICONS } from "@/components/audio/layer-icon";
import { TrackControls, VolumeRow } from "@/components/audio/music-player";
import { Visualizer } from "@/components/audio/visualizer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { audioController } from "@/lib/audio/controller";
import { LAYERS, MIXES, MUSIC_CATEGORIES, TRACKS, getTrack } from "@/lib/audio/catalog";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-store";

export const Route = createFileRoute("/sounds")({
  head: () => ({
    meta: [
      { title: "Ambient Sounds — Dozi" },
      { name: "description", content: "Lo-fi beats, gentle piano, rain, fireplace and café sounds. Layer them into your perfect study mix." },
      { property: "og:title", content: "Ambient Sounds — Dozi" },
      { property: "og:description", content: "Lo-fi, piano, rain, fireplace and café sounds — layer your perfect study mix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SoundsPage,
});

function SoundsPage() {
  const audio = useApp((s) => s.audio);
  const playing = useApp((s) => s.runtime.musicPlaying);
  const ambiencePlaying = useApp((s) => s.runtime.ambiencePlaying);
  const track = getTrack(audio.trackId);
  const anySelected = Object.values(audio.layers).some((l) => l.on);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6">
      <PageHeader eyebrow="Music & ambience" title="Sounds">
        <p className="max-w-sm text-sm text-muted-foreground">
          Every sound here is composed live in your browser — original, royalty-free and endlessly varied.
        </p>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* player */}
        <section className="surface flex flex-col gap-5 p-6 lg:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{playing ? "Now playing" : "Ready"}</p>
              <h2 className="truncate font-display text-3xl text-foreground">{track.title}</h2>
              <p className="text-sm text-muted-foreground">{track.mood}</p>
            </div>
            <Visualizer active={playing || ambiencePlaying} bars={20} className="h-12" />
          </div>
          <div className="flex justify-center">
            <TrackControls size="lg" />
          </div>
          <VolumeRow
            label="Music"
            value={audio.musicVolume}
            muted={audio.musicMuted}
            onChange={(v) => audioController.setMusicVolume(v)}
            onMute={() => audioController.toggleMusicMute()}
          />
          {MUSIC_CATEGORIES.map((c) => (
            <div key={c.id}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{c.name}</p>
              <ul className="space-y-1.5">
                {TRACKS.filter((t) => t.category === c.id).map((t) => {
                  const current = t.id === track.id;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => (current && playing ? audioController.pause() : audioController.select(t.id))}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          current ? "border-accent bg-accent/10" : "border-border hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            current && playing ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
                          )}
                        >
                          {current && playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground">{t.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{t.mood}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{t.bpm} bpm</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* mixes */}
          <section className="surface p-6">
            <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
              <Sparkles className="h-5 w-5 text-accent" /> Sound combinations
            </h2>
            <p className="text-sm text-muted-foreground">One tap sets the music and ambience together.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {MIXES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => audioController.applyMix(m.id)}
                  className="group rounded-2xl border border-border bg-background/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
                >
                  <p className="font-display text-lg text-foreground">{m.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[m.trackId ? getTrack(m.trackId).title : null, ...Object.keys(m.layers).map((id) => LAYERS.find((l) => l.id === id)?.name)]
                      .filter(Boolean)
                      .join(" + ")}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* mixer */}
          <section className="surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-foreground">Ambience mixer</h2>
                <p className="text-sm text-muted-foreground">Layer as many as you like, each with its own volume.</p>
              </div>
              {anySelected && (
                <Button variant={ambiencePlaying ? "soft" : "hero"} onClick={() => audioController.toggleAmbience()}>
                  {ambiencePlaying ? <Pause /> : <Play />}
                  {ambiencePlaying ? "Pause ambience" : "Play ambience"}
                </Button>
              )}
            </div>
            <div className="mt-4">
              <VolumeRow
                label="All ambience"
                value={audio.ambienceVolume}
                muted={audio.ambienceMuted}
                onChange={(v) => audioController.setAmbienceVolume(v)}
                onMute={() => audioController.toggleAmbienceMute()}
              />
            </div>
            {(["nature", "cafe"] as const).map((group) => (
              <div key={group} className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {group === "nature" ? "Nature" : "Café & library"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LAYERS.filter((l) => l.group === group).map((l) => {
                    const pref = audio.layers[l.id] ?? { on: false, volume: 0.6 };
                    const Icon = LAYER_ICONS[l.id];
                    const live = pref.on && ambiencePlaying;
                    return (
                      <div
                        key={l.id}
                        className={cn("rounded-2xl border p-4 transition-colors", live ? "border-primary bg-primary/5" : "border-border")}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full",
                              live ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{l.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{l.hint}</p>
                          </div>
                          <Switch checked={pref.on} onCheckedChange={(on) => audioController.setLayer(l.id, { on })} aria-label={`Toggle ${l.name}`} />
                        </div>
                        <Slider
                          className="mt-4"
                          value={[Math.round(pref.volume * 100)]}
                          max={100}
                          step={1}
                          onValueChange={([v]) => audioController.setLayer(l.id, { volume: v / 100 })}
                          aria-label={`${l.name} volume`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
