import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { loadProfile } from "@/lib/account";
import { hasLocalOwner, refreshIfStale, retrySync, startSync, stopSync } from "@/lib/cloud-sync";
import { setAuth } from "@/state/auth-store";

/** Mounted once. Follows the sign-in state and starts/stops account sync. */
export function AuthRuntime() {
  useEffect(() => {
    let current: string | null = null;
    let settled = false;

    const handle = (session: Session | null) => {
      const user = session?.user ?? null;
      if (user) {
        setAuth({ status: "signed-in", user: { id: user.id, email: user.email ?? null } });
        if (current !== user.id) {
          current = user.id;
          // Defer backend calls out of the auth callback.
          setTimeout(() => {
            void startSync(user.id);
            void loadProfile(user.id);
          }, 0);
        }
      } else {
        const hadAccount = current != null || hasLocalOwner();
        current = null;
        setAuth({ status: "guest", user: null, profile: null, sync: "idle", lastSyncedAt: null });
        if (hadAccount) stopSync();
      }
      settled = true;
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => handle(session));
    void supabase.auth.getSession().then(({ data: d }) => {
      if (!settled || d.session?.user?.id !== current) handle(d.session);
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    const onOnline = () => retrySync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
