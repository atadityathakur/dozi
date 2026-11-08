import { Blush, Eyes, Glasses, Whiskers, fill, stroke, type ArtProps } from "./parts";

/** Soft cream bunny: tall ears (one floppy), wiggly nose and a cotton tail. */
export function BunnyArt({ eyes, happy, glasses, paused, bodyAnim, headAnim }: ArtProps) {
  return (
    <g>
      <g data-zone="body">
        <circle cx="46" cy="-16" r="15" style={fill("cat-belly")} />
        <circle cx="50" cy="-20" r="7" style={{ ...fill("cat-shine"), opacity: 0.6 }} />
      </g>

      <g className={`fb o-bottom ${bodyAnim}`}>
        <g data-zone="body">
          <path d="M-48 0 C -58 -30, -46 -78, 0 -80 C 46 -78, 58 -30, 48 0 Z" style={fill("cat-fur")} />
          <ellipse cx="0" cy="-30" rx="26" ry="28" style={fill("cat-belly")} />
          <path d="M-34 -68 Q0 -54 34 -68 L33 -60 Q0 -46 -33 -60 Z" style={fill("scarf")} />
          <path d="M-8 -56 l8 5 l8 -5 l-2 9 l-6 -3 l-6 3 z" style={fill("highlight")} />
        </g>

        <g data-zone="head" className={`fb ${headAnim}`} style={{ transformOrigin: "50% 100%" }}>
          <g transform="translate(0 -122)">
            <g className="cat-track-head">
              {/* tall ear */}
              <g className="fb o-bottom a-ear-twitch">
                <path d="M-36 -36 C -46 -80, -40 -120, -24 -120 C -8 -120, -10 -80, -14 -40 Z" style={fill("cat-fur")} />
                <path d="M-30 -44 C -37 -78, -33 -106, -24 -106 C -16 -106, -17 -78, -19 -46 Z" style={fill("cat-inner")} />
              </g>
              {/* floppy ear */}
              <g className="fb o-bottom a-ear-flop-late">
                <path d="M14 -40 C 20 -80, 52 -96, 70 -84 C 82 -74, 60 -56, 34 -36 Z" style={fill("cat-fur")} />
                <path d="M22 -44 C 30 -74, 52 -84, 64 -80 C 70 -74, 54 -60, 34 -44 Z" style={fill("cat-inner")} />
              </g>
              <ellipse cx="0" cy="0" rx="56" ry="49" style={fill("cat-fur")} />
              <path d="M-54 12 l-7 4 l6 3 l-4 5 l8 -1 M54 12 l7 4 l-6 3 l4 5 l-8 -1" style={fill("cat-fur")} />
              <ellipse cx="0" cy="22" rx="18" ry="12" style={{ ...fill("cat-belly"), opacity: 0.9 }} />
              <Blush happy={happy} x={38} y={16} />
              <Eyes mode={eyes} variant="dot" paused={paused} spread={24} y={0} size={0.95} />
              {glasses && <Glasses spread={24} y={0} />}
              <g className="a-nose">
                <path d="M-5 14 Q0 11 5 14 Q2 19 0 19 Q-2 19 -5 14 Z" style={fill("cat-inner")} />
              </g>
              <path d="M0 19 L0 23 M0 23 Q-3 27 -7 25 M0 23 Q3 27 7 25" style={{ ...stroke("cat-line"), strokeWidth: 2, fill: "none", strokeLinecap: "round" }} />
              <rect x="-4" y="25" width="8" height="6" rx="1.5" style={{ ...fill("cat-shine"), stroke: "var(--cat-line)", strokeWidth: 0.8 }} />
              <Whiskers y={16} opacity={0.35} />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
