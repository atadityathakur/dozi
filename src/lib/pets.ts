import type { PetId } from "./types";

export type PetKind = "cat" | "puppy" | "bunny" | "shiba";

export interface PetDef {
  id: PetId;
  kind: PetKind;
  name: string;
  blurb: string;
}

/** Add a new companion here, then give its kind an art component in components/pets. */
export const PETS: PetDef[] = [
  { id: "cat-white", kind: "cat", name: "White cat", blurb: "Purrs, stretches and naps" },
  { id: "cat-orange", kind: "cat", name: "Orange cat", blurb: "A stripy little troublemaker" },
  { id: "cat-black", kind: "cat", name: "Black cat", blurb: "Golden eyes, big opinions" },
  { id: "puppy", kind: "puppy", name: "Brown puppy", blurb: "Wags, sits and wants to play" },
  { id: "bunny", kind: "bunny", name: "Bunny", blurb: "Hops, wiggles its nose, rests" },
  { id: "shiba", kind: "shiba", name: "Shiba Inu", blurb: "Head tilts and curly tail wags" },
];

export const DEFAULT_PET: PetId = "cat-white";

export function isPetId(v: unknown): v is PetId {
  return typeof v === "string" && PETS.some((p) => p.id === v);
}

export function getPet(id: PetId | string | undefined): PetDef {
  return PETS.find((p) => p.id === id) ?? PETS[0]!;
}

/** Older saves only stored a cat coat; map it to the closest pet. */
export function petFromCoat(coat: string | undefined): PetId {
  if (coat === "ginger" || coat === "cream") return "cat-orange";
  if (coat === "midnight") return "cat-black";
  return "cat-white";
}
