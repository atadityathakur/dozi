/**
 * Audio catalog. All default music and ambience is generated live in the
 * browser (original, royalty-free). To use recorded audio instead, give a
 * track or layer a `src` path (e.g. "/audio/my-track.mp3" in /public).
 */

export type MusicStyle = "lofi" | "piano" | "pluck" | "pad";

export interface TrackDef {
  id: string;
  title: string;
  category: "lofi" | "ambient";
  mood: string;
  style: MusicStyle;
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
  group: "nature" | "cafe";
  hint: string;
  src?: string;
}

export const MUSIC_CATEGORIES = [
  { id: "lofi", name: "Lo-fi" },
  { id: "ambient", name: "Ambient" },
] as const;

export const TRACKS: TrackDef[] = [
  {
    id: "cozy-beats",
    title: "Cozy Beats",
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
    title: "Rainy Day Lo-fi",
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
  {
    id: "peaceful-piano",
    title: "Peaceful Piano",
    category: "ambient",
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
    id: "soft-instrumental",
    title: "Soft Instrumental",
    category: "ambient",
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
    id: "calm-atmosphere",
    title: "Calm Atmosphere",
    category: "ambient",
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
  { id: "rain", name: "Rain on the window", group: "nature", hint: "Soft, steady drizzle" },
  { id: "forest", name: "Forest", group: "nature", hint: "Leaves and distant birds" },
  { id: "ocean", name: "Ocean waves", group: "nature", hint: "Slow rolling swells" },
  { id: "fireplace", name: "Fireplace", group: "nature", hint: "Crackling logs" },
  { id: "wind", name: "Gentle wind", group: "nature", hint: "Breeze past the glass" },
  { id: "cafe", name: "Coffee shop", group: "cafe", hint: "Murmurs and clinking cups" },
  { id: "library", name: "Library", group: "cafe", hint: "Hushed room, turning pages" },
  { id: "chatter", name: "Quiet conversations", group: "cafe", hint: "Soft voices nearby" },
];

export const MIXES: { id: string; name: string; trackId: string | null; layers: Record<string, number> }[] = [
  { id: "rainy-lofi", name: "Rainy lo-fi", trackId: "rainy-day", layers: { rain: 0.7 } },
  { id: "piano-fire", name: "Piano by the fire", trackId: "peaceful-piano", layers: { fireplace: 0.65 } },
  { id: "cafe-corner", name: "Café corner", trackId: "cozy-beats", layers: { cafe: 0.55, chatter: 0.35 } },
  { id: "forest-cabin", name: "Forest cabin", trackId: "soft-instrumental", layers: { forest: 0.6, wind: 0.3 } },
  { id: "seaside", name: "Seaside calm", trackId: "calm-atmosphere", layers: { ocean: 0.65 } },
  { id: "silent-library", name: "Silent library", trackId: null, layers: { library: 0.6, rain: 0.3 } },
];

export function getTrack(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]!;
}
