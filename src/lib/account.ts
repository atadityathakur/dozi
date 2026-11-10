import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getAuth, setAuth, type Profile } from "@/state/auth-store";

import { flushNow } from "./cloud-sync";

export async function loadProfile(uid: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", uid)
    .maybeSingle();
  if (error) {
    console.warn("Could not load profile", error);
    return;
  }
  if (getAuth().user?.id !== uid) return;
  if (data) {
    setAuth({ profile: data });
    return;
  }
  // Older accounts may have no profile row yet.
  const created = { id: uid, display_name: getAuth().user?.email?.split("@")[0] ?? null, avatar_url: null };
  const { error: insErr } = await supabase.from("profiles").insert(created);
  if (!insErr) setAuth({ profile: created });
}

export async function updateProfile(patch: Partial<Pick<Profile, "display_name" | "avatar_url">>) {
  const uid = getAuth().user?.id;
  if (!uid) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", uid)
    .select("id, display_name, avatar_url")
    .single();
  if (error) throw error;
  setAuth({ profile: data });
  return data;
}

export async function signInWithGoogle() {
  return lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
}

export async function signOut() {
  try {
    await flushNow();
  } catch {
    /* unsynced changes stay queued only for this device */
  }
  await supabase.auth.signOut();
}

/** Shrinks a picked photo to a small square JPEG stored with the profile. */
export function resizeAvatar(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read."));
    };
    img.src = url;
  });
}

export function displayNameOf(profile: Profile | null, email: string | null | undefined) {
  return profile?.display_name?.trim() || email?.split("@")[0] || "You";
}
