/**
 * Pure rules for combining what's on this device with what's saved in the
 * signed-in account. Kept free of network/storage code so it can be tested.
 */
import type { AudioPrefs, Progress, Settings, StudyContext, StudySession, Subject } from "./types";

export const SYNCED_KEYS = ["settings", "subjects", "progress", "audio", "study"] as const;
export type SyncedKey = (typeof SYNCED_KEYS)[number];

export interface Slices {
  settings: Settings | null;
  subjects: Subject[] | null;
  progress: Progress | null;
  audio: AudioPrefs | null;
  study: StudyContext | null;
  sessions: StudySession[];
}

/** Changes made on this device that the account hasn't received yet. */
export interface Pending {
  keys: SyncedKey[];
  upserts: string[];
  deletes: string[];
  wipeSessions: boolean;
}

export const EMPTY_PENDING: Pending = { keys: [], upserts: [], deletes: [], wipeSessions: false };

export interface MergeInput {
  local: Slices;
  /** null when the account has never saved app data. */
  cloud: (Omit<Slices, "sessions"> & { sessions: StudySession[] }) | null;
  cloudHasState: boolean;
  /** Which account the data on this device belongs to (null = guest data). */
  localOwner: string | null;
  userId: string;
  pending: Pending;
}

export interface MergeResult {
  slices: Slices;
  pending: Pending;
}

function unionSessions(a: StudySession[], b: StudySession[]) {
  const map = new Map<string, StudySession>();
  for (const s of a) map.set(s.id, s);
  for (const s of b) if (!map.has(s.id)) map.set(s.id, s);
  return [...map.values()].sort((x, y) => x.end - y.end);
}

function mergeProgress(cloud: Progress | null, local: Progress | null, addLocalPoints: boolean): Progress | null {
  if (!cloud) return local;
  if (!local) return cloud;
  const achievements: Record<string, number> = { ...cloud.achievements };
  for (const [id, at] of Object.entries(local.achievements ?? {})) {
    achievements[id] = achievements[id] != null ? Math.min(achievements[id]!, at) : at;
  }
  return {
    points: (cloud.points ?? 0) + (addLocalPoints ? (local.points ?? 0) : 0),
    achievements,
    goalBonusDays: [...new Set([...(cloud.goalBonusDays ?? []), ...(local.goalBonusDays ?? [])])],
  };
}

function unionSubjects(cloud: Subject[] | null, local: Subject[] | null) {
  if (!cloud?.length) return local;
  if (!local?.length) return cloud;
  const ids = new Set(cloud.map((s) => s.id));
  return [...cloud, ...local.filter((s) => !ids.has(s.id))];
}

export function mergeForSignIn({ local, cloud, cloudHasState, localOwner, userId, pending }: MergeInput): MergeResult {
  const cloudSessions = cloud?.sessions ?? [];
  const cloudIds = new Set(cloudSessions.map((s) => s.id));
  const allKeys = [...SYNCED_KEYS];

  // Same account as last time: the account is the source of truth, except for
  // changes made here that haven't been uploaded yet.
  if (localOwner === userId) {
    const deletes = new Set(pending.deletes);
    const upserts = new Set(pending.upserts);
    const sessions = pending.wipeSessions
      ? local.sessions
      : unionSessions(
          cloudSessions.filter((s) => !deletes.has(s.id)),
          local.sessions.filter((s) => upserts.has(s.id)),
        );
    const pick = <K extends SyncedKey>(k: K): Slices[K] =>
      pending.keys.includes(k) || !cloudHasState ? local[k] : (cloud?.[k] ?? local[k]);
    return {
      slices: {
        settings: pick("settings"),
        subjects: pick("subjects"),
        progress: pick("progress"),
        audio: pick("audio"),
        study: pick("study"),
        sessions,
      },
      pending: {
        keys: cloudHasState ? pending.keys : allKeys,
        upserts: sessions.filter((s) => !cloudIds.has(s.id) || upserts.has(s.id)).map((s) => s.id),
        deletes: pending.deletes,
        wipeSessions: pending.wipeSessions,
      },
    };
  }

  // Data on this device belongs to a different account: never mix it in.
  if (localOwner && localOwner !== userId) {
    const empty: Slices = { settings: null, subjects: null, progress: null, audio: null, study: null, sessions: [] };
    return {
      slices: cloud && cloudHasState ? { ...cloud, sessions: cloudSessions } : { ...empty, sessions: cloudSessions },
      pending: { ...EMPTY_PENDING, keys: cloudHasState ? [] : allKeys },
    };
  }

  // Guest data moves into the account.
  if (!cloud || !cloudHasState) {
    const sessions = unionSessions(cloudSessions, local.sessions);
    return {
      slices: { ...local, sessions },
      pending: { ...EMPTY_PENDING, keys: allKeys, upserts: sessions.filter((s) => !cloudIds.has(s.id)).map((s) => s.id) },
    };
  }

  const newLocal = local.sessions.filter((s) => !cloudIds.has(s.id));
  const sessions = unionSessions(cloudSessions, local.sessions);
  return {
    slices: {
      settings: cloud.settings ?? local.settings,
      subjects: unionSubjects(cloud.subjects, local.subjects),
      progress: mergeProgress(cloud.progress, local.progress, newLocal.length > 0),
      audio: cloud.audio ?? local.audio,
      study: cloud.study ?? local.study,
      sessions,
    },
    pending: { ...EMPTY_PENDING, keys: allKeys, upserts: newLocal.map((s) => s.id) },
  };
}

/** Records how the session list changed so only the difference is uploaded. */
export function diffSessions(prev: StudySession[], next: StudySession[], pending: Pending): Pending {
  const prevIds = new Set(prev.map((s) => s.id));
  const nextIds = new Set(next.map((s) => s.id));
  const upserts = new Set(pending.upserts);
  const deletes = new Set(pending.deletes);
  for (const id of nextIds) {
    if (!prevIds.has(id)) {
      upserts.add(id);
      deletes.delete(id);
    }
  }
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      deletes.add(id);
      upserts.delete(id);
    }
  }
  return { ...pending, upserts: [...upserts], deletes: [...deletes] };
}
