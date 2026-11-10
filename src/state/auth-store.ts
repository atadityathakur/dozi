import { useSyncExternalStore } from "react";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface AuthState {
  status: "loading" | "guest" | "signed-in";
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  sync: SyncStatus;
  lastSyncedAt: number | null;
}

const INITIAL: AuthState = { status: "loading", user: null, profile: null, sync: "idle", lastSyncedAt: null };
let state: AuthState = INITIAL;
const listeners = new Set<() => void>();

export function getAuth() {
  return state;
}

export function setAuth(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAuth<R>(selector: (s: AuthState) => R): R {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(INITIAL),
  );
}
