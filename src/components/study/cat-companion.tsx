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

/**
 * Dozi's study cat. Drawn in local coordinates with the cat's bottom-center
 * at (0, 0). All motion is CSS (see styles.css) so it stays cheap.
 */
export function CatCompanion({ state, coat, petting = false, standalone = false, onPet, label }: Props) {
  const studying = state === "studying" || state === "focused";
  const fast = state === "focused";
  const eyesClosed = state === "sleeping";
  const happy = state === "celebrate" || petting;

  const bodyAnim =
    state === "celebrate" ? "" : state === "break" ? "a-stretch" : fast ? "a-breathe-fast" : "a-breathe";
  const tailAnim = state === "sleeping" ? "a-tail-slow" : fast || state === "celebrate" ? "a-tail-fast" : "a-tail";
  const headAnim = state === "paused" ? "a-look" : state === "sleeping" ? "a-droop" : "";

  const cat = (
    <g
      className={`cat ${state === "celebrate" ? "fb o-bottom a-bounce" : ""}`}
      data-coat={coat}
      onClick={onPet}
      style={{ cursor: onPet ? "pointer" : undefined }}
      role={onPet ? "button" : undefined}
      aria-label={label}
    >
      {/* soft shadow */}
      <ellipse cx="0" cy="2" rx="64" ry="7" style={{ fill: "var(--cat-line)", opacity: 0.15 }} />

      {/* tail */}
      <g className={`fb ${tailAnim}`} style={{ transformOrigin: "0% 85%" }}>
        <path
          d="M36 -14 C 82 -12, 98 -44, 82 -78 C 76 -90, 62 -86, 67 -74 C 80 -48, 68 -30, 34 -30 Z"
          style={fill("cat-fur")}
        />
        <path d="M80 -80 C 76 -90, 63 -86, 67 -76 C 70 -79, 76 -80, 80 -80 Z" style={fill("cat-fur-dark")} />
      </g>

      {/* body + head breathe together */}
      <g className={`fb o-bottom ${bodyAnim}`}>
        <path d="M-54 0 C -62 -42, -44 -98, 0 -101 C 44 -98, 62 -42, 54 0 Z" style={fill("cat-fur")} />
        <path d="M-50 -30 q8 -4 14 2 M-53 -50 q8 -4 13 2 M50 -30 q-8 -4 -14 2 M53 -50 q-8 -4 -13 2" style={{ ...stroke("cat-fur-dark"), strokeWidth: 4, fill: "none", strokeLinecap: "round" }} />
        <ellipse cx="0" cy="-40" rx="27" ry="35" style={fill("cat-belly")} />

        {/* scarf */}
        <path d="M-36 -98 Q0 -80 36 -98 L36 -87 Q0 -69 -36 -87 Z" style={fill("scarf")} />
        <path d="M14 -84 l10 30 l-12 2 l-6 -30 Z" style={fill("scarf")} />

        {/* head */}
        <g className={`fb ${headAnim}`} style={{ transformOrigin: "50% 100%" }}>
          <g transform="translate(0 -132)">
            <path d="M-44 -14 L-38 -60 L-6 -36 Z" style={fill("cat-fur")} />
            <path d="M44 -14 L38 -60 L6 -36 Z" style={fill("cat-fur")} />
            <path d="M-37 -22 L-34 -49 L-15 -35 Z" style={fill("cat-inner")} />
            <path d="M37 -22 L34 -49 L15 -35 Z" style={fill("cat-inner")} />
            <ellipse cx="0" cy="0" rx="50" ry="41" style={fill("cat-fur")} />
            <path d="M-10 -40 q2 10 0 16 M0 -41 q2 11 0 18 M10 -40 q-2 10 0 16" style={{ ...stroke("cat-fur-dark"), strokeWidth: 3.5, fill: "none", strokeLinecap: "round" }} />
            <ellipse cx="0" cy="13" rx="19" ry="13" style={fill("cat-belly")} />
            <circle cx="-31" cy="11" r="6.5" style={{ ...fill("cat-inner"), opacity: happy ? 0.75 : 0.45 }} />
            <circle cx="31" cy="11" r="6.5" style={{ ...fill("cat-inner"), opacity: happy ? 0.75 : 0.45 }} />

            {/* eyes */}
            {eyesClosed ? (
              <path d="M-26 -2 Q-18 4 -10 -2 M10 -2 Q18 4 26 -2" style={{ ...stroke("cat-line"), strokeWidth: 3, fill: "none", strokeLinecap: "round" }} />
            ) : happy ? (
              <path d="M-26 1 Q-18 -8 -10 1 M10 1 Q18 -8 26 1" style={{ ...stroke("cat-line"), strokeWidth: 3.2, fill: "none", strokeLinecap: "round" }} />
            ) : (
              <g className="fb o-center a-blink">
                <g className={state === "paused" ? "a-pupils" : ""}>
                  <ellipse cx="-18" cy="-2" rx="6.5" ry="8.5" style={fill("cat-eye")} />
                  <ellipse cx="18" cy="-2" rx="6.5" ry="8.5" style={fill("cat-eye")} />
                  <circle cx="-16" cy="-5" r="2.3" style={fill("paper")} />
                  <circle cx="20" cy="-5" r="2.3" style={fill("paper")} />
                </g>
              </g>
            )}

            {/* study glasses */}
            {studying && (
              <g style={{ ...stroke("cat-line"), strokeWidth: 2.2, fill: "none" }}>
                <circle cx="-18" cy="-1" r="12" />
                <circle cx="18" cy="-1" r="12" />
                <path d="M-6 -2 Q0 -6 6 -2" />
              </g>
            )}

            <path d="M-4.5 7 L4.5 7 L0 12 Z" style={fill("cat-inner")} />
            <path d="M0 12 Q-4 17 -9 14 M0 12 Q4 17 9 14" style={{ ...stroke("cat-line"), strokeWidth: 2, fill: "none", strokeLinecap: "round" }} />
            <path d="M-22 12 L-46 8 M-22 16 L-45 18 M22 12 L46 8 M22 16 L45 18" style={{ ...stroke("cat-line"), strokeWidth: 1.4, opacity: 0.55 }} />
          </g>
        </g>
      </g>

      {/* props in front of the body */}
      {studying || state === "idle" || state === "paused" || state === "celebrate" ? (
        <g>
          <path d="M-74 -18 L74 -18 L78 0 L-78 0 Z" style={fill("book-2")} />
          <path d="M0 -16 Q-34 -26 -70 -18 L-74 -2 Q-36 -10 0 -2 Z" style={fill("paper")} />
          <path d="M0 -16 Q34 -26 70 -18 L74 -2 Q36 -10 0 -2 Z" style={fill("paper")} />
          <path d="M-60 -15 q24 -5 48 0 M-62 -10 q26 -5 52 0 M12 -15 q24 -5 48 0 M10 -10 q26 -5 52 0" style={{ ...stroke("muted-foreground"), strokeWidth: 1.2, fill: "none", opacity: 0.4 }} />
          <path d="M0 -16 L0 -2" style={{ ...stroke("laptop-edge"), strokeWidth: 1.2 }} />
        </g>
      ) : null}

      {state === "break" && (
        <g transform="translate(0 -6)">
          <rect x="-12" y="-30" width="24" height="26" rx="5" style={fill("mug")} />
          <rect x="-12" y="-22" width="24" height="6" style={fill("mug-band")} />
          <path d="M12 -24 q10 2 0 14" style={{ ...stroke("mug"), strokeWidth: 4, fill: "none" }} />
          <path className="fb a-steam" d="M-3 -36 q-4 -6 0 -12 q4 -6 0 -12" style={{ ...stroke("paper"), strokeWidth: 2.4, fill: "none", strokeLinecap: "round" }} />
        </g>
      )}

      {/* paws */}
      {state === "break" ? (
        <g>
          <ellipse cx="-16" cy="-14" rx="10" ry="8" style={fill("cat-fur")} />
          <ellipse cx="16" cy="-14" rx="10" ry="8" style={fill("cat-fur")} />
        </g>
      ) : (
        <g>
          <g className={`fb ${studying ? (fast ? "a-type-l-fast" : "a-type-l") : ""}`}>
            <ellipse cx="-24" cy="-8" rx="13" ry="8" style={fill("cat-fur")} />
            <path d="M-29 -4 v-3 M-24 -3 v-3 M-19 -4 v-3" style={{ ...stroke("cat-fur-dark"), strokeWidth: 1.5 }} />
          </g>
          <g className={`fb ${studying ? (fast ? "a-type-r-fast" : "a-type-r") : ""}`}>
            <ellipse cx="24" cy="-8" rx="13" ry="8" style={fill("cat-fur")} />
            <path d="M19 -4 v-3 M24 -3 v-3 M29 -4 v-3" style={{ ...stroke("cat-fur-dark"), strokeWidth: 1.5 }} />
          </g>
        </g>
      )}

      {/* floating extras */}
      {state === "sleeping" && (
        <g style={{ ...fill("muted-foreground"), fontFamily: "var(--font-display)", fontWeight: 600 }}>
          <text x="46" y="-170" fontSize="20" className="fb a-float-up">z</text>
          <text x="56" y="-184" fontSize="15" className="fb a-float-up" style={{ animationDelay: "0.9s" }}>z</text>
          <text x="40" y="-176" fontSize="24" className="fb a-float-up" style={{ animationDelay: "1.7s" }}>Z</text>
        </g>
      )}
      {(petting || state === "celebrate") && (
        <g>
          {[
            [-60, -170, 0],
            [52, -186, 0.4],
            [-30, -200, 0.8],
            [70, -150, 1.2],
          ].map(([x, y, d], i) => (
            <path
              key={i}
              className="fb a-float-up"
              transform={`translate(${x} ${y})`}
              d="M0 4 C -8 -4, -4 -12, 0 -6 C 4 -12, 8 -4, 0 4 Z"
              style={{ ...fill("accent"), animationDelay: `${d}s` }}
            />
          ))}
        </g>
      )}
      {state === "celebrate" && (
        <g>
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
    <svg viewBox="-110 -230 220 245" className="scene h-full w-full" aria-hidden={!label}>
      {cat}
    </svg>
  );
}
