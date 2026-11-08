/**
 * Audio catalog. All default music and ambience is generated live in the
 * browser (original, royalty-free). To use a recorded file instead, give a
 * track or layer a `src` (e.g. "/audio/my-track.mp3" in /public). Files that
 * fail to load are marked unavailable in the player instead of pretending to play.
 */

export type MusicStyle = "lofi" | "piano" | "pluck" | "pad";
export type SoundCategory = "lofi" | "nature" | "cafe" | "relax";

/**
 * Flavour of a lo-fi track (only used when style === "lofi"):
 *  classic  – the original pattern
 *  jazzy    – busier chord comping and a livelier piano melody
 *  dusty    – heavy vinyl crackle, darker and slower
 *  chillhop – boom-bap kick pattern, walking bass, steady hats
 *  sleepy   – drumless, sparse piano, extra soft
 *  tape     – Rhodes pitch wobble, like a warped cassette
 */
export type LofiVariant = "classic" | "jazzy" | "dusty" | "chillhop" | "sleepy" | "tape";

export interface TrackDef {
  id: string;
  title: string;
  category: Extract<SoundCategory, "lofi" | "relax">;
  mood: string;
  style: MusicStyle;
  /** Lo-fi flavour. Defaults to "classic". */
  variant?: LofiVariant;
  bpm: number;
  /** Each chord is a list of MIDI notes; one chord per bar. */
  chords: number[][];
  /** Low-pass cutoff of the music bus — lower is warmer/darker. */
  tone: number;
  drums: number; // 0..1 drum level
  lengthSec: number;
  src?: string;
}

export interface LayerDef {
  id: string;
  name: string;
  group: Exclude<SoundCategory, "lofi">;
  hint: string;
  src?: string;
}

export const SOUND_CATEGORIES: { id: SoundCategory; name: string }[] = [
  { id: "lofi", name: "Lo-fi" },
  { id: "nature", name: "Nature" },
  { id: "cafe", name: "Café & Library" },
  { id: "relax", name: "Relaxation" },
];

/** Categories that contain music tracks (used by the current player tabs). */
export const MUSIC_CATEGORIES: { id: TrackDef["category"]; name: string }[] = [
  { id: "lofi", name: "Lo-fi" },
  { id: "relax", name: "Relaxation" },
];

export const TRACKS: TrackDef[] = [
  {
    id: "cozy-beats",
    title: "Cozy Lo-fi",
    category: "lofi",
    mood: "Warm, dusty, mellow",
    style: "lofi",
    bpm: 76,
    chords: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    tone: 2600,
    drums: 0.9,
    lengthSec: 180,
  },
  {
    id: "rainy-day",
    title: "Rainy Day Beats",
    category: "lofi",
    mood: "Grey skies, slow sips",
    style: "lofi",
    bpm: 70,
    chords: [
      [57, 60, 64, 67, 71],
      [53, 57, 60, 64],
      [48, 55, 59, 64],
      [55, 59, 62, 64],
    ],
    tone: 1900,
    drums: 0.65,
    lengthSec: 200,
  },
  {
    id: "late-night",
    title: "Late Night Study",
    category: "lofi",
    mood: "City lights, quiet desk",
    style: "lofi",
    bpm: 66,
    chords: [
      [50, 53, 57, 60, 64],
      [55, 58, 62, 65],
      [51, 55, 58, 62],
      [57, 61, 64, 67],
    ],
    tone: 2100,
    drums: 0.75,
    lengthSec: 210,
  },

  /* ---------- new lo-fi tracks ---------- */
  {
    id: "jazzy-cafe",
    title: "Jazz Café Lo-fi",
    category: "lofi",
    mood: "Smoky corner table, brushed hats",
    style: "lofi",
    variant: "jazzy",
    bpm: 82,
    chords: [
      [50, 53, 57, 60, 64], // Dm9
      [55, 59, 62, 65], // G7
      [48, 52, 55, 59, 62], // Cmaj9
      [57, 61, 64, 67], // A7
    ],
    tone: 2800,
    drums: 0.8,
    lengthSec: 200,
  },
  {
    id: "dusty-vinyl",
    title: "Dusty Vinyl",
    category: "lofi",
    mood: "Crackly record, slow afternoon",
    style: "lofi",
    variant: "dusty",
    bpm: 68,
    chords: [
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [50, 53, 57, 60], // Dm7
      [52, 56, 59, 62], // E7
    ],
    tone: 1500,
    drums: 0.6,
    lengthSec: 210,
  },
  {
    id: "chillhop-stroll",
    title: "Chillhop Stroll",
    category: "lofi",
    mood: "Headphones on, walking home",
    style: "lofi",
    variant: "chillhop",
    bpm: 84,
    chords: [
      [48, 52, 55, 59], // Cmaj7
      [45, 48, 52, 55], // Am7
      [53, 57, 60, 64], // Fmaj7
      [55, 59, 62, 65], // G7
    ],
    tone: 2900,
    drums: 1,
    lengthSec: 190,
  },
  {
    id: "sleepy-keys",
    title: "Sleepy Keys",
    category: "lofi",
    mood: "No drums, just soft keys and hush",
    style: "lofi",
    variant: "sleepy",
    bpm: 60,
    chords: [
      [53, 57, 60, 64], // Fmaj7
      [52, 55, 59, 62], // Em7
      [50, 53, 57, 60], // Dm7
      [48, 52, 55, 59], // Cmaj7
    ],
    tone: 1800,
    drums: 0,
    lengthSec: 230,
  },
  {
    id: "warped-tape",
    title: "Warped Tape",
    category: "lofi",
    mood: "Old cassette, gently wobbling",
    style: "lofi",
    variant: "tape",
    bpm: 72,
    chords: [
      [51, 55, 58, 62], // Ebmaj7
      [48, 51, 55, 58], // Cm7
      [56, 60, 63, 67], // Abmaj7
      [58, 62, 65, 68], // Bb7
    ],
    tone: 2000,
    drums: 0.7,
    lengthSec: 200,
  },
  {
    id: "sunday-morning",
    title: "Sunday Morning",
    category: "lofi",
    mood: "Sunlight, slow coffee",
    style: "lofi",
    bpm: 78,
    chords: [
      [55, 59, 62, 66], // Gmaj7
      [52, 55, 59, 62], // Em7
      [48, 52, 55, 59], // Cmaj7
      [50, 54, 57, 60], // D7
    ],
    tone: 3000,
    drums: 0.8,
    lengthSec: 190,
  },

  {
    id: "soft-instrumental",
    title: "Chill Instrumentals",
    category: "lofi",
    mood: "Plucked strings and haze",
    style: "pluck",
    bpm: 72,
    chords: [
      [50, 54, 57, 61],
      [47, 50, 54, 57],
      [43, 47, 50, 54],
      [45, 49, 52, 57],
    ],
    tone: 3400,
    drums: 0,
    lengthSec: 220,
  },
  {
    id: "peaceful-piano",
    title: "Peaceful Piano",
    category: "relax",
    mood: "Gentle keys, lots of space",
    style: "piano",
    bpm: 62,
    chords: [
      [48, 55, 59, 64],
      [45, 52, 55, 60],
      [41, 48, 52, 57],
      [43, 50, 55, 59],
    ],
    tone: 4200,
    drums: 0,
    lengthSec: 240,
  },
  {
    id: "calm-atmosphere",
    title: "Calm Atmosphere",
    category: "relax",
    mood: "Slow, floating pads",
    style: "pad",
    bpm: 48,
    chords: [
      [41, 48, 52, 55, 60],
      [48, 55, 62, 64],
      [45, 52, 55, 60],
      [43, 50, 55, 59],
    ],
    tone: 2400,
    drums: 0,
    lengthSec: 260,
  },
];

