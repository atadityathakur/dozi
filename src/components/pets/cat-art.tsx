import { Blush, Eyes, Glasses, Whiskers, fill, stroke, type ArtProps } from "./parts";

/** Round chibi kitty. `stripes` adds tabby markings (orange cat). */
export function CatArt({ eyes, happy, glasses, paused, bodyAnim, headAnim, tailAnim, stripes }: ArtProps & { stripes?: boolean }) {
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
  const stripe = { ...stroke("cat-fur-dark"), strokeWidth: 5, fill: "none", strokeLinecap: "round" as const };

  return (
    <g>
      <g data-zone="body" className={`fb ${tailAnim}`} style={{ transformOrigin: "0% 90%" }}>
        <path
          d="M34 -10 C 74 -8, 90 -36, 78 -64 C 72 -78, 84 -90, 94 -80"
          style={{ ...stroke("cat-fur"), strokeWidth: 16, fill: "none", strokeLinecap: "round" }}
        />
        {stripes && <path d="M66 -22 l10 6 M80 -44 l11 2 M78 -66 l10 -3" style={{ ...stripe, strokeWidth: 4 }} />}
        <path
          d="M84 -86 C 89 -88, 93 -85, 94 -80"
          style={{ ...stroke("cat-fur-dark"), strokeWidth: 16, fill: "none", strokeLinecap: "round" }}
        />
      </g>

      <g className={`fb o-bottom ${bodyAnim}`}>
        <g data-zone="body">
          <path d="M-50 0 C -58 -30, -48 -80, 0 -82 C 48 -80, 58 -30, 50 0 Z" style={fill("cat-fur")} />
          {stripes && <path d="M-50 -40 q10 2 14 10 M-52 -22 q10 2 13 9 M50 -40 q-10 2 -14 10 M52 -22 q-10 2 -13 9" style={stripe} />}
          <ellipse cx="0" cy="-32" rx="26" ry="30" style={fill("cat-belly")} />
          <path d="M-38 -70 Q0 -54 38 -70 L37 -61 Q0 -45 -37 -61 Z" style={fill("scarf")} />
          <circle cx="0" cy="-48" r="6.5" style={fill("highlight")} />
          <path d="M-3.5 -46 H3.5" style={{ ...stroke("highlight-foreground"), strokeWidth: 1.4, strokeLinecap: "round", opacity: 0.6 }} />
        </g>

        <g data-zone="head" className={`fb ${headAnim}`} style={{ transformOrigin: "50% 100%" }}>
          <g transform="translate(0 -128)">
            <g className="cat-track-head">
              {ear(-1, false)}
              {ear(1, true)}
              <ellipse cx="0" cy="0" rx="64" ry="54" style={fill("cat-fur")} />
              <path d="M-62 14 l-8 4 l7 3 l-5 5 l9 -1 M62 14 l8 4 l-7 3 l5 5 l-9 -1" style={fill("cat-fur")} />
              <path
                d="M-8 -50 q1 8 0 12 M0 -52 q1 9 0 14 M8 -50 q-1 8 0 12"
                style={{ ...stroke("cat-fur-dark"), strokeWidth: 3.5, fill: "none", strokeLinecap: "round", opacity: 0.8 }}
              />
              {stripes && <path d="M-62 -6 l12 2 M-60 6 l10 1 M62 -6 l-12 2 M60 6 l-10 1" style={{ ...stripe, strokeWidth: 3.5 }} />}
              <ellipse cx="0" cy="22" rx="20" ry="13" style={{ ...fill("cat-belly"), opacity: 0.9 }} />
              <Blush happy={happy} />
              <Eyes mode={eyes} variant="cat" paused={paused} />
              {glasses && <Glasses />}
              <path d="M-5.5 15 Q0 12 5.5 15 Q2.5 21 0 21 Q-2.5 21 -5.5 15 Z" style={fill("cat-inner")} />
              {happy ? (
                <path d="M-7 23 Q0 35 7 23 Q0 26 -7 23 Z" style={fill("cat-inner")} />
              ) : (
                <path
                  d="M0 21 Q-3 27 -8 25 M0 21 Q3 27 8 25"
                  style={{ ...stroke("cat-line"), strokeWidth: 2.2, fill: "none", strokeLinecap: "round" }}
                />
              )}
              <Whiskers />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
