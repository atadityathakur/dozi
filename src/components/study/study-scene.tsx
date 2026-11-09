import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { PetCompanion } from "@/components/pets/pet-companion";
import { getDaypart, useNow } from "@/hooks/use-now";
import { useRoomPet } from "@/hooks/use-room-pet";
import { playSfx } from "@/lib/audio/sfx";
import { ACTION_LINES, BOOK_QUOTES, clockMessage, pickLine } from "@/lib/companion-lines";
import { getPet } from "@/lib/pets";
import { ClickBurst, NEXT_WEATHER, PET_SCALE, PET_Y, SPOT_X, resolveLamp, resolveWeather } from "@/lib/room";
import { cn } from "@/lib/utils";
import { appActions, useApp } from "@/state/app-store";

const f = (name: string) => ({ fill: `var(--${name})` });
const s = (name: string) => ({ stroke: `var(--${name})` });

// Deterministic pseudo-random, rounded so server and browser render identical numbers.
function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
const r2 = (n: number) => Math.round(n * 100) / 100;

const RAIN = Array.from({ length: 42 }, (_, i) => ({
  x: r2(90 + seeded(i) * 300),
  y: r2(40 + seeded(i + 100) * 120),
  d: r2(0.6 + seeded(i + 200) * 0.6),
  delay: r2(-seeded(i + 300) * 1.2),
}));
const STARS = Array.from({ length: 16 }, (_, i) => ({
  x: r2(100 + seeded(i + 400) * 220),
  y: r2(75 + seeded(i + 500) * 150),
  r: r2(0.8 + seeded(i + 600) * 1.3),
  delay: r2(seeded(i + 700) * 3),
}));
const DUST = Array.from({ length: 12 }, (_, i) => ({
  x: r2(220 + seeded(i + 800) * 260),
  y: r2(380 + seeded(i + 900) * 110),
  r: r2(1 + seeded(i + 1000) * 1.6),
  delay: r2(-seeded(i + 1100) * 7),
}));
const BULBS = Array.from({ length: 13 }, (_, i) => {
  const t = (i + 0.5) / 13;
  const x = (1 - t) ** 2 * 20 + 2 * t * (1 - t) * 400 + t * t * 780;
  const y = (1 - t) ** 2 * 22 + 2 * t * (1 - t) * 66 + t * t * 22;
  return { x: r2(x), y: r2(y), delay: r2(seeded(i + 1200) * 2.5) };
});
const SHELF_BOOKS = [
  { x: 598, w: 15, h: 58, c: "book-1" },
  { x: 614, w: 18, h: 64, c: "book-3" },
  { x: 633, w: 13, h: 52, c: "book-2" },
  { x: 647, w: 17, h: 60, c: "book-4" },
  { x: 666, w: 14, h: 48, c: "book-1" },
];
const WINDOW_PATH = "M80 370 V185 A130 130 0 0 1 340 185 V370 Z";
const WEATHER_LABEL = { clear: "Clear skies", cloudy: "Cloudy", rain: "Rainy" } as const;

function Cloud({ y, scale, duration, delay }: { y: number; scale: number; duration: number; delay: number }) {
  return (
    <g className="a-drift" style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>
      <g transform={`translate(80 ${y}) scale(${scale})`} style={{ ...f("cloud"), opacity: 0.92 }}>
        <ellipse cx="0" cy="0" rx="34" ry="13" />
        <circle cx="-14" cy="-8" r="14" />
        <circle cx="8" cy="-14" r="18" />
        <circle cx="26" cy="-5" r="12" />
      </g>
    </g>
  );
}

type Hit = { x: number; y: number; w: number; h: number } | { path: string } | { cx: number; cy: number; r: number };

/** A clickable, focusable thing in the room with a generous invisible hit area. */
function RoomObject({
  label,
  hint,
  hits,
  onActivate,
  onHint,
  className,
  children,
}: {
  label: string;
  hint: string;
  hits: Hit[];
  onActivate: () => void;
  onHint: (hint: string | null) => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <g
      className={cn("room-obj", className)}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHint(hint)}
      onPointerLeave={() => onHint(null)}
      onFocus={() => onHint(hint)}
      onBlur={() => onHint(null)}
    >
      <title>{hint}</title>
      {children}
      {hits.map((h, i) =>
        "path" in h ? (
          <path key={i} className="obj-hit" d={h.path} />
        ) : "r" in h ? (
          <circle key={i} className="obj-hit" cx={h.cx} cy={h.cy} r={h.r} />
        ) : (
          <rect key={i} className="obj-hit" x={h.x} y={h.y} width={h.w} height={h.h} rx="10" />
        ),
      )}
    </g>
  );
}

type Visitor = "none" | "here" | "leaving";

