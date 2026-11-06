import { useEffect, useRef, useState } from "react";

import type { CoatId } from "@/lib/types";

export type CatState = "idle" | "studying" | "focused" | "break" | "celebrate" | "paused" | "sleeping";

const fill = (name: string) => ({ fill: `var(--${name})` });
const stroke = (name: string) => ({ stroke: `var(--${name})` });

interface Props {
  state: CatState;
  coat: CoatId;
  petting?: boolean;
  /** Render as a standalone <svg> (previews) instead of a <g> inside the scene. */
  standalone?: boolean;
  onPet?: () => void;
  label?: string;
}

const HEART = "M0 5 C -9 -3, -5 -12, 0 -6 C 5 -12, 9 -3, 0 5 Z";

/**
 * Dozi's study cat — a round, big-eyed chibi kitty. Drawn in local
 * coordinates with the cat's bottom-center at (0, 0). Eyes follow the
 * pointer; click & hold to pet (squish + purr + hearts).
 */
export function CatCompanion({ state, coat, petting = false, standalone = false, onPet, label }: Props) {
  const ref = useRef<SVGGElement>(null);
  const [holding, setHolding] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; dx: number }[]>([]);
  const heartId = useRef(0);

  // Eyes + head gently follow the pointer.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
    const reset = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const spawnHeart = () => {
    const id = ++heartId.current;
    const heart = { id, x: Math.round(Math.random() * 90 - 45), dx: Math.round(Math.random() * 40 - 20) };
    setHearts((h) => [...h.slice(-10), heart]);
    window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1150);
  };

  // While held: keep purring and spawning hearts.
  useEffect(() => {
    if (!holding) return;
    const id = window.setInterval(() => {
      onPet?.();
      spawnHeart();
    }, 260);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  const startPet = (e: React.PointerEvent<SVGGElement>) => {
    if (!onPet) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
    setHolding(true);
    onPet();
    spawnHeart();
  };
  const stopPet = () => setHolding(false);

  const studying = state === "studying" || state === "focused";
  const fast = state === "focused";
  const eyesClosed = state === "sleeping" && !holding;
  const happy = state === "celebrate" || petting || holding;

  const bodyAnim = holding
    ? "a-squish"
    : state === "celebrate"
      ? ""
      : state === "break"
        ? "a-stretch"
        : fast
          ? "a-breathe-fast"
          : "a-breathe";
  const tailAnim = state === "sleeping" ? "a-tail-slow" : fast || happy ? "a-tail-fast" : "a-tail";
  const headAnim = holding ? "" : state === "paused" ? "a-look" : state === "sleeping" ? "a-droop" : "";

  const ear = (side: 1 | -1, late: boolean) => (
    <g className={`fb o-bottom ${late ? "a-ear-twitch-late" : "a-ear-twitch"}`}>
      <path
        transform={side === 1 ? "scale(-1 1)" : undefined}
        d="M-58 -18 C -66 -58, -62 -82, -50 -82 C -38 -82, -22 -62, -12 -46 Z"
        style={fill("cat-fur")}
      />
      <path
        transform={side === 1 ? "scale(-1 1)" : undefined}
        d="M-50 -34 C -55 -58, -52 -70, -47 -70 C -40 -70, -31 -58, -25 -47 Z"
        style={fill("cat-inner")}
      />
    </g>
  );

  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy="2" rx="14.5" ry="17.5" style={fill("cat-eye")} />
      <g className="cat-track-eyes">
        <ellipse cx={cx} cy="4" rx="10" ry="13" style={fill("cat-iris")} />
        <ellipse cx={cx} cy="4" rx="5" ry="8" style={fill("cat-eye")} />
        <circle cx={cx + 5} cy="-5" r="5.2" style={fill("cat-shine")} />
        <circle cx={cx - 4.5} cy="9" r="2.3" style={{ ...fill("cat-shine"), opacity: 0.85 }} />
      </g>
    </g>
  );

  const cat = (
    <g
      ref={ref}
      className={`cat ${state === "celebrate" && !holding ? "fb o-bottom a-bounce" : ""}`}
      data-coat={coat}
      onPointerDown={startPet}
      onPointerUp={stopPet}
      onPointerCancel={stopPet}
      onLostPointerCapture={stopPet}
      onKeyDown={(e) => {
        if (onPet && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onPet();
          spawnHeart();
        }
      }}
      tabIndex={onPet ? 0 : undefined}
      style={{ cursor: onPet ? (holding ? "grabbing" : "grab") : undefined, outline: "none", touchAction: "none" }}
      role={onPet ? "button" : undefined}
      aria-label={label}
    >
      {/* soft shadow */}
      <ellipse cx="0" cy="2" rx="62" ry="7" style={{ fill: "var(--wood-dark)", opacity: 0.35 }} />

      {/* tail */}
      <g className={`fb ${tailAnim}`} style={{ transformOrigin: "0% 90%" }}>
        <path
          d="M34 -10 C 74 -8, 90 -36, 78 -64 C 72 -78, 84 -90, 94 -80"
          style={{ ...stroke("cat-fur"), strokeWidth: 16, fill: "none", strokeLinecap: "round" }}
        />
        <path
          d="M84 -86 C 89 -88, 93 -85, 94 -80"
          style={{ ...stroke("cat-fur-dark"), strokeWidth: 16, fill: "none", strokeLinecap: "round" }}
        />
      </g>

      {/* body + head breathe together */}
      <g className={`fb o-bottom ${bodyAnim}`}>
        <path d="M-50 0 C -58 -30, -48 -80, 0 -82 C 48 -80, 58 -30, 50 0 Z" style={fill("cat-fur")} />
        <ellipse cx="0" cy="-32" rx="26" ry="30" style={fill("cat-belly")} />

        {/* collar + bell */}
        <path d="M-38 -70 Q0 -54 38 -70 L37 -61 Q0 -45 -37 -61 Z" style={fill("scarf")} />
        <circle cx="0" cy="-48" r="6.5" style={fill("highlight")} />
        <path d="M-3.5 -46 H3.5" style={{ ...stroke("highlight-foreground"), strokeWidth: 1.4, strokeLinecap: "round", opacity: 0.6 }} />

        {/* head */}
        <g className={`fb ${headAnim}`} style={{ transformOrigin: "50% 100%" }}>
          <g transform="translate(0 -128)">
            <g className="cat-track-head">
              {ear(-1, false)}
              {ear(1, true)}
              <ellipse cx="0" cy="0" rx="64" ry="54" style={fill("cat-fur")} />
              {/* cheek fluff */}
              <path d="M-62 14 l-8 4 l7 3 l-5 5 l9 -1 M62 14 l8 4 l-7 3 l5 5 l-9 -1" style={fill("cat-fur")} />
              {/* forehead marks */}
              <path
                d="M-8 -50 q1 8 0 12 M0 -52 q1 9 0 14 M8 -50 q-1 8 0 12"
                style={{ ...stroke("cat-fur-dark"), strokeWidth: 3.5, fill: "none", strokeLinecap: "round", opacity: 0.8 }}
              />
              {/* muzzle */}
              <ellipse cx="0" cy="22" rx="20" ry="13" style={{ ...fill("cat-belly"), opacity: 0.9 }} />

              {/* blush */}
              <ellipse cx="-44" cy="18" rx="10" ry="6" style={{ ...fill("cat-blush"), opacity: happy ? 0.85 : 0.5 }} />
              <ellipse cx="44" cy="18" rx="10" ry="6" style={{ ...fill("cat-blush"), opacity: happy ? 0.85 : 0.5 }} />

              {/* eyes */}
              {eyesClosed ? (
                <path
                  d="M-38 2 Q-26 11 -14 2 M14 2 Q26 11 38 2"
                  style={{ ...stroke("cat-line"), strokeWidth: 3.4, fill: "none", strokeLinecap: "round" }}
                />
              ) : happy ? (
                <path
                  d="M-38 6 Q-26 -8 -14 6 M14 6 Q26 -8 38 6"
                  style={{ ...stroke("cat-line"), strokeWidth: 3.8, fill: "none", strokeLinecap: "round" }}
                />
              ) : (
                <g className="fb o-center a-blink">
                  <g className={state === "paused" ? "a-pupils" : ""}>
                    {eye(-26)}
                    {eye(26)}
                  </g>
                </g>
              )}

              {/* round study glasses */}
              {studying && !holding && (
                <g style={{ ...stroke("cat-line"), strokeWidth: 2.4, fill: "none" }}>
                  <circle cx="-26" cy="2" r="20" style={{ fill: "var(--cat-shine)", fillOpacity: 0.08 }} />
                  <circle cx="26" cy="2" r="20" style={{ fill: "var(--cat-shine)", fillOpacity: 0.08 }} />
                  <path d="M-6 0 Q0 -5 6 0" />
                </g>
              )}

              {/* nose + mouth */}
              <path d="M-5.5 15 Q0 12 5.5 15 Q2.5 21 0 21 Q-2.5 21 -5.5 15 Z" style={fill("cat-inner")} />
              {happy ? (
                <path d="M-7 23 Q0 35 7 23 Q0 26 -7 23 Z" style={fill("cat-inner")} />
              ) : (
                <path
                  d="M0 21 Q-3 27 -8 25 M0 21 Q3 27 8 25"
                  style={{ ...stroke("cat-line"), strokeWidth: 2.2, fill: "none", strokeLinecap: "round" }}
                />
              )}

              {/* whiskers */}
              <path
                d="M-40 14 L-74 8 M-40 20 L-73 22 M40 14 L74 8 M40 20 L73 22"
                style={{ ...stroke("cat-line"), strokeWidth: 1.6, strokeLinecap: "round", opacity: 0.45 }}
              />
            </g>
          </g>
        </g>
      </g>

      {/* props in front of the body */}
      {studying || state === "idle" || state === "paused" || state === "celebrate" ? (
        <g>
          <path d="M-74 -18 L74 -18 L78 0 L-78 0 Z" style={fill("book-2")} />
          <path d="M0 -16 Q-34 -26 -70 -18 L-74 -2 Q-36 -10 0 -2 Z" style={fill("paper")} />
          <path d="M0 -16 Q34 -26 70 -18 L74 -2 Q36 -10 0 -2 Z" style={fill("paper")} />
          <path
            d="M-60 -15 q24 -5 48 0 M-62 -10 q26 -5 52 0 M12 -15 q24 -5 48 0 M10 -10 q26 -5 52 0"
            style={{ ...stroke("muted-foreground"), strokeWidth: 1.2, fill: "none", opacity: 0.4 }}
          />
          <path d="M0 -16 L0 -2" style={{ ...stroke("laptop-edge"), strokeWidth: 1.2 }} />
        </g>
      ) : null}

      {state === "break" && (
        <g transform="translate(0 -6)">
          <rect x="-12" y="-30" width="24" height="26" rx="5" style={fill("mug")} />
          <rect x="-12" y="-22" width="24" height="6" style={fill("mug-band")} />
          <path d="M12 -24 q10 2 0 14" style={{ ...stroke("mug"), strokeWidth: 4, fill: "none" }} />
          <path
            className="fb a-steam"
            d="M-3 -36 q-4 -6 0 -12 q4 -6 0 -12"
            style={{ ...stroke("paper"), strokeWidth: 2.4, fill: "none", strokeLinecap: "round" }}
          />
        </g>
      )}

      {/* round little paws */}
      {state === "break" ? (
        <g>
          <ellipse cx="-17" cy="-14" rx="11" ry="9" style={fill("cat-fur")} />
          <ellipse cx="17" cy="-14" rx="11" ry="9" style={fill("cat-fur")} />
        </g>
      ) : (
        <g>
          {[-1, 1].map((side) => (
            <g
              key={side}
              className={`fb ${studying && !holding ? (side < 0 ? (fast ? "a-type-l-fast" : "a-type-l") : fast ? "a-type-r-fast" : "a-type-r") : ""}`}
            >
              <ellipse cx={side * 24} cy="-9" rx="14" ry="10" style={fill("cat-fur")} />
              <circle cx={side * 24 - 5} cy="-6" r="1.9" style={fill("cat-inner")} />
              <circle cx={side * 24} cy="-4.5" r="1.9" style={fill("cat-inner")} />
              <circle cx={side * 24 + 5} cy="-6" r="1.9" style={fill("cat-inner")} />
            </g>
          ))}
        </g>
      )}

      {/* floating extras */}
      {state === "sleeping" && !holding && (
        <g style={{ ...fill("muted-foreground"), fontFamily: "var(--font-display)", fontWeight: 600 }}>
          <text x="54" y="-186" fontSize="20" className="fb a-float-up">z</text>
          <text x="64" y="-200" fontSize="15" className="fb a-float-up" style={{ animationDelay: "0.9s" }}>z</text>
          <text x="48" y="-192" fontSize="24" className="fb a-float-up" style={{ animationDelay: "1.7s" }}>Z</text>
        </g>
      )}
      {(petting || state === "celebrate") && (
        <g pointerEvents="none">
          {[
            [-66, -176, 0],
            [58, -192, 0.4],
            [-30, -206, 0.8],
            [76, -156, 1.2],
          ].map(([x, y, d], i) => (
            <path
              key={i}
              className="fb a-float-up"
              transform={`translate(${x} ${y})`}
              d={HEART}
              style={{ ...fill("cat-heart"), animationDelay: `${d}s` }}
            />
          ))}
        </g>
      )}
      <g pointerEvents="none">
        {hearts.map((h) => (
          <g key={h.id} transform={`translate(${h.x} -150)`}>
            <path
              className="fb a-heart-pop"
              d={HEART}
              style={{ ...fill("cat-heart"), ["--hx" as string]: `${h.dx}px` }}
            />
          </g>
        ))}
      </g>
      {state === "celebrate" && (
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

  if (!standalone) return cat;
  return (
    <svg viewBox="-110 -232 220 247" className="scene h-full w-full" aria-hidden={!label}>
      {cat}
    </svg>
  );
}
