import { useMemo } from "react";

import { getDaypart, useNow } from "@/hooks/use-now";
import { useCompanion } from "@/hooks/use-companion";
import { appActions, useApp } from "@/state/app-store";

import { CatCompanion } from "./cat-companion";

const f = (name: string) => ({ fill: `var(--${name})` });
const s = (name: string) => ({ stroke: `var(--${name})` });

// deterministic pseudo-random so SSR and client agree
function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const RAIN = Array.from({ length: 42 }, (_, i) => ({
  x: 90 + seeded(i) * 300,
  y: 40 + seeded(i + 100) * 120,
  d: 0.6 + seeded(i + 200) * 0.6,
  delay: -seeded(i + 300) * 1.2,
}));
const STARS = Array.from({ length: 16 }, (_, i) => ({
  x: 100 + seeded(i + 400) * 220,
  y: 75 + seeded(i + 500) * 150,
  r: 0.8 + seeded(i + 600) * 1.3,
  delay: seeded(i + 700) * 3,
}));
const DUST = Array.from({ length: 12 }, (_, i) => ({
  x: 220 + seeded(i + 800) * 260,
  y: 380 + seeded(i + 900) * 110,
  r: 1 + seeded(i + 1000) * 1.6,
  delay: -seeded(i + 1100) * 7,
}));
const BULBS = Array.from({ length: 13 }, (_, i) => {
  const t = (i + 0.5) / 13;
  const x = (1 - t) ** 2 * 20 + 2 * t * (1 - t) * 400 + t * t * 780;
  const y = (1 - t) ** 2 * 22 + 2 * t * (1 - t) * 66 + t * t * 22;
  return { x, y, delay: seeded(i + 1200) * 2.5 };
});
const SHELF_BOOKS = [
  { x: 598, w: 15, h: 58, c: "book-1" },
  { x: 614, w: 18, h: 64, c: "book-3" },
  { x: 633, w: 13, h: 52, c: "book-2" },
  { x: 647, w: 17, h: 60, c: "book-4" },
  { x: 666, w: 14, h: 48, c: "book-1" },
];

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

  const { state, petting, message, name } = useCompanion(now);

  const daypart = getDaypart(now);
  const raining =
    (ambiencePlaying && !!layers.rain?.on) || (musicPlaying && trackId === "rainy-day") || theme === "library";
  const anim = settings.ambientAnimations ? settings.animations : null;
  const lampOn =
    daypart === "night" ||
    daypart === "evening" ||
    theme === "midnight" ||
    (raining && timerStatus === "running" && timerPhase === "focus");
  const nightish = daypart === "night" || daypart === "evening";

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

  return (
    <div className="relative">
      <svg
        viewBox="0 0 800 520"
        className="scene block h-auto w-full"
        data-daypart={daypart}
        data-weather={raining ? "rain" : "clear"}
        role="img"
        aria-label={`${name} the cat studying in a cozy room`}
      >
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
          <clipPath id="windowClip">
            <path d="M80 370 V185 A130 130 0 0 1 340 185 V370 Z" />
          </clipPath>
        </defs>

        {/* wall */}
        <rect width="800" height="520" fill="url(#wallpaper)" />
        <rect y="330" width="800" height="72" style={{ ...f("scene-trim"), opacity: 0.35 }} />

        {/* window */}
        <g clipPath="url(#windowClip)">
          <rect x="80" y="55" width="260" height="315" fill="url(#sky)" />
          {daypart === "night" && !raining &&
            STARS.map((st, i) => (
              <circle
                key={i}
                cx={st.x}
                cy={st.y}
                r={st.r}
                className="a-twinkle"
                style={{ ...f("paper"), animationDelay: `${st.delay}s` }}
              />
            ))}
          {!raining && (
            <g>
              <circle cx="282" cy="128" r={daypart === "night" ? 18 : 22} style={f("sun")} />
              {daypart === "night" && <circle cx="290" cy="122" r="16" style={f("sky-top")} />}
            </g>
          )}
          {anim?.clouds !== false && (
            <g>
              <Cloud y={110} scale={1} duration={80} delay={-10} />
              <Cloud y={160} scale={0.7} duration={60} delay={-40} />
              <Cloud y={90} scale={0.55} duration={95} delay={-70} />
              {raining && <Cloud y={130} scale={1.3} duration={70} delay={-25} />}
            </g>
          )}
          {anim?.clouds === false && (
            <g transform="translate(130 0)">
              <g transform="translate(80 120)" style={{ ...f("cloud"), opacity: 0.9 }}>
                <ellipse rx="34" ry="13" />
                <circle cx="-14" cy="-8" r="14" />
                <circle cx="8" cy="-14" r="18" />
              </g>
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
          {/* glass glare */}
          <path d="M120 370 L220 60 L250 60 L150 370 Z" style={{ ...f("paper"), opacity: 0.08 }} />
        </g>
        <g style={{ ...s("window-frame"), fill: "none", strokeLinecap: "round" }}>
          <path d="M80 370 V185 A130 130 0 0 1 340 185 V370 Z" strokeWidth="12" />
          <path d="M210 58 V370 M84 236 H336" strokeWidth="7" />
        </g>
        <rect x="58" y="368" width="304" height="16" rx="4" style={f("window-frame")} />
        <rect x="64" y="383" width="292" height="6" rx="3" style={{ ...f("scene-trim"), opacity: 0.6 }} />

        {/* curtains */}
        <path d="M40 46 H392" style={{ ...s("wood-dark"), strokeWidth: 5, strokeLinecap: "round" }} />
        <circle cx="38" cy="46" r="6" style={f("wood-dark")} />
        <circle cx="394" cy="46" r="6" style={f("wood-dark")} />
        <path d="M46 46 H112 C 104 140, 120 250, 96 392 C 80 396, 60 396, 46 392 Z" style={f("curtain")} />
        <path d="M66 50 C 64 160, 74 280, 66 392" style={{ ...s("curtain-shade"), strokeWidth: 6, fill: "none", opacity: 0.7 }} />
        <path d="M374 46 H310 C 318 140, 302 250, 326 392 C 342 396, 362 396, 374 392 Z" style={f("curtain")} />
        <path d="M354 50 C 356 160, 346 280, 354 392" style={{ ...s("curtain-shade"), strokeWidth: 6, fill: "none", opacity: 0.7 }} />

        {/* plant on sill */}
        <g>
          <g className={`fb o-bottom ${anim?.plant !== false ? "a-sway" : ""}`}>
            <path d="M311 350 C 300 320, 286 312, 276 316 C 284 330, 296 342, 311 350 Z" style={f("leaf")} />
            <path d="M311 350 C 316 316, 330 304, 342 306 C 336 324, 326 340, 311 350 Z" style={f("leaf-dark")} />
            <path d="M311 350 C 306 310, 310 290, 318 280 C 324 298, 320 330, 311 350 Z" style={f("leaf")} />
            <path d="M311 350 C 296 334, 290 326, 282 330 C 290 342, 300 348, 311 350 Z" style={f("leaf-dark")} />
          </g>
          <path d="M294 348 L328 348 L324 370 L298 370 Z" style={f("pot")} />
          <rect x="291" y="344" width="40" height="7" rx="2" style={f("pot")} />
        </g>

        {/* sticky note */}
        <g transform="translate(604 100) rotate(4)">
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
        <g transform="translate(740 74)">
          <circle r="34" style={f("paper")} />
          <circle r="34" style={{ ...s("wood-dark"), strokeWidth: 5, fill: "none" }} />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="0" y1="-27" x2="0" y2={i % 3 === 0 ? -22 : -24.5} transform={`rotate(${i * 30})`} style={{ ...s("wood-dark"), strokeWidth: i % 3 === 0 ? 2.4 : 1.4, strokeLinecap: "round" }} />
          ))}
          <line y2="-15" transform={`rotate(${hourAngle})`} style={{ ...s("foreground"), strokeWidth: 3.4, strokeLinecap: "round" }} />
          <line y2="-23" transform={`rotate(${minuteAngle})`} style={{ ...s("foreground"), strokeWidth: 2.2, strokeLinecap: "round" }} />
          <line y1="4" y2="-25" transform={`rotate(${secondAngle})`} style={{ ...s("accent"), strokeWidth: 1.2, strokeLinecap: "round" }} />
          <circle r="2.6" style={f("accent")} />
        </g>

        {/* shelf */}
        <g>
          {SHELF_BOOKS.map((b, i) => (
            <rect key={i} x={b.x} y={270 - b.h} width={b.w} height={b.h} rx="2" style={f(b.c)} />
          ))}
          <rect x="684" y="216" width="16" height="56" rx="2" transform="rotate(14 692 270)" style={f("book-2")} />
          <g transform="translate(742 270)">
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
        <rect y="398" width="800" height="14" rx="3" style={f("wood-edge")} />
        <rect y="410" width="800" height="110" style={f("wood")} />
        <rect y="410" width="800" height="6" style={{ ...f("wood-dark"), opacity: 0.5 }} />
        <rect x="560" y="432" width="180" height="58" rx="6" style={{ ...s("wood-dark"), strokeWidth: 3, fill: "none", opacity: 0.5 }} />
        <rect x="634" y="456" width="32" height="7" rx="3.5" style={{ ...f("wood-dark"), opacity: 0.7 }} />

        {/* sun beam + dust */}
        <polygon points="86,372 336,372 600,520 230,520" fill="url(#beam)" style={{ opacity: "var(--beam)" as unknown as number }} />
        {anim?.dust !== false && daypart !== "night" && !raining && (
          <g style={f("paper")}>
            {DUST.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} className="a-dust" style={{ animationDelay: `${d.delay}s` }} />
            ))}
          </g>
        )}

        {/* lamp */}
        <g>
          <ellipse cx="118" cy="402" rx="36" ry="8" style={f("lamp-body")} />
          <path d="M118 400 L98 320 L168 268" style={{ ...s("lamp-body"), strokeWidth: 7, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }} />
          <circle cx="98" cy="320" r="6" style={f("lamp-body")} />
          <g transform="translate(176 262) rotate(28)">
            <path d="M-26 -6 L22 -6 L40 34 L-40 34 Z" style={f("lamp-shade")} />
            <rect x="-6" y="-14" width="12" height="10" rx="3" style={f("lamp-body")} />
            {lampOn && <ellipse cx="0" cy="36" rx="16" ry="6" style={f("bulb")} />}
          </g>
        </g>

        {/* desk props */}
        <g>
          <rect x="208" y="378" width="88" height="14" rx="3" style={f("book-1")} />
          <rect x="214" y="364" width="80" height="14" rx="3" style={f("book-3")} />
          <rect x="204" y="352" width="84" height="12" rx="3" style={f("book-4")} />
          <rect x="208" y="390" width="88" height="3" style={{ ...f("paper"), opacity: 0.6 }} />
          <g transform="translate(320 360)">
            <path d="M4 -10 L10 -40 M14 -10 L16 -44 M22 -10 L28 -36" style={{ ...s("book-2"), strokeWidth: 4, strokeLinecap: "round" }} />
            <path d="M16 -44 l-2 -6 M28 -36 l1 -6" style={{ ...s("foreground"), strokeWidth: 2 }} />
            <rect x="0" y="-12" width="32" height="40" rx="4" style={f("lamp-body")} />
          </g>
        </g>

        {/* mug */}
        <g transform="translate(650 400)">
          <rect x="-20" y="-40" width="40" height="40" rx="7" style={f("mug")} />
          <rect x="-20" y="-28" width="40" height="8" style={f("mug-band")} />
          <path d="M20 -32 q16 2 0 22" style={{ ...s("mug"), strokeWidth: 6, fill: "none" }} />
          {anim?.steam !== false && (
            <g style={{ ...s("paper"), strokeWidth: 3, fill: "none", strokeLinecap: "round", opacity: 0.8 }}>
              <path className="fb a-steam" d="M-8 -46 q-6 -8 0 -16 q6 -8 0 -16" />
              <path className="fb a-steam" style={{ animationDelay: "1.1s" }} d="M6 -46 q-6 -8 0 -16 q6 -8 0 -16" />
              <path className="fb a-steam" style={{ animationDelay: "2.1s" }} d="M-1 -48 q-5 -7 0 -14 q5 -7 0 -14" />
            </g>
          )}
        </g>

        {/* the cat */}
        <g transform="translate(468 402)">
          <CatCompanion
            state={state}
            coat={settings.companionCoat}
            petting={petting}
            onPet={() => appActions.pet()}
            label={`Pet ${name}`}
          />
        </g>

        {/* evening / night shade */}
        <rect width="800" height="520" pointerEvents="none" style={{ fill: "var(--shade, oklch(0.16 0.04 265))", opacity: "var(--room-shade)" as unknown as number }} />

        {/* glows (drawn above the shade) */}
        {lampOn && (
          <g pointerEvents="none" className={anim?.lamp !== false ? "a-flicker" : ""}>
            <path d="M150 296 L212 276 L380 402 L40 402 Z" fill="url(#lampcone)" />
            <circle cx="182" cy="294" r="42" fill="url(#bulbglow)" style={{ opacity: 0.55 }} />
          </g>
        )}
        <g pointerEvents="none">
          <path d="M20 22 Q400 110 780 22" style={{ ...s("wood-dark"), strokeWidth: 1.5, fill: "none", opacity: 0.6 }} />
          {BULBS.map((b, i) => (
            <g key={i}>
              {nightish && anim?.lights !== false && (
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

      {/* companion speech bubble */}
      {message && (
        <div
          key={message}
          className="a-bubble-in pointer-events-none absolute max-w-[42%] sm:max-w-[34%]"
          style={{ left: "58.5%", top: "16%", transform: "translateX(-50%)" }}
        >
          <div className="relative rounded-2xl border border-border bg-card px-3 py-2 text-center text-xs font-medium leading-snug text-card-foreground shadow-soft sm:px-4 sm:text-sm">
            <span className="mb-0.5 block font-display text-[10px] uppercase tracking-[0.18em] text-accent sm:text-[11px]">
              {name}
            </span>
            {message}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card" />
          </div>
        </div>
      )}
    </div>
  );
}