export function StudyScene() {
  const now = useNow(1000);
  const settings = useApp((st) => st.settings);
  const theme = settings.theme;
  const layers = useApp((st) => st.audio.layers);
  const ambiencePlaying = useApp((st) => st.runtime.ambiencePlaying);
  const musicPlaying = useApp((st) => st.runtime.musicPlaying);
  const trackId = useApp((st) => st.audio.trackId);
  const task = useApp((st) => st.study.task);
  const subjectId = useApp((st) => st.study.subjectId);
  const subjects = useApp((st) => st.subjects);
  const timerStatus = useApp((st) => st.timer.status);
  const timerPhase = useApp((st) => st.timer.phase);

  const pet = useRoomPet(now);
  const { say, react } = pet;

  const daypart = getDaypart(now);
  const rainSound = (ambiencePlaying && !!layers["rain"]?.on) || (musicPlaying && trackId === "rainy-day");
  const weather = resolveWeather(settings.weather, { theme, rainSound });
  const raining = weather === "rain";
  const anim = settings.ambientAnimations ? settings.animations : null;
  const evening = daypart === "night" || daypart === "evening";
  const [partyUntil, setPartyUntil] = useState(0);
  const party = partyUntil > now;
  const lampOn =
    party ||
    resolveLamp(settings.lamp, {
      evening,
      theme,
      raining,
      focusing: timerStatus === "running" && timerPhase === "focus",
    });
  const nightish = evening || theme === "midnight-library";
  const moonish = daypart === "night" || theme === "midnight-library";

  const date = now ? new Date(now) : null;
  const hourAngle = date ? ((date.getHours() % 12) + date.getMinutes() / 60) * 30 : 300;
  const minuteAngle = date ? (date.getMinutes() + date.getSeconds() / 60) * 6 : 60;
  const secondAngle = date ? date.getSeconds() * 6 : 0;

  const noteText = useMemo(() => {
    const subject = subjects.find((x) => x.id === subjectId)?.name;
    const text = (task || subject || "be kind to yourself").trim();
    const words = text.split(/\s+/);
    const lines: string[] = [""];
    for (const w of words) {
      const cur = lines[lines.length - 1];
      if ((cur + " " + w).trim().length > 12 && cur) {
        if (lines.length === 3) break;
        lines.push(w);
      } else lines[lines.length - 1] = (cur + " " + w).trim();
    }
    return lines.map((l) => (l.length > 13 ? l.slice(0, 12) + "…" : l));
  }, [task, subjectId, subjects]);

  /* ---------------- room interaction state ---------------- */

  const [hint, setHint] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [plantKey, setPlantKey] = useState(0);
  const [mugKey, setMugKey] = useState(0);
  const [bird, setBird] = useState<Visitor>("none");
  const [bug, setBug] = useState<Visitor>("none");
  const lampBurst = useRef(new ClickBurst(1800));
  const birdRef = useRef(bird);
  birdRef.current = bird;
  const bugRef = useRef(bug);
  bugRef.current = bug;

  const showFlash = (text: string) => setFlash({ id: Date.now(), text });
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 2600);
    return () => window.clearTimeout(id);
  }, [flash]);
  useEffect(() => {
    if (!quote) return;
    const id = window.setTimeout(() => setQuote(null), 9000);
    return () => window.clearTimeout(id);
  }, [quote]);

  const shoo = (who: "bird" | "bug") => {
    const set = who === "bird" ? setBird : setBug;
    set("leaving");
    window.setTimeout(() => set("none"), 1000);
  };

  // Little visitors: a bird on the window and a ladybug on the plant.
  useEffect(() => {
    let nextBird = Date.now() + 35_000 + Math.random() * 45_000;
    let nextBug = Date.now() + 70_000 + Math.random() * 90_000;
    let birdLeaves = 0;
    let bugLeaves = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const t = Date.now();
      if (birdRef.current === "here" && t > birdLeaves) shoo("bird");
      if (bugRef.current === "here" && t > bugLeaves) shoo("bug");
      if (birdRef.current === "none" && t > nextBird) {
        setBird("here");
        birdLeaves = t + 16_000;
        nextBird = t + 120_000 + Math.random() * 150_000;
        playSfx("chirp", { passive: true });
        say(ACTION_LINES.bird, "auto");
      }
      if (bugRef.current === "none" && t > nextBug) {
        setBug("here");
        bugLeaves = t + 30_000;
        nextBug = t + 150_000 + Math.random() * 150_000;
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions = {
    lamp() {
      appActions.wake();
      const n = lampBurst.current.hit(Date.now());
      if (n >= 4) {
        lampBurst.current.reset();
        setPartyUntil(Date.now() + 4500);
        appActions.updateSettings({ lamp: "on" });
        playSfx("sparkle");
        react("excited", 2200, { lines: ACTION_LINES.party, speak: "object" });
        return;
      }
      appActions.updateSettings({ lamp: lampOn ? "off" : "on" });
      playSfx("click");
      say(lampOn ? ACTION_LINES.lampOff : ACTION_LINES.lampOn, "object");
    },
    mug() {
      appActions.wake();
      setMugKey((k) => k + 1);
      playSfx("sip");
      say(ACTION_LINES.mug, "object");
    },
    window() {
      appActions.wake();
      const next = NEXT_WEATHER[weather];
      appActions.updateSettings({ weather: next });
      playSfx(next === "rain" ? "pour" : "whoosh");
      showFlash(`${WEATHER_LABEL[next]} outside`);
    },
    plant() {
      appActions.wake();
      setPlantKey((k) => k + 1);
      playSfx("pop");
      say(ACTION_LINES.plant, "object");
      if (bugRef.current === "none" && Math.random() < 0.3) window.setTimeout(() => setBug("here"), 600);
    },
    books() {
      appActions.wake();
      playSfx("page");
      setQuote((q) => pickLine(BOOK_QUOTES, q ?? undefined));
    },
    clock() {
      appActions.wake();
      playSfx("tick");
      say(clockMessage(new Date().getHours()), "object");
    },
    bird() {
      shoo("bird");
      playSfx("chirp");
      react("excited", 1300, { lines: ACTION_LINES.bird, speak: "object" });
    },
    bug() {
      shoo("bug");
      playSfx("sparkle");
      react("wave", 1400, { lines: ACTION_LINES.ladybug, speak: "object" });
    },
  };

  const petDef = getPet(pet.petId);
  const typing = pet.action === "type";
  const playing = pet.action === "play";
  const bubbleLeft = Math.min(85, Math.max(15, SPOT_X[pet.spot] / 8));
  const shownHint = flash?.text ?? hint;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 800 520"
        className="scene block h-auto w-full select-none"
        data-daypart={daypart}
        data-weather={weather}
        data-party={party ? "on" : undefined}
      >
        <title>{`${pet.name} the ${petDef.name.toLowerCase()} studying in a cozy room. Click things in the room to play.`}</title>
        <defs>
          <pattern id="wallpaper" width="34" height="34" patternUnits="userSpaceOnUse">
            <rect width="34" height="34" style={f("scene-wall")} />
            <rect width="17" height="34" style={{ ...f("scene-wall-2"), opacity: 0.45 }} />
            <circle cx="25.5" cy="17" r="1.6" style={{ ...f("scene-trim"), opacity: 0.6 }} />
          </pattern>
          <linearGradient id="sky" x1="0" y1="55" x2="0" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--sky-top)" }} />
            <stop offset="1" style={{ stopColor: "var(--sky-bottom)" }} />
          </linearGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--lamp-glow)", stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: "var(--lamp-glow)", stopOpacity: 0 }} />
          </linearGradient>
          <radialGradient id="lampcone" cx="0.35" cy="0" r="1">
            <stop offset="0" style={{ stopColor: "var(--lamp-glow)", stopOpacity: 0.75 }} />
            <stop offset="0.7" style={{ stopColor: "var(--lamp-glow)", stopOpacity: 0.12 }} />
            <stop offset="1" style={{ stopColor: "var(--lamp-glow)", stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="bulbglow">
            <stop offset="0" style={{ stopColor: "var(--bulb)", stopOpacity: 0.9 }} />
            <stop offset="1" style={{ stopColor: "var(--bulb)", stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="screenglow">
            <stop offset="0" style={{ stopColor: "var(--laptop-glow)", stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: "var(--laptop-glow)", stopOpacity: 0 }} />
          </radialGradient>
          <clipPath id="windowClip">
            <path d={WINDOW_PATH} />
          </clipPath>
        </defs>

        {/* wall */}
        <rect width="800" height="520" fill="url(#wallpaper)" />
        <rect y="330" width="800" height="72" style={{ ...f("scene-trim"), opacity: 0.35 }} />

        {/* window — click to change the weather */}
        <RoomObject
          label={`Window. Weather: ${WEATHER_LABEL[weather]}. Change the weather`}
          hint="Window · click to change the weather"
          hits={[{ path: WINDOW_PATH }]}
          onActivate={actions.window}
          onHint={setHint}
        >
          <g clipPath="url(#windowClip)">
            <rect x="80" y="55" width="260" height="315" fill="url(#sky)" />
            {moonish && weather === "clear" &&
              STARS.map((st, i) => (
                <circle key={i} cx={st.x} cy={st.y} r={st.r} className="a-twinkle" style={{ ...f("paper"), animationDelay: `${st.delay}s` }} />
              ))}
            {weather === "clear" && (
              <g>
                <circle cx="282" cy="128" r={moonish ? 18 : 22} style={f("sun")} />
                {moonish && <circle cx="290" cy="122" r="16" style={f("sky-top")} />}
              </g>
            )}
            {anim?.clouds !== false ? (
              <g>
                <Cloud y={110} scale={1} duration={80} delay={-10} />
                <Cloud y={160} scale={0.7} duration={60} delay={-40} />
                <Cloud y={90} scale={0.55} duration={95} delay={-70} />
                {weather !== "clear" && <Cloud y={130} scale={1.3} duration={70} delay={-25} />}
                {weather === "cloudy" && (
                  <>
                    <Cloud y={180} scale={1.1} duration={85} delay={-55} />
                    <Cloud y={100} scale={1.4} duration={100} delay={-5} />
                  </>
                )}
              </g>
            ) : (
              <g transform="translate(210 120)" style={{ ...f("cloud"), opacity: 0.9 }}>
                <ellipse rx="34" ry="13" />
                <circle cx="-14" cy="-8" r="14" />
                <circle cx="8" cy="-14" r="18" />
              </g>
            )}
            <path d="M80 300 Q150 262 220 292 T340 280 V370 H80Z" style={f("hill-far")} />
            <path d="M80 334 Q165 304 240 328 T340 318 V370 H80Z" style={f("hill-near")} />
            <g transform="translate(262 300)">
              <rect x="0" y="6" width="22" height="16" style={f("wood-dark")} />
              <path d="M-3 7 L11 -4 L25 7 Z" style={f("curtain-shade")} />
              <rect x="8" y="11" width="6" height="6" style={{ ...f(nightish ? "bulb" : "sky-bottom") }} />
            </g>
            <g style={f("leaf-dark")}>
              <circle cx="110" cy="318" r="12" />
              <circle cx="126" cy="324" r="9" />
              <rect x="109" y="322" width="3" height="18" style={f("wood-dark")} />
            </g>
            {raining && anim?.rain !== false && (
              <g style={{ ...s("paper"), strokeWidth: 1.4, strokeLinecap: "round", opacity: 0.7 }}>
                {RAIN.map((r, i) => (
                  <line
                    key={i}
                    x1={r.x}
                    y1={r.y}
                    x2={r.x - 4}
                    y2={r.y + 16}
                    className="a-rain"
                    style={{ animationDuration: `${r.d}s`, animationDelay: `${r.delay}s` }}
                  />
                ))}
              </g>
            )}
            {raining && anim?.rain === false && (
              <g style={{ ...s("paper"), strokeWidth: 1.4, opacity: 0.5 }}>
                {RAIN.map((r, i) => (
                  <line key={i} x1={r.x} y1={r.y + 100} x2={r.x - 4} y2={r.y + 116} />
                ))}
              </g>
            )}
            <path d="M120 370 L220 60 L250 60 L150 370 Z" style={{ ...f("paper"), opacity: 0.08 }} />
          </g>
          <g style={{ ...s("window-frame"), fill: "none", strokeLinecap: "round" }}>
            <path d={WINDOW_PATH} strokeWidth="12" />
            <path d="M210 58 V370 M84 236 H336" strokeWidth="7" />
          </g>
        </RoomObject>
        <rect x="58" y="368" width="304" height="16" rx="4" style={f("window-frame")} />
        <rect x="64" y="383" width="292" height="6" rx="3" style={{ ...f("scene-trim"), opacity: 0.6 }} />

        {/* curtains */}
        <g pointerEvents="none">
          <path d="M40 46 H392" style={{ ...s("wood-dark"), strokeWidth: 5, strokeLinecap: "round" }} />
          <circle cx="38" cy="46" r="6" style={f("wood-dark")} />
          <circle cx="394" cy="46" r="6" style={f("wood-dark")} />
          <path d="M46 46 H112 C 104 140, 120 250, 96 392 C 80 396, 60 396, 46 392 Z" style={f("curtain")} />
          <path d="M66 50 C 64 160, 74 280, 66 392" style={{ ...s("curtain-shade"), strokeWidth: 6, fill: "none", opacity: 0.7 }} />
          <path d="M374 46 H310 C 318 140, 302 250, 326 392 C 342 396, 362 396, 374 392 Z" style={f("curtain")} />
          <path d="M354 50 C 356 160, 346 280, 354 392" style={{ ...s("curtain-shade"), strokeWidth: 6, fill: "none", opacity: 0.7 }} />
        </g>

        {/* bird visitor on the window sill */}
        {bird !== "none" && (
          <RoomObject
            label="A little bird on the window sill"
            hint="A bird! Click to say hi"
            hits={[{ cx: 178, cy: 352, r: 26 }]}
            onActivate={actions.bird}
            onHint={setHint}
          >
            <g className={cn("fb", bird === "leaving" ? "a-fly-away" : "a-hop-in")}>
              <g className="fb o-bottom a-peck">
                <path d="M164 356 L154 352 L163 350 Z" style={f("bird")} />
                <ellipse cx="178" cy="356" rx="13" ry="10" style={f("bird")} />
                <ellipse cx="181" cy="359" rx="8" ry="6" style={f("bird-belly")} />
                <circle cx="188" cy="345" r="7.5" style={f("bird")} />
                <circle cx="190" cy="343.5" r="1.6" style={f("ink")} />
                <path d="M195 345 L201 346.5 L195 348 Z" style={f("beak")} />
                <path d="M170 352 Q176 360 184 354" style={{ ...s("ink"), strokeWidth: 1.2, fill: "none", opacity: 0.35 }} />
                <path d="M176 366 v-2 M182 366 v-2" style={{ ...s("beak"), strokeWidth: 1.6, strokeLinecap: "round" }} />
              </g>
            </g>
          </RoomObject>
        )}

        {/* plant on the sill */}
        <RoomObject label="Plant on the window sill" hint="Plant · give it some love" hits={[{ x: 270, y: 274, w: 78, h: 100 }]} onActivate={actions.plant} onHint={setHint}>
          <g key={plantKey} className={plantKey ? "fb o-bottom a-wiggle-once" : undefined}>
            <g className={`fb o-bottom ${anim?.plant !== false ? "a-sway" : ""}`}>
              <path d="M311 350 C 300 320, 286 312, 276 316 C 284 330, 296 342, 311 350 Z" style={f("leaf")} />
              <path d="M311 350 C 316 316, 330 304, 342 306 C 336 324, 326 340, 311 350 Z" style={f("leaf-dark")} />
              <path d="M311 350 C 306 310, 310 290, 318 280 C 324 298, 320 330, 311 350 Z" style={f("leaf")} />
              <path d="M311 350 C 296 334, 290 326, 282 330 C 290 342, 300 348, 311 350 Z" style={f("leaf-dark")} />
            </g>
            <path d="M294 348 L328 348 L324 370 L298 370 Z" style={f("pot")} />
            <rect x="291" y="344" width="40" height="7" rx="2" style={f("pot")} />
          </g>
        </RoomObject>
        {bug !== "none" && (
          <RoomObject label="A ladybug on the plant" hint="A ladybug! Make a wish" hits={[{ cx: 316, cy: 306, r: 20 }]} onActivate={actions.bug} onHint={setHint}>
            <g className={cn("fb o-center", bug === "leaving" ? "a-fly-away" : "a-crawl")}>
              <circle cx="316" cy="306" r="5.5" style={f("ladybug")} />
              <path d="M316 300.5 V311.5" style={{ ...s("ink"), strokeWidth: 0.9 }} />
              <circle cx="316" cy="300.5" r="2.4" style={f("ink")} />
              <circle cx="313.6" cy="305" r="1.1" style={f("ink")} />
              <circle cx="318.4" cy="307.6" r="1.1" style={f("ink")} />
              <circle cx="313.8" cy="309" r="0.9" style={f("ink")} />
            </g>
          </RoomObject>
        )}

        {/* sticky note */}
        <g transform="translate(604 100) rotate(4)" pointerEvents="none">
          <rect x="0" y="0" width="80" height="74" rx="2" style={f("note")} />
          <rect x="30" y="-6" width="20" height="10" rx="2" style={{ ...f("paper"), opacity: 0.7 }} />
          <text x="8" y="20" fontSize="10" style={{ ...f("highlight-foreground"), fontFamily: "var(--font-sans)", fontWeight: 700, letterSpacing: "0.08em" }}>
            TODAY
          </text>
          {noteText.map((line, i) => (
            <text key={i} x="8" y={37 + i * 13} fontSize="12" style={{ ...f("highlight-foreground"), fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              {line}
            </text>
          ))}
        </g>

        {/* clock */}
        <RoomObject label="Wall clock" hint="Clock · what time is it?" hits={[{ x: 698, y: 32, w: 84, h: 84 }]} onActivate={actions.clock} onHint={setHint}>
          <g transform="translate(740 74)">
            <circle r="34" style={f("paper")} />
            <circle r="34" style={{ ...s("wood-dark"), strokeWidth: 5, fill: "none" }} />
            {Array.from({ length: 12 }, (_, i) => (
              <line
                key={i}
                x1="0"
                y1="-27"
                x2="0"
                y2={i % 3 === 0 ? -22 : -24.5}
                transform={`rotate(${i * 30})`}
                style={{ ...s("wood-dark"), strokeWidth: i % 3 === 0 ? 2.4 : 1.4, strokeLinecap: "round" }}
              />
            ))}
            <line y2="-15" transform={`rotate(${hourAngle})`} style={{ ...s("foreground"), strokeWidth: 3.4, strokeLinecap: "round" }} />
            <line y2="-23" transform={`rotate(${minuteAngle})`} style={{ ...s("foreground"), strokeWidth: 2.2, strokeLinecap: "round" }} />
            <line y1="4" y2="-25" transform={`rotate(${secondAngle})`} style={{ ...s("accent"), strokeWidth: 1.2, strokeLinecap: "round" }} />
            <circle r="2.6" style={f("accent")} />
          </g>
        </RoomObject>

        {/* shelf */}
        <g>
          <RoomObject label="Books on the shelf. Read a quote" hint="Books · pull out a quote" hits={[{ x: 592, y: 200, w: 116, h: 74 }]} onActivate={actions.books} onHint={setHint}>
            {SHELF_BOOKS.map((b, i) => (
              <rect key={i} x={b.x} y={270 - b.h} width={b.w} height={b.h} rx="2" style={f(b.c)} />
            ))}
            <rect x="684" y="216" width="16" height="56" rx="2" transform="rotate(14 692 270)" style={f("book-2")} />
          </RoomObject>
          <g transform="translate(742 270)" pointerEvents="none">
            <path d="M-14 0 L14 0 L11 -22 L-11 -22 Z" style={f("pot")} />
            <g className={`fb ${anim?.plant !== false ? "a-sway" : ""}`} style={{ transformOrigin: "50% 0%", animationDuration: "7s" }}>
              <path d="M-8 -6 C -18 20, -14 44, -20 64" style={{ ...s("leaf-dark"), strokeWidth: 2.5, fill: "none" }} />
              <path d="M6 -6 C 14 18, 10 34, 16 50" style={{ ...s("leaf-dark"), strokeWidth: 2.5, fill: "none" }} />
              {[10, 24, 38, 52].map((y, i) => (
                <ellipse key={i} cx={-16 + (i % 2) * 4} cy={y} rx="7" ry="4" transform={`rotate(${i % 2 ? 30 : -30} ${-16 + (i % 2) * 4} ${y})`} style={f("leaf")} />
              ))}
              {[12, 28, 42].map((y, i) => (
                <ellipse key={i} cx={12 + (i % 2) * 3} cy={y} rx="6" ry="3.5" transform={`rotate(${i % 2 ? -30 : 30} ${12 + (i % 2) * 3} ${y})`} style={f("leaf")} />
              ))}
            </g>
            <path d="M-11 -22 C -16 -40, -4 -44, 0 -30 C 4 -46, 18 -40, 11 -22 Z" style={f("leaf")} />
          </g>
          <rect x="584" y="270" width="200" height="10" rx="3" style={f("wood")} />
          <path d="M600 280 v16 h10 M766 280 v16 h-10" style={{ ...s("wood-dark"), strokeWidth: 4, fill: "none" }} />
        </g>

        {/* desk */}
        <g pointerEvents="none">
          <rect y="398" width="800" height="14" rx="3" style={f("wood-edge")} />
          <rect y="410" width="800" height="110" style={f("wood")} />
          <rect y="410" width="800" height="6" style={{ ...f("wood-dark"), opacity: 0.5 }} />
          <rect x="560" y="432" width="180" height="58" rx="6" style={{ ...s("wood-dark"), strokeWidth: 3, fill: "none", opacity: 0.5 }} />
          <rect x="634" y="456" width="32" height="7" rx="3.5" style={{ ...f("wood-dark"), opacity: 0.7 }} />
          <polygon points="86,372 336,372 600,520 230,520" fill="url(#beam)" style={{ opacity: "var(--beam)" as unknown as number }} />
          {anim?.dust !== false && daypart !== "night" && !raining && (
            <g style={f("paper")}>
              {DUST.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} className="a-dust" style={{ animationDelay: `${d.delay}s` }} />
              ))}
            </g>
          )}
        </g>

        {/* lamp — click to switch, click fast for a surprise */}
        <RoomObject
          label={`Desk lamp, ${lampOn ? "on" : "off"}. Switch it ${lampOn ? "off" : "on"}`}
          hint={`Lamp · click to switch it ${lampOn ? "off" : "on"}`}
          hits={[
            { x: 138, y: 232, w: 84, h: 72 },
            { x: 78, y: 300, w: 62, h: 108 },
          ]}
          onActivate={actions.lamp}
          onHint={setHint}
        >
          <ellipse cx="118" cy="402" rx="36" ry="8" style={f("lamp-body")} />
          <path d="M118 400 L98 320 L168 268" style={{ ...s("lamp-body"), strokeWidth: 7, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }} />
          <circle cx="98" cy="320" r="6" style={f("lamp-body")} />
          <g transform="translate(176 262) rotate(28)">
            <path d="M-26 -6 L22 -6 L40 34 L-40 34 Z" style={f("lamp-shade")} />
            <rect x="-6" y="-14" width="12" height="10" rx="3" style={f("lamp-body")} />
            {lampOn && <ellipse cx="0" cy="36" rx="16" ry="6" className={party ? "a-party" : ""} style={f("bulb")} />}
          </g>
        </RoomObject>

        {/* desk books — a quote to keep you going */}
        <RoomObject label="Stack of books. Read a quote" hint="Books · pull out a quote" hits={[{ x: 154, y: 344, w: 96, h: 54 }]} onActivate={actions.books} onHint={setHint}>
          <rect x="164" y="378" width="88" height="14" rx="3" style={f("book-1")} />
          <rect x="170" y="364" width="80" height="14" rx="3" style={f("book-3")} />
          <rect x="160" y="352" width="84" height="12" rx="3" style={f("book-4")} />
          <rect x="164" y="390" width="88" height="3" style={{ ...f("paper"), opacity: 0.6 }} />
        </RoomObject>

        {/* laptop */}
        <RoomObject label="Laptop. Let your pet type" hint="Laptop · let your pet type something" hits={[{ x: 470, y: 322, w: 110, h: 78 }]} onActivate={pet.typeOnLaptop} onHint={setHint}>
          {(lampOn || typing) && <ellipse cx="525" cy="356" rx="58" ry="40" fill="url(#screenglow)" pointerEvents="none" style={{ opacity: typing ? 1 : 0.55 }} />}
          <rect x="484" y="328" width="82" height="56" rx="5" style={f("laptop")} />
          <rect x="489" y="333" width="72" height="45" rx="2" style={f("laptop-screen")} />
          {typing ? (
            <g style={{ ...f("laptop-glow"), fontFamily: "var(--font-sans)", fontSize: 7, fontWeight: 700 }}>
              <text x="494" y="344" className="a-type-line">asdfgh</text>
              <text x="494" y="355" className="a-type-line" style={{ animationDelay: "0.5s" }}>
                fish fish
              </text>
              <text x="494" y="366" className="a-type-line" style={{ animationDelay: "1s" }}>
                mrrrp :3
              </text>
            </g>
          ) : (
            <path
              transform="translate(525 356)"
              d="M0 5 C -7 -1, -4 -9, 0 -4 C 4 -9, 7 -1, 0 5 Z"
              style={{ ...f("laptop-glow"), opacity: 0.7 }}
            />
          )}
          <path d="M474 384 H576 L570 396 H480 Z" style={f("laptop")} />
          <rect x="512" y="386" width="26" height="3" rx="1.5" style={{ ...f("laptop-screen"), opacity: 0.6 }} />
        </RoomObject>

        {/* mug */}
        <RoomObject label="Mug of tea. Take a sip" hint="Mug · take a sip" hits={[{ x: 570, y: 340, w: 60, h: 62 }]} onActivate={actions.mug} onHint={setHint}>
          <g transform="translate(594 400)">
            <rect x="-20" y="-40" width="40" height="40" rx="7" style={f("mug")} />
            <rect x="-20" y="-28" width="40" height="8" style={f("mug-band")} />
            <path d="M20 -32 q16 2 0 22" style={{ ...s("mug"), strokeWidth: 6, fill: "none" }} />
            {anim?.steam !== false && (
              <g key={mugKey} className={mugKey ? "a-steam-burst" : undefined} style={{ ...s("paper"), strokeWidth: 3, fill: "none", strokeLinecap: "round", opacity: 0.8 }}>
                <path className="fb a-steam" d="M-8 -46 q-6 -8 0 -16 q6 -8 0 -16" />
                <path className="fb a-steam" style={{ animationDelay: "1.1s" }} d="M6 -46 q-6 -8 0 -16 q6 -8 0 -16" />
                <path className="fb a-steam" style={{ animationDelay: "2.1s" }} d="M-1 -48 q-5 -7 0 -14 q5 -7 0 -14" />
              </g>
            )}
          </g>
        </RoomObject>

        {/* bed cushion (behind the pet) */}
        <g pointerEvents="none">
          <ellipse cx="752" cy="390" rx="44" ry="13" style={f("bed-cushion")} />
          <path d="M710 388 Q712 362 752 360 Q792 362 794 388 Z" style={{ ...f("bed"), opacity: 0.85 }} />
          <ellipse cx="752" cy="388" rx="38" ry="10" style={f("bed-cushion")} />
        </g>

        {/* the pet */}
        <g
          className="pet-mover"
          style={{
            transform: `translate(${SPOT_X[pet.spot]}px, ${PET_Y}px) scale(${PET_SCALE})`,
            transition: `transform ${pet.walkMs}ms ease-in-out`,
          }}
        >
          <g transform={pet.walking && pet.facingRight ? "scale(-1 1)" : undefined}>
            <PetCompanion
              petId={pet.petId}
              mood={pet.mood}
              action={pet.action}
              walking={pet.walking}
              atHome={pet.spot === "home"}
              petting={pet.petting}
              label={`${pet.name} the ${petDef.name.toLowerCase()}. Press Enter to pet, W to wave, S to stretch`}
              onPoke={pet.poke}
              onPetStart={pet.petStart}
              onPetTick={pet.petTick}
              onPetEnd={pet.petEnd}
            />
          </g>
        </g>

        {/* things in front of the pet */}
        <RoomObject label="Toy ball. Play with your pet" hint="Toy · time to play" hits={[{ x: 230, y: 360, w: 52, h: 42 }]} onActivate={() => pet.goTo("toy")} onHint={setHint}>
          <g className={cn("fb o-bottom", playing && "a-toy-bounce")}>
            <circle cx="256" cy="389" r="11" style={f("yarn")} />
            <path
              d="M247 384 Q256 392 265 384 M246 391 Q256 398 266 391 M252 379 Q248 389 253 399"
              style={{ ...s("paper"), strokeWidth: 1.3, fill: "none", opacity: 0.55 }}
            />
            <path d="M266 393 q8 4 14 1" style={{ ...s("yarn"), strokeWidth: 1.6, fill: "none" }} />
          </g>
        </RoomObject>
        <RoomObject label="Food bowl. Feed your pet" hint="Food bowl · snack time" hits={[{ x: 628, y: 362, w: 44, h: 42 }]} onActivate={() => pet.goTo("food")} onHint={setHint}>
          <g transform="translate(650 400)">
            <circle cx="-7" cy="-13" r="4" style={f("kibble")} />
            <circle cx="1" cy="-14" r="4" style={f("kibble")} />
            <circle cx="8" cy="-12.5" r="3.6" style={f("kibble")} />
            <path d="M-19 -12 H19 L15 0 H-15 Z" style={f("bowl")} />
            <rect x="-19" y="-13" width="38" height="3" rx="1.5" style={{ ...f("paper"), opacity: 0.3 }} />
          </g>
        </RoomObject>
        <RoomObject label="Water bowl. Give your pet a drink" hint="Water bowl · stay hydrated" hits={[{ x: 672, y: 362, w: 40, h: 42 }]} onActivate={() => pet.goTo("water")} onHint={setHint}>
          <g transform="translate(692 400)">
            <path d="M-17 -12 H17 L13 0 H-13 Z" style={f("bowl")} />
            <ellipse cx="0" cy="-12" rx="15" ry="2.6" style={f("water")} />
            <ellipse cx="-5" cy="-12.4" rx="4" ry="0.9" style={{ ...f("paper"), opacity: 0.6 }} />
          </g>
        </RoomObject>
        <RoomObject
          label={pet.spot === "bed" && pet.action === "sleep" ? "Pet bed. Wake your pet" : "Pet bed. Send your pet for a nap"}
          hint={pet.spot === "bed" && pet.action === "sleep" ? "Bed · wake up, sleepyhead" : "Bed · nap time"}
          hits={[{ x: 712, y: 362, w: 88, h: 42 }]}
          onActivate={() => pet.goTo("bed")}
          onHint={setHint}
        >
          <path d="M708 384 Q752 404 796 384 L792 400 Q752 414 712 400 Z" style={f("bed")} />
          <path d="M716 388 Q752 404 788 388" style={{ ...s("paper"), strokeWidth: 1.5, fill: "none", opacity: 0.25 }} />
        </RoomObject>

        {/* evening / night shade */}
        <rect width="800" height="520" pointerEvents="none" style={{ fill: "var(--shade)", opacity: "var(--room-shade)" as unknown as number }} />

        {/* glows (drawn above the shade) */}
        {lampOn && (
          <g pointerEvents="none" className={party ? "a-party" : anim?.lamp !== false ? "a-flicker" : ""}>
            <path d="M150 296 L212 276 L380 402 L40 402 Z" fill="url(#lampcone)" />
            <circle cx="182" cy="294" r="42" fill="url(#bulbglow)" style={{ opacity: 0.55 }} />
          </g>
        )}
        <g pointerEvents="none" className={party ? "a-party" : undefined}>
          <path d="M20 22 Q400 110 780 22" style={{ ...s("wood-dark"), strokeWidth: 1.5, fill: "none", opacity: 0.6 }} />
          {BULBS.map((b, i) => (
            <g key={i}>
              {(nightish || party) && anim?.lights !== false && (
                <circle cx={b.x} cy={b.y + 6} r="14" fill="url(#bulbglow)" className="a-twinkle" style={{ animationDelay: `${b.delay}s`, opacity: 0.7 }} />
              )}
              <ellipse
                cx={b.x}
                cy={b.y + 6}
                rx="3.6"
                ry="5"
                className={nightish && anim?.lights !== false ? "a-twinkle" : ""}
                style={{ ...f("bulb"), opacity: nightish ? 1 : 0.75, animationDelay: `${b.delay}s` }}
              />
            </g>
          ))}
        </g>
      </svg>

      {/* hover / tap hint */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[70%]" aria-live="polite">
        {shownHint && (
          <span key={shownHint} className="a-bubble-in inline-block rounded-full border border-border bg-card/90 px-3 py-1 text-[11px] font-semibold text-card-foreground shadow-soft backdrop-blur sm:text-xs">
            {shownHint}
          </span>
        )}
      </div>

      {/* quote from the books */}
      {quote && (
        <div className="absolute inset-x-0 top-[14%] flex justify-center px-6">
          <figure
            key={quote}
            className="a-bubble-in relative max-w-sm rounded-2xl border border-border bg-card px-5 py-4 text-center shadow-card"
            role="status"
          >
            <button
              type="button"
              onClick={() => setQuote(null)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close quote"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">From the bookshelf</p>
            <blockquote className="mt-1 font-display text-base italic leading-snug text-card-foreground sm:text-lg">“{quote}”</blockquote>
          </figure>
        </div>
      )}

      {/* companion speech bubble */}
      {pet.bubble && (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${bubbleLeft}%`, top: "45%", transition: `left ${pet.walkMs}ms ease-in-out` }}
          aria-live="polite"
        >
          <div key={pet.bubble.id} className="a-bubble-in" style={{ transform: "translate(-50%, -100%)" }}>
            <div className="relative w-max max-w-[11rem] rounded-2xl border border-border bg-card px-3 py-2 text-center text-xs font-medium leading-snug text-card-foreground shadow-soft sm:max-w-[14rem] sm:px-4 sm:text-sm">
              <span className="mb-0.5 block font-display text-[10px] uppercase tracking-[0.18em] text-accent sm:text-[11px]">{pet.name}</span>
              {pet.bubble.text}
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
