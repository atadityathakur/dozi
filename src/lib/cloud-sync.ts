/**
 * Keeps the signed-in account and this device in step.
 * - Every change is written to this device first (works offline), then
 *   uploaded in small batches a moment later.
 * - Changes not yet uploaded are remembered locally and retried.
 * - The running timer stays per-device on purpose.
 */
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { applySyncedSlices, getState, resetToFresh } from "@/state/app-store";
import { setAuth } from "@/state/auth-store";

import { localPersistence, type PersistenceAdapter } from "./persistence";
import { EMPTY_PENDING, SYNCED_KEYS, diffSessions, mergeForSignIn, type Pending, type Slices, type SyncedKey } from "./sync-merge";
import type { ModeId, StudySession } from "./types";

const OWNER_KEY = "owner";
const PENDING_KEY = "sync-pending";
const FLUSH_DELAY = 1200;
const RETRY_DELAY = 15_000;
const STALE_AFTER = 2 * 60_000;

let userId: string | null = null;
let suppress = false;
let lastSessions: StudySession[] = [];
let pending: Pending = { ...EMPTY_PENDING, ...(localPersistence.load<Pending>(PENDING_KEY) ?? {}) };
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | null = null;
let pulling: Promise<void> | null = null;
let lastPullAt = 0;

const isSyncedKey = (k: string): k is SyncedKey => (SYNCED_KEYS as readonly string[]).includes(k);
const localOwner = () => localPersistence.load<string>(OWNER_KEY);
const hasPending = (p: Pending) => p.keys.length > 0 || p.upserts.length > 0 || p.deletes.length > 0 || p.wipeSessions;

function savePending(p: Pending) {
  pending = p;
  localPersistence.save(PENDING_KEY, p);
}

export function hasLocalOwner() {
  return localOwner() != null;
}

/* ---------------- persistence adapter used by the app store ---------------- */

export const cloudAdapter: PersistenceAdapter = {
  load<T>(key: string) {
    const v = localPersistence.load<T>(key);
    if (key === "sessions") lastSessions = Array.isArray(v) ? (v as StudySession[]) : [];
    return v;
  },
  save<T>(key: string, value: T) {
    localPersistence.save(key, value);
    if (suppress) return;
    const tracking = userId != null || localOwner() != null;
    if (key === "sessions") {
      const next = value as StudySession[];
      if (tracking) savePending(diffSessions(lastSessions, next, pending));
      lastSessions = next;
    } else if (tracking && isSyncedKey(key) && !pending.keys.includes(key)) {
      savePending({ ...pending, keys: [...pending.keys, key] });
    }
    if (userId) scheduleFlush();
  },
  remove(key: string) {
    localPersistence.remove(key);
    if (suppress) return;
    const tracking = userId != null || localOwner() != null;
    if (key === "sessions") {
      lastSessions = [];
      if (tracking) savePending({ ...pending, wipeSessions: true, upserts: [], deletes: [] });
    } else if (tracking && isSyncedKey(key) && !pending.keys.includes(key)) {
      savePending({ ...pending, keys: [...pending.keys, key] });
    }
    if (userId) scheduleFlush();
  },
};

/* ---------------- row mapping ---------------- */

type SessionRow = {
  user_id: string;
  id: string;
  started_at: string;
  ended_at: string;
  minutes: number;
  mode_id: string;
  subject_id: string | null;
  task: string | null;
};

function toRow(uid: string, s: StudySession): SessionRow {
  return {
    user_id: uid,
    id: s.id,
    started_at: new Date(s.start).toISOString(),
    ended_at: new Date(s.end).toISOString(),
    minutes: s.minutes,
    mode_id: s.modeId,
    subject_id: s.subjectId,
    task: s.task ?? null,
  };
}