export const LAYERS: LayerDef[] = [
  { id: "rain", name: "Rain on Window", group: "nature", hint: "Soft, steady drizzle" },
  { id: "forest", name: "Forest Sounds", group: "nature", hint: "Leaves and distant birds" },
  { id: "ocean", name: "Ocean Waves", group: "nature", hint: "Slow rolling swells" },
  { id: "birds", name: "Birds Chirping", group: "nature", hint: "A busy morning garden" },
  { id: "wind", name: "Gentle Wind", group: "nature", hint: "Breeze past the glass" },
  { id: "cafe", name: "Coffee Shop Ambience", group: "cafe", hint: "Murmurs and clinking cups" },
  { id: "library", name: "Quiet Library", group: "cafe", hint: "Hushed room, turning pages" },
  { id: "chatter", name: "Soft Café Conversations", group: "cafe", hint: "Gentle voices nearby" },
  { id: "fireplace", name: "Fireplace", group: "relax", hint: "Crackling logs" },
  { id: "crickets", name: "Night Crickets", group: "relax", hint: "A warm summer night" },
  { id: "whitenoise", name: "White Noise", group: "relax", hint: "Steady, even hush" },
];

export const MIXES: { id: string; name: string; trackId: string | null; layers: Record<string, number> }[] = [
  { id: "rainy-lofi", name: "Lo-fi + Rain", trackId: "rainy-day", layers: { rain: 0.7 } },
  { id: "piano-fire", name: "Piano + Fireplace", trackId: "peaceful-piano", layers: { fireplace: 0.65 } },
  { id: "cafe-rain", name: "Café + Rain", trackId: null, layers: { cafe: 0.55, rain: 0.5 } },
  { id: "forest-cabin", name: "Forest cabin", trackId: "soft-instrumental", layers: { forest: 0.6, wind: 0.3 } },
  { id: "summer-night", name: "Summer night", trackId: "calm-atmosphere", layers: { crickets: 0.55 } },
  { id: "silent-library", name: "Silent library", trackId: null, layers: { library: 0.6, rain: 0.3 } },
  { id: "jazz-cafe-mix", name: "Jazz + Café", trackId: "jazzy-cafe", layers: { cafe: 0.4 } },
  { id: "dusty-fire", name: "Dusty vinyl + Fire", trackId: "dusty-vinyl", layers: { fireplace: 0.5 } },
  { id: "sleepy-night", name: "Sleepy night", trackId: "sleepy-keys", layers: { crickets: 0.4, rain: 0.25 } },
];

export function getTrack(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]!;
}

export function getLayer(id: string): LayerDef | undefined {
  return LAYERS.find((l) => l.id === id);
}

/** Everything in one category, music first. */
export function soundsInCategory(category: SoundCategory) {
  return {
    tracks: TRACKS.filter((t) => t.category === category),
    layers: LAYERS.filter((l) => l.group === category),
  };
}
