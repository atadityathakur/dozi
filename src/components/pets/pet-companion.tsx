import { useEffect, useRef, useState } from "react";

import type { MoodId } from "@/lib/companion-lines";
import { getPet } from "@/lib/pets";
import type { PetAction, PetZone } from "@/lib/room";
import type { PetId } from "@/lib/types";

import { BunnyArt } from "./bunny-art";
import { CatArt } from "./cat-art";
import { fill, stroke, type ArtProps, type EyeMode } from "./parts";
import { PuppyArt } from "./puppy-art";
import { ShibaArt } from "./shiba-art";

/** Colour set (CSS vars in styles.css) for each pet. */
const COAT: Record<PetId, string> = {
  "cat-white": "snow",
  "cat-orange": "ginger",
  "cat-black": "midnight",
  puppy: "puppy",
  bunny: "bunny",
  shiba: "shiba",
};

const HEART = "M0 5 C -9 -3, -5 -12, 0 -6 C 5 -12, 9 -3, 0 5 Z";
const HAPPY_ACTIONS: PetAction[] = ["excited", "zoomies", "eat", "play", "wave", "roll"];

interface Props {
  petId: PetId;
  mood: MoodId;
  action?: PetAction;
  walking?: boolean;
  /** Sitting at its desk spot (shows the open book / study glasses). */
  atHome?: boolean;
  petting?: boolean;
  /** Render as its own <svg> (previews) instead of a <g> inside the scene. */
  standalone?: boolean;
  label?: string;
  onPoke?: (zone: PetZone) => void;
  onPetStart?: () => void;
  onPetEnd?: () => void;
  onPetTick?: () => void;
}

/**
 * Interactive companion. Drawn in local coordinates with its bottom-centre
 * at (0, 0). Head = hold to pet, body = stretch/roll, paws = wave.
 */