function fromRow(r: Omit<SessionRow, "user_id"> & { minutes: number | string }): StudySession {
  return {
    id: r.id,
    start: Date.parse(r.started_at),
    end: Date.parse(r.ended_at),
    minutes: Number(r.minutes),
    modeId: r.mode_id as ModeId,
    subjectId: r.subject_id,
    ...(r.task ? { task: r.task } : {}),
  };
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAllSessions(uid: string) {
  const all: StudySession[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("id, started_at, ended_at, minutes, mode_id, subject_id, task")
      .eq("user_id", uid)
      .order("ended_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []).map(fromRow));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

/* ---------------- upload ---------------- */

function scheduleFlush(delay = FLUSH_DELAY) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flushNow(), delay);
}

export async function flushNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (flushing) await flushing;
  const uid = userId;
  if (!uid || !hasPending(pending)) return;

  const snap = pending;
  const s = getState();
  const uploaded: Partial<Record<SyncedKey, unknown>> = {};
  setAuth({ sync: "syncing" });

  flushing = (async () => {
    try {
      if (snap.wipeSessions) {
        const { error } = await supabase.from("study_sessions").delete().eq("user_id", uid);
        if (error) throw error;
      }
      for (const ids of chunk(snap.deletes, 200)) {
        const { error } = await supabase.from("study_sessions").delete().eq("user_id", uid).in("id", ids);
        if (error) throw error;
      }
      const ups = new Set(snap.upserts);
      const rows = s.sessions.filter((x) => ups.has(x.id)).map((x) => toRow(uid, x));
      for (const part of chunk(rows, 500)) {
        const { error } = await supabase.from("study_sessions").upsert(part, { onConflict: "user_id,id" });
        if (error) throw error;
      }
      if (snap.keys.length) {
        const row: Record<string, unknown> = { user_id: uid };
        for (const k of snap.keys) {
          row[k] = s[k] as unknown as Json;
          uploaded[k] = s[k];
        }
        const { error } = await supabase
          .from("user_app_state")
          .upsert(row as { user_id: string }, { onConflict: "user_id" });
        if (error) throw error;
      }
      if (userId !== uid) return;
      // Drop only what was uploaded; anything changed meanwhile stays queued.
      const now = getState();
      const doneUps = new Set(rows.map((r) => r.id));
      const doneDel = new Set(snap.deletes);
      const nowIds = new Set(now.sessions.map((x) => x.id));
      savePending({
        keys: pending.keys.filter((k) => !(k in uploaded) || now[k] !== uploaded[k]),
        upserts: pending.upserts.filter((id) => !doneUps.has(id) && nowIds.has(id)),
        deletes: pending.deletes.filter((id) => !doneDel.has(id)),
        wipeSessions: pending.wipeSessions && !snap.wipeSessions,
      });
      setAuth({ sync: "synced", lastSyncedAt: Date.now() });
    } catch (e) {
      console.warn("Dozi sync failed, will retry", e);
      if (userId === uid) {
        setAuth({ sync: "error" });
        scheduleFlush(RETRY_DELAY);
      }
    }
  })();
  await flushing;
  flushing = null;
  if (userId === uid && hasPending(pending)) scheduleFlush();
}

/* ---------------- sign in / out ---------------- */

function waitForHydration() {
  return new Promise<void>((resolve) => {
    const check = () => (getState().hydrated ? resolve() : setTimeout(check, 30));
    check();
  });
}

/** Pulls the account's data, merges it with this device and uploads the result. */
export function startSync(uid: string): Promise<void> {
  userId = uid;
  if (pulling) return pulling;
  pulling = (async () => {
    setAuth({ sync: "syncing" });
    try {
      await waitForHydration();
      if (flushing) await flushing;
      const [stateRes, cloudSessions] = await Promise.all([
        supabase.from("user_app_state").select("*").eq("user_id", uid).maybeSingle(),
        fetchAllSessions(uid),
      ]);
      if (stateRes.error) throw stateRes.error;
      if (userId !== uid) return;

      const s = getState();
      const owner = localOwner();
      const local: Slices = {
        settings: s.settings,
        subjects: s.subjects,
        progress: s.progress,
        audio: s.audio,
        study: s.study,
        sessions: s.sessions,
      };
      const row = stateRes.data;
      const result = mergeForSignIn({
        local,
        cloud: {
          settings: (row?.settings ?? null) as Slices["settings"],
          subjects: (row?.subjects ?? null) as Slices["subjects"],
          progress: (row?.progress ?? null) as Slices["progress"],
          audio: (row?.audio ?? null) as Slices["audio"],
          study: (row?.study ?? null) as Slices["study"],
          sessions: cloudSessions,
        },
        cloudHasState: row != null,
        localOwner: owner,
        userId: uid,
        pending,
      });

      const movedGuestSessions = owner == null ? s.sessions.filter((x) => !cloudSessions.some((c) => c.id === x.id)).length : 0;

      suppress = true;
      try {
        applySyncedSlices({
          settings: result.slices.settings ?? undefined,
          subjects: result.slices.subjects ?? undefined,
          progress: result.slices.progress ?? undefined,
          audio: result.slices.audio ?? undefined,
          study: result.slices.study ?? undefined,
          sessions: result.slices.sessions,
        });
      } finally {
        suppress = false;
      }
      lastSessions = getState().sessions;
      localPersistence.save(OWNER_KEY, uid);
      savePending(result.pending);
      lastPullAt = Date.now();

      if (movedGuestSessions > 0) {
        toast("Your study history is saved to your account", {
          description: `${movedGuestSessions} session${movedGuestSessions === 1 ? "" : "s"} from this device moved in.`,
        });
      }

      if (hasPending(pending)) await flushNow();
      else setAuth({ sync: "synced", lastSyncedAt: Date.now() });
    } catch (e) {
      console.warn("Dozi could not load account data", e);
      if (userId === uid) setAuth({ sync: "error" });
    } finally {
      pulling = null;
    }
  })();
  return pulling;
}

/** Re-pulls when coming back to the tab, so other devices' changes show up. */
export function refreshIfStale() {
  if (!userId || pulling || Date.now() - lastPullAt < STALE_AFTER) return;
  void startSync(userId);
}

export function retrySync() {
  if (!userId) return;
  if (lastPullAt === 0) void startSync(userId);
  else void flushNow();
}

/** Signs out: nothing from the account is left on this device. */
export function stopSync() {
  userId = null;
  if (flushTimer) clearTimeout(flushTimer);
  localPersistence.remove(OWNER_KEY);
  savePending({ ...EMPTY_PENDING });
  lastPullAt = 0;
  suppress = true;
  try {
    resetToFresh();
  } finally {
    suppress = false;
  }
  lastSessions = [];
}
