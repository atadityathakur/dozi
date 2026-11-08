/** Shared drawing helpers for the companion pets (SVG, local coords). */

export const fill = (name: string) => ({ fill: `var(--${name})` });
export const stroke = (name: string) => ({ stroke: `var(--${name})` });

export type EyeMode = "open" | "closed" | "happy";

export interface ArtProps {
  eyes: EyeMode;
  happy: boolean;
  glasses: boolean;
  paused: boolean;
  bodyAnim: string;
  headAnim: string;
  tailAnim: string;
}

const LINE = { strokeLinecap: "round" as const, fill: "none" };

export function Eyes({
  mode,
  variant,
  paused,
  spread = 26,
  y = 2,
  size = 1,
}: {
  mode: EyeMode;
  variant: "cat" | "dot";
  paused: boolean;
  spread?: number;
  y?: number;
  size?: number;
}) {
  const w = 12 * size;
  if (mode === "closed") {
    return (
      <path
        d={`M${-spread - w} ${y} Q${-spread} ${y + 9} ${-spread + w} ${y} M${spread - w} ${y} Q${spread} ${y + 9} ${spread + w} ${y}`}
        style={{ ...stroke("cat-line"), strokeWidth: 3.4, ...LINE }}
      />
    );
  }
  if (mode === "happy") {
    return (
      <path
        d={`M${-spread - w} ${y + 4} Q${-spread} ${y - 10} ${-spread + w} ${y + 4} M${spread - w} ${y + 4} Q${spread} ${y - 10} ${spread + w} ${y + 4}`}
        style={{ ...stroke("cat-line"), strokeWidth: 3.8, ...LINE }}
      />
    );
  }
  const one = (cx: number) =>
    variant === "cat" ? (
      <g key={cx}>
        <ellipse cx={cx} cy={y} rx={14.5 * size} ry={17.5 * size} style={fill("cat-eye")} />
        <g className="cat-track-eyes">
          <ellipse cx={cx} cy={y + 2} rx={10 * size} ry={13 * size} style={fill("cat-iris")} />
          <ellipse cx={cx} cy={y + 2} rx={5 * size} ry={8 * size} style={fill("cat-eye")} />
          <circle cx={cx + 5 * size} cy={y - 7 * size} r={5.2 * size} style={fill("cat-shine")} />
          <circle cx={cx - 4.5 * size} cy={y + 7 * size} r={2.3 * size} style={{ ...fill("cat-shine"), opacity: 0.85 }} />
        </g>
      </g>
    ) : (
      <g key={cx} className="cat-track-eyes">
        <ellipse cx={cx} cy={y + 2} rx={10.5 * size} ry={12 * size} style={fill("cat-eye")} />
        <circle cx={cx + 3.8 * size} cy={y - 3 * size} r={4.2 * size} style={fill("cat-shine")} />
        <circle cx={cx - 3.6 * size} cy={y + 6 * size} r={1.9 * size} style={{ ...fill("cat-shine"), opacity: 0.85 }} />
      </g>
    );
  return (
    <g className="fb o-center a-blink">
      <g className={paused ? "a-pupils" : ""}>
        {one(-spread)}
        {one(spread)}
      </g>
    </g>
  );
}

export function Glasses({ spread = 26, y = 2 }: { spread?: number; y?: number }) {
  return (
    <g style={{ ...stroke("cat-line"), strokeWidth: 2.4, fill: "none" }}>
      <circle cx={-spread} cy={y} r="20" style={{ fill: "var(--cat-shine)", fillOpacity: 0.08 }} />
      <circle cx={spread} cy={y} r="20" style={{ fill: "var(--cat-shine)", fillOpacity: 0.08 }} />
      <path d={`M${-spread + 20} ${y - 2} Q0 ${y - 7} ${spread - 20} ${y - 2}`} />
    </g>
  );
}

export function Blush({ happy, x = 44, y = 18 }: { happy: boolean; x?: number; y?: number }) {
  const o = happy ? 0.85 : 0.5;
  return (
    <g>
      <ellipse cx={-x} cy={y} rx="10" ry="6" style={{ ...fill("cat-blush"), opacity: o }} />
      <ellipse cx={x} cy={y} rx="10" ry="6" style={{ ...fill("cat-blush"), opacity: o }} />
    </g>
  );
}

export function Whiskers({ y = 14, opacity = 0.45 }: { y?: number; opacity?: number }) {
  return (
    <path
      d={`M-40 ${y} L-74 ${y - 6} M-40 ${y + 6} L-73 ${y + 8} M40 ${y} L74 ${y - 6} M40 ${y + 6} L73 ${y + 8}`}
      style={{ ...stroke("cat-line"), strokeWidth: 1.6, strokeLinecap: "round", opacity }}
    />
  );
}

/** A dog-style mouth: little "w" line, with a tongue when happy. */
export function DogMouth({ happy, y = 26 }: { happy: boolean; y?: number }) {
  return (
    <g>
      {happy && <path d={`M-6 ${y + 1} Q0 ${y + 16} 6 ${y + 1} Z`} style={fill("cat-tongue")} />}
      <path
        d={`M0 ${y - 4} L0 ${y} M0 ${y} Q-4 ${y + 5} -9 ${y + 2} M0 ${y} Q4 ${y + 5} 9 ${y + 2}`}
        style={{ ...stroke("cat-line"), strokeWidth: 2.2, ...LINE }}
      />
    </g>
  );
}
