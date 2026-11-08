import { Blush, DogMouth, Eyes, Glasses, fill, stroke, type ArtProps } from "./parts";

/** Brown puppy with floppy ears, an eye patch and a waggy tail. */
export function PuppyArt({ eyes, happy, glasses, paused, bodyAnim, headAnim, tailAnim }: ArtProps) {
  const ear = (side: 1 | -1) => (
    <g className={`fb o-top ${side < 0 ? "a-ear-flop" : "a-ear-flop-late"}`}>
      <path
        transform={side === 1 ? "scale(-1 1)" : undefined}
        d="M-46 -40 C -78 -40, -90 0, -78 30 C -70 48, -50 42, -46 22 C -42 4, -36 -20, -46 -40 Z"
        style={fill("cat-fur-dark")}
      />
    </g>
  );
  return (
    <g>
      <g data-zone="body" className={`fb ${happy ? "a-wag" : tailAnim}`} style={{ transformOrigin: "0% 100%" }}>
        <path d="M38 -16 C 58 -20, 68 -40, 62 -60" style={{ ...stroke("cat-fur"), strokeWidth: 13, fill: "none", strokeLinecap: "round" }} />
        <path d="M63 -52 C 64 -56, 63 -59, 62 -60" style={{ ...stroke("cat-belly"), strokeWidth: 13, fill: "none", strokeLinecap: "round" }} />
      </g>

      <g className={`fb o-bottom ${bodyAnim}`}>
        <g data-zone="body">
          <path d="M-52 0 C -60 -32, -50 -80, 0 -82 C 50 -80, 60 -32, 52 0 Z" style={fill("cat-fur")} />
          <ellipse cx="0" cy="-30" rx="27" ry="30" style={fill("cat-belly")} />
          <path d="M-38 -70 Q0 -54 38 -70 L37 -61 Q0 -45 -37 -61 Z" style={fill("scarf")} />
          <path d="M-6 -52 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0" style={fill("highlight")} />
        </g>

        <g data-zone="head" className={`fb ${headAnim}`} style={{ transformOrigin: "50% 100%" }}>
          <g transform="translate(0 -126)">
            <g className="cat-track-head">
              <ellipse cx="0" cy="0" rx="60" ry="52" style={fill("cat-fur")} />
              {ear(-1)}
              {ear(1)}
              <ellipse cx="-26" cy="-2" rx="21" ry="19" style={{ ...fill("cat-fur-dark"), opacity: 0.75 }} />
              <path d="M-6 -50 Q0 -30 6 -50 Z" style={{ ...fill("cat-belly"), opacity: 0.8 }} />
              <ellipse cx="0" cy="22" rx="27" ry="19" style={fill("cat-belly")} />
              <Blush happy={happy} x={42} y={20} />
              <Eyes mode={eyes} variant="dot" paused={paused} y={0} />
              {glasses && <Glasses y={0} />}
              <path d="M-10 11 Q0 6 10 11 Q7 21 0 21 Q-7 21 -10 11 Z" style={fill("cat-eye")} />
              <ellipse cx="-3" cy="11" rx="3" ry="1.6" style={{ ...fill("cat-shine"), opacity: 0.6 }} />
              <DogMouth happy={happy} y={26} />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