export function PetCompanion({
  petId,
  mood,
  action = "none",
  walking = false,
  atHome = true,
  petting = false,
  standalone = false,
  label,
  onPoke,
  onPetStart,
  onPetEnd,
  onPetTick,
}: Props) {
  const ref = useRef<SVGGElement>(null);
  const [holding, setHolding] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; dx: number }[]>([]);
  const heartId = useRef(0);
  const interactive = !!onPoke;
  const kind = getPet(petId).kind;

  // Eyes + head gently follow the pointer.
  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.3;
        const mx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2.2)));
        const my = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2.2)));
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [interactive]);

  const spawnHeart = () => {
    const id = ++heartId.current;
    const heart = { id, x: Math.round(Math.random() * 90 - 45), dx: Math.round(Math.random() * 40 - 20) };
    setHearts((h) => [...h.slice(-10), heart]);
    window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1150);
  };

  // While held: keep petting and spawning hearts.
  useEffect(() => {
    if (!holding) return;
    const id = window.setInterval(() => {
      onPetTick?.();
      spawnHeart();
    }, 260);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  const onPointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!onPoke) return;
    const zone = ((e.target as Element).closest("[data-zone]")?.getAttribute("data-zone") ?? "body") as PetZone;
    onPoke(zone);
    if (zone !== "head") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
    setHolding(true);
    onPetStart?.();
    onPetTick?.();
    spawnHeart();
  };
  const stop = () => {
    if (!holding) return;
    setHolding(false);
    onPetEnd?.();
  };

  const settled = atHome && !walking;
  const sleepy = (mood === "sleeping" || action === "sleep") && !holding;
  const happy = !sleepy && (mood === "celebrate" || petting || holding || HAPPY_ACTIONS.includes(action));
  const eyes: EyeMode = sleepy ? "closed" : happy ? "happy" : "open";
  const studying = mood === "studying" || mood === "focused";
  const quiet = action === "none" || action === "type";
  const glasses = studying && settled && !holding && quiet;
  const typing = settled && !holding && (action === "type" || (studying && action === "none"));
  const fast = action === "type" || mood === "focused";
  const sipping = mood === "break" && settled && action === "none";
  const showBook = settled && !sipping && (quiet || action === "wave" || action === "excited") && action !== "sleep";

  const art: ArtProps = {
    eyes,
    happy,
    glasses,
    paused: mood === "paused",
    bodyAnim: holding
      ? "a-squish"
      : action === "stretch"
        ? "a-stretch-once"
        : sipping
          ? "a-stretch"
          : fast
            ? "a-breathe-fast"
            : "a-breathe",
    headAnim: holding ? "" : action === "eat" || action === "drink" ? "a-nom" : mood === "paused" ? "a-look" : sleepy ? "a-droop" : "",
    tailAnim: sleepy ? "a-tail-slow" : fast || happy ? "a-tail-fast" : "a-tail",
  };

  const moveAnim =
    action === "roll"
      ? "fb o-center a-roll"
      : action === "zoomies"
        ? "fb o-center a-zoomies"
        : action === "excited" || action === "play" || (mood === "celebrate" && !holding)
          ? "a-excited"
          : walking
            ? "a-walk"
            : "";

  const body =
    kind === "puppy" ? (
      <PuppyArt {...art} />
    ) : kind === "bunny" ? (
      <BunnyArt {...art} />
    ) : kind === "shiba" ? (
      <ShibaArt {...art} />
    ) : (
      <CatArt {...art} stripes={petId === "cat-orange"} />
    );

  const pet = (
    <g
      ref={ref}
      className="cat"
      data-coat={COAT[petId]}
      onPointerDown={onPointerDown}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if (!onPoke) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPoke("head");
          onPetTick?.();
          spawnHeart();
        } else if (e.key.toLowerCase() === "w") {
          onPoke("paws");
        } else if (e.key.toLowerCase() === "s") {
          onPoke("body");
        }
      }}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-label={label}
      aria-keyshortcuts={interactive ? "Enter W S" : undefined}
      style={{ cursor: interactive ? (holding ? "grabbing" : "grab") : undefined, touchAction: interactive ? "none" : undefined }}
    >
      {/* generous invisible hit area so small screens can tap easily */}
      {interactive && <rect x="-90" y="-215" width="180" height="222" fill="transparent" data-zone="body" />}
      <ellipse cx="0" cy="2" rx="62" ry="7" style={{ fill: "var(--wood-dark)", opacity: 0.35 }} />

      <g className={moveAnim}>
        {body}

        {showBook && (
          <g data-zone="paws">
            <path d="M-74 -18 L74 -18 L78 0 L-78 0 Z" style={fill("book-2")} />
            <path d="M0 -16 Q-34 -26 -70 -18 L-74 -2 Q-36 -10 0 -2 Z" style={fill("paper")} />
            <path d="M0 -16 Q34 -26 70 -18 L74 -2 Q36 -10 0 -2 Z" style={fill("paper")} />
            <path
              d="M-60 -15 q24 -5 48 0 M-62 -10 q26 -5 52 0 M12 -15 q24 -5 48 0 M10 -10 q26 -5 52 0"
              style={{ ...stroke("muted-foreground"), strokeWidth: 1.2, fill: "none", opacity: 0.4 }}
            />
          </g>
        )}

        {sipping && (
          <g transform="translate(0 -6)">
            <rect x="-12" y="-30" width="24" height="26" rx="5" style={fill("mug")} />
            <rect x="-12" y="-22" width="24" height="6" style={fill("mug-band")} />
            <path d="M12 -24 q10 2 0 14" style={{ ...stroke("mug"), strokeWidth: 4, fill: "none" }} />
            <path className="fb a-steam" d="M-3 -36 q-4 -6 0 -12 q4 -6 0 -12" style={{ ...stroke("paper"), strokeWidth: 2.4, fill: "none", strokeLinecap: "round" }} />
          </g>
        )}

        {/* round little paws */}
        <g data-zone="paws">
          {sipping ? (
            <>
              <ellipse cx="-17" cy="-14" rx="11" ry="9" style={fill("cat-fur")} />
              <ellipse cx="17" cy="-14" rx="11" ry="9" style={fill("cat-fur")} />
            </>
          ) : (
            [-1, 1].map((side) => {
              const waving = side > 0 && (action === "wave" || action === "play");
              const typeCls = typing ? (side < 0 ? (fast ? "a-type-l-fast" : "a-type-l") : fast ? "a-type-r-fast" : "a-type-r") : "";
              const walkCls = walking ? (side < 0 ? "a-type-l" : "a-type-r") : "";
              return (
                <g key={side} className={`fb ${waving ? "o-bottom a-wave" : typeCls || walkCls}`}>
                  <ellipse cx={side * 24} cy="-9" rx="14" ry="10" style={fill("cat-fur")} />
                  <circle cx={side * 24 - 5} cy="-6" r="1.9" style={fill("cat-inner")} />
                  <circle cx={side * 24} cy="-4.5" r="1.9" style={fill("cat-inner")} />
                  <circle cx={side * 24 + 5} cy="-6" r="1.9" style={fill("cat-inner")} />
                </g>
              );
            })
          )}
        </g>
      </g>

      {sleepy && (
        <g pointerEvents="none" style={{ ...fill("muted-foreground"), fontFamily: "var(--font-display)", fontWeight: 600 }}>
          <text x="54" y="-186" fontSize="20" className="fb a-float-up">z</text>
          <text x="64" y="-200" fontSize="15" className="fb a-float-up" style={{ animationDelay: "0.9s" }}>z</text>
          <text x="48" y="-192" fontSize="24" className="fb a-float-up" style={{ animationDelay: "1.7s" }}>Z</text>
        </g>
      )}
      {(petting || mood === "celebrate") && (
        <g pointerEvents="none">
          {[
            [-66, -176, 0],
            [58, -192, 0.4],
            [-30, -206, 0.8],
            [76, -156, 1.2],
          ].map(([x, y, d], i) => (
            <path key={i} className="fb a-float-up" transform={`translate(${x} ${y})`} d={HEART} style={{ ...fill("cat-heart"), animationDelay: `${d}s` }} />
          ))}
        </g>
      )}
      <g pointerEvents="none">
        {hearts.map((h) => (
          <g key={h.id} transform={`translate(${h.x} -150)`}>
            <path className="fb a-heart-pop" d={HEART} style={{ ...fill("cat-heart"), ["--hx" as string]: `${h.dx}px` }} />
          </g>
        ))}
      </g>
      {mood === "celebrate" && (
        <g pointerEvents="none">
          {[
            [-88, -150],
            [90, -120],
            [-70, -60],
            [96, -200],
            [-100, -210],
          ].map(([x, y], i) => (
            <path
              key={i}
              className="fb o-center a-sparkle"
              transform={`translate(${x} ${y})`}
              d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z"
              style={{ ...fill("highlight"), animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );

  if (!standalone) return pet;
  return (
    <svg viewBox="-115 -252 230 264" className="scene h-full w-full" role={label ? "img" : undefined} aria-label={label} aria-hidden={!label}>
      {pet}
    </svg>
  );
}
