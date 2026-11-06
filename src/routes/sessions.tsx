import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMode } from "@/lib/defaults";
import { formatMinutes, totalMinutes } from "@/lib/stats";
import { appActions, useApp } from "@/state/app-store";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Session History — Dozi" },
      { name: "description", content: "Every focus session you've finished in Dozi, filterable by subject." },
      { property: "og:title", content: "Session History — Dozi" },
      { property: "og:description", content: "Look back at every focus session, filter by subject and tidy up your log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const sessions = useApp((s) => s.sessions);
  const subjects = useApp((s) => s.subjects);
  const settings = useApp((s) => s.settings);
  const hydrated = useApp((s) => s.hydrated);
  const [subject, setSubject] = useState("all");

  const list = useMemo(
    () =>
      [...sessions]
        .filter((s) => subject === "all" || (subject === "none" ? !s.subjectId : s.subjectId === subject))
        .sort((a, b) => b.end - a.end),
    [sessions, subject],
  );

  const subjectOf = (id: string | null) => subjects.find((s) => s.id === id);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6">
      <PageHeader eyebrow="Your log" title="Sessions">
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-56 rounded-full bg-card" aria-label="Filter by subject">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
            <SelectItem value="none">No subject</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {hydrated && (
        <p className="mb-4 text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "session" : "sessions"} · {formatMinutes(totalMinutes(list))} of focus
        </p>
      )}

      {hydrated && list.length === 0 ? (
        <div className="surface flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-muted-foreground">
            {sessions.length ? "No sessions for this subject yet." : "No sessions yet — your finished focus sessions will show up here."}
          </p>
          <Button asChild variant="hero">
            <Link to="/">Start studying</Link>
          </Button>
        </div>
      ) : (
        <ul className="surface divide-y divide-border overflow-hidden">
          {list.map((s) => {
            const subj = subjectOf(s.subjectId);
            const d = new Date(s.end);
            return (
              <li key={s.id} className="flex items-center gap-4 px-5 py-4">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: subj?.color ?? "var(--muted-foreground)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{s.task || subj?.name || "Focus session"}</p>
                  <p className="text-sm text-muted-foreground">
                    {subj?.name ?? "No subject"} · {getMode(s.modeId, settings).label} ·{" "}
                    {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })},{" "}
                    {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: !settings.clock24h })}
                  </p>
                </div>
                <span className="tabular font-display text-xl text-foreground">{formatMinutes(s.minutes)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground"
                  aria-label="Delete session"
                  onClick={() => appActions.deleteSession(s.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
