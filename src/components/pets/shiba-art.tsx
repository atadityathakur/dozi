import { Blush, DogMouth, Eyes, Glasses, fill, stroke, type ArtProps } from "./parts";

/** Shiba Inu: fox-red coat, cream mask, eyebrow dots and a curly tail. */
export function ShibaArt({ eyes, happy, glasses, paused, bodyAnim, headAnim, tailAnim }: ArtProps) {
  const ear = (side: 1 | -1) => (
    <g className={`fb o-bottom ${side < 0 ? "a-ear-twitch" : "a-ear-twitch-late"}`}>
      <path transform={side === 1 ? "scale(-1 1)" : undefined} d="M-58 -16 L-52 -78 L-12 -46 Z" style={{ ...fill("cat-fur"), strokeLinejoin: "round", stroke: "var(--cat-fur)", strokeWidth: 6 }} />
      <path transform={side === 1 ? "scale(-1 1)" : undefined} d="M-49 -30 L-46 -64 L-24 -46 Z" style={fill("cat-belly")} />
    </g>
  );
  return (
    <g>
      <g data-zone="body" className={`fb ${happy ? "a-wag" : tailAnim === "a-tail-slow" ? "a-tail-slow" : "a-wag-slow"}`} style={{ transformOrigin: "0% 100%" }}>
        <path d="M36 -36 C 70 -46, 76 -92, 50 -96 C 30 -98, 30 -72, 48 -74" style={{ ...stroke("cat-fur"), strokeWidth: 17, fill: "none", strokeLinecap: "round" }} />
        <path d="M44 -84 C 38 -80, 40 -74, 48 -74" style={{ ...stroke("cat-belly"), strokeWidth: 9, fill: "none", strokeLinecap: "round" }} />
      </g>

      <g className={`fb o-bottom ${bodyAnim}`}>
        <g data-zone="body">
          <path d="M-50 0 C -58 -30, -48 -80, 0 -82 C 48 -80, 58 -30, 50 0 Z" style={fill("cat-fur")} />
          <path d="M-28 0 C -32 -30, -22 -66, 0 -68 C 22 -66, 32 -30, 28 0 Z" style={fill("cat-belly")} />
          <path d="M-38 -70 Q0 -54 38 -70 L37 -61 Q0 -45 -37 -61 Z" style={fill("scarf")} />
          <circle cx="0" cy="-49" r="6" style={fill("highlight")} />
        </g>

        <g data-zone="head" className={`fb ${headAnim || "a-tilt"}`} style={{ transformOrigin: "50% 100%" }}>
          <g transform="translate(0 -128)">
            <g className="cat-track-head">
              {ear(-1)}
              {ear(1)}
              <ellipse cx="0" cy="0" rx="62" ry="52" style={fill("cat-fur")} />
              <path
                d="M-60 10 C -50 -8, -30 -2, -14 -8 C -6 -12, 6 -12, 14 -8 C 30 -2, 50 -8, 60 10 C 56 42, 26 54, 0 54 C -26 54, -56 42, -60 10 Z"
                style={fill("cat-belly")}
              />
              <ellipse cx="-27" cy="-22" rx="7" ry="4" style={fill("cat-belly")} />
              <ellipse cx="27" cy="-22" rx="7" ry="4" style={fill("cat-belly")} />
              <Blush happy={happy} x={42} y={20} />
              <Eyes mode={eyes} variant="dot" paused={paused} y={0} size={0.85} />
              {glasses && <Glasses y={0} />}
              <path d="M-8 12 Q0 8 8 12 Q5 20 0 20 Q-5 20 -8 12 Z" style={fill("cat-eye")} />
              <DogMouth happy={happy} y={25} />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
