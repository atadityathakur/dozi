import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Link2,
  Plus,
  Radio,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import "./yapdash.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  csvCell,
  ROOM_PLAYER_LIMIT,
  standings,
  type Quiz,
  type QuizQuestion,
  type RoomSnapshot,
  validateQuiz,
} from "@/lib/quiz-domain";
import { actInRoom, createRoom, joinRoom, readRoom } from "./localRooms";

type LocalQuestion = QuizQuestion & { id: string };
type LocalQuiz = Omit<Quiz, "questions"> & { id: string; updated: number; questions: LocalQuestion[] };
type Session = { role: "host" | "player"; code: string; credential: string; name?: string };

const LETTERS = ["A", "B", "C", "D"];
const QUIZ_STORAGE_KEY = "YapDash.quizzes.v1";
const SESSION_STORAGE_KEY = "YapDash.session";
const NAME_STORAGE_KEY = "YapDash.name";

const SAMPLE_QUIZ: Omit<LocalQuiz, "updated"> & { updated: number } = {
  id: "sample-influence",
  title: "Are You Being Influenced?",
  updated: Date.now(),
  questions: [
    {
      id: "s1",
      text: "A character in a film repeatedly uses one phone brand. What marketing technique is this?",
      options: ["Subliminal advertising", "Product placement", "Direct selling", "Comparative advertising"],
      correct: 1,
      time: 15,
    },
    {
      id: "s2",
      text: "Which is the closest example of subliminal advertising?",
      options: [
        "An open soft drink ad",
        "A logo on a billboard",
        "A hidden image flashed too briefly to notice",
        "A celebrity recommendation",
      ],
      correct: 2,
      time: 15,
    },
    {
      id: "s3",
      text: "Why repeat the same colours, music, and logo?",
      options: [
        "Lower manufacturing cost",
        "Build familiarity and recognition",
        "Reduce product quality",
        "Avoid regulation",
      ],
      correct: 1,
      time: 20,
    },
    {
      id: "s4",
      text: "An app says ‘Only 2 minutes left!’ during checkout. Which trigger is used?",
      options: ["Scarcity and urgency", "Anchoring", "Social proof", "Decoy effect"],
      correct: 0,
      time: 15,
    },
    {
      id: "s5",
      text: "An influencer omits that a post is sponsored. What is the main concern?",
      options: [
        "Excessive placement",
        "Hidden advertising and lack of transparency",
        "Subliminal audio",
        "Comparative marketing",
      ],
      correct: 1,
      time: 20,
    },
    {
      id: "s6",
      text: "How does subliminal marketing differ from subtle marketing?",
      options: [
        "Both flash images",
        "Subliminal is below awareness; subtle can still be consciously seen",
        "Subtle marketing is always illegal",
        "Subliminal only occurs in films",
      ],
      correct: 1,
      time: 20,
    },
  ],
};

function readSavedQuizzes(): LocalQuiz[] {
  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.flatMap((item): LocalQuiz[] => {
        if (!item || typeof item !== "object" || !Array.isArray(item["questions"])) return [];
        const questions = item["questions"].flatMap((source): LocalQuestion[] => {
          if (!source || typeof source !== "object") return [];
          const question = source as Record<string, unknown>;
          if (typeof question["text"] !== "string" || !Array.isArray(question["options"])) return [];
          return [
            {
              id: typeof question["id"] === "string" ? question["id"] : crypto.randomUUID(),
              text: question["text"],
              options: question["options"].map(String),
              correct: Number(question["correct"]),
              time: Number(question["time"]) || 20,
            },
          ];
        });
        return [
          {
            id: typeof item["id"] === "string" ? item["id"] : crypto.randomUUID(),
            title: typeof item["title"] === "string" ? item["title"] : "Untitled quiz",
            updated: Number(item["updated"]) || Date.now(),
            questions,
          },
        ];
      });
    }
    return [{ ...SAMPLE_QUIZ, questions: SAMPLE_QUIZ.questions.map((q) => ({ ...q, id: crypto.randomUUID() })) }];
  } catch {
    return [{ ...SAMPLE_QUIZ, questions: SAMPLE_QUIZ.questions.map((q) => ({ ...q, id: crypto.randomUUID() })) }];
  }
}

function persistQuizzes(quizzes: LocalQuiz[]) {
  try {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizzes));
  } catch {
    toast.error("Your browser could not save this quiz.");
  }
}

function makeQuestion(): LocalQuestion {
  return { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correct: -1, time: 20 };
}

function quizToText(quiz: LocalQuiz) {
  return quiz.questions
    .map((q) =>
      [
        q.text.trim(),
        ...q.options
          .map((option, index) => (option.trim() ? `${LETTERS[index]}) ${option.trim()}${index === q.correct ? " *" : ""}` : ""))
          .filter(Boolean),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function parseBulk(text: string): { questions: LocalQuestion[]; skipped: number; unmarked: number } {
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n+/);
  const questions: LocalQuestion[] = [];
  let skipped = 0;
  let unmarked = 0;
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const questionLines: string[] = [];
    const options: string[] = [];
    let correct = -1;
    let answerLetter = -1;
    for (const line of lines) {
      const answerMatch = line.match(/^(?:answer|ans|correct)\s*[:=-]\s*\(?([A-Da-d])\b/i);
      if (answerMatch?.[1]) {
        answerLetter = answerMatch[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }
      const optionMatch = questionLines.length ? line.match(/^(\*?)\s*\(?([A-Da-d])[).:-]\s+(.*)$/) : null;
      if (optionMatch?.[3] !== undefined) {
        let value = optionMatch[3].trim();
        let marked = optionMatch[1] === "*";
        if (/\*\s*$/.test(value)) {
          marked = true;
          value = value.replace(/\s*\*+\s*$/, "");
        }
        if (options.length < 4) {
          options.push(value);
          if (marked) correct = options.length - 1;
        }
        continue;
      }
      if (!options.length) questionLines.push(line.replace(/^(?:q(?:uestion)?\s*\d*|\d+)\s*[).:-]\s*/i, ""));
      else if (options.length) options[options.length - 1] = `${options[options.length - 1]} ${line}`;
    }
    if (!questionLines.length || options.length < 2) {
      skipped += 1;
      continue;
    }
    if (correct < 0 && answerLetter >= 0 && answerLetter < options.length) correct = answerLetter;
    if (correct < 0) unmarked += 1;
    questions.push({
      id: crypto.randomUUID(),
      text: questionLines.join(" "),
      options: [...options, ...Array(Math.max(0, 4 - options.length)).fill("")],
      correct,
      time: 20,
    });
  }
  return { questions, skipped, unmarked };
}

function copyText(value: string, success: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(success))
    .catch(() => toast.error("Could not copy. Select and copy the text instead."));
}

function AppHeader({
  title,
  code,
  onHome,
  onBackToDozi,
  right,
}: {
  title?: string;
  code?: string;
  onHome?: () => void;
  onBackToDozi?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="flex items-center gap-3">
          <button className="wordmark" type="button" onClick={onHome}>
            <span>Yap</span>
            <span className="wordmark-accent">Dash</span>
          </button>
          {onBackToDozi && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDozi}
              className="ml-2 gap-1.5 rounded-full text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dozi</span>
            </Button>
          )}
        </div>
        <div className="header-meta">
          {title && <span className="header-title">{title}</span>}
          {code && (
            <span className="room-chip">
              {code.slice(0, 3)} {code.slice(3)}
            </span>
          )}
          {right}
        </div>
      </div>
    </header>
  );
}

export function YapDashApp({ onBackToDozi }: { onBackToDozi?: () => void }) {
  const [quizzes, setQuizzes] = useState<LocalQuiz[]>([]);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [screen, setScreen] = useState<"home" | "editor" | "game">("home");
  const [editing, setEditing] = useState<LocalQuiz | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<RoomSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, setClock] = useState(Date.now());
  const [confirmedDelete, setConfirmedDelete] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [toastText, setToastText] = useState("");
  const sessionRef = useRef<Session | null>(null);
  const busyRef = useRef(false);
  const [clockOffset, setClockOffset] = useState(0);

  const currentQuestion = game?.question ?? null;
  const timeRemaining =
    game?.phase === "question" && currentQuestion
      ? Math.max(0, Math.ceil((game.endsAt - (Date.now() + clockOffset)) / 1000))
      : 0;
  const timerFill = currentQuestion ? Math.max(0, Math.min(1, timeRemaining / currentQuestion.time)) : 0;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get("room")?.replace(/\D/g, "").slice(0, 6);
    if (!code) return;
    setRoomCode(code);
    const next = new URL(window.location.href);
    next.searchParams.delete("room");
    window.history.replaceState(window.history.state, "", next.toString());
  }, []);

  useEffect(() => {
    const saved = readSavedQuizzes();
    setQuizzes(saved);
    persistQuizzes(saved);
    try {
      setName(window.localStorage.getItem(NAME_STORAGE_KEY) ?? "");
    } catch {
      setName("");
    }
    try {
      const savedSession = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as
        | (Session & { hostKey?: string; token?: string })
        | null;
      if (savedSession && /^[0-9]{6}$/.test(savedSession.code)) {
        const credential = savedSession.credential ?? savedSession.hostKey ?? savedSession.token;
        const role = savedSession.role;
        if (credential && (role === "host" || role === "player")) {
          const previousSession: Session = {
            role,
            code: savedSession.code,
            credential,
            ...(typeof savedSession.name === "string" ? { name: savedSession.name } : {}),
          };
          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(previousSession));
          sessionRef.current = previousSession;
          setSession(previousSession);
          setScreen("game");
        }
      }
    } catch {
      /* no saved room */
    }
  }, []);

  const announce = useCallback((message: string) => {
    setToastText(message);
    window.setTimeout(() => setToastText((previous) => (previous === message ? "" : previous)), 3200);
  }, []);

  const persistSession = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    try {
      if (next) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clearRoom = useCallback(
    (message?: string) => {
      persistSession(null);
      setGame(null);
      setScreen("home");
      setError("");
      setRoomCode("");
      if (message) announce(message);
    },
    [announce, persistSession]
  );

  const refreshRoom = useCallback(
    async (quiet = false) => {
      const current = sessionRef.current;
      if (!current || busyRef.current) return;
      busyRef.current = true;
      try {
        const snapshot = await readRoom({
          data: { code: current.code, role: current.role, credential: current.credential },
        });
        setGame(snapshot as RoomSnapshot);
        setClockOffset(snapshot.serverNow - Date.now());
        setScreen("game");
        setError("");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Room connection lost.";
        if (/ended|incorrect|session.*valid|expired/i.test(message)) clearRoom(message);
        else if (!quiet) setError(message);
      } finally {
        busyRef.current = false;
      }
    },
    [clearRoom]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendAction = useCallback(async (action: any) => {
    const current = sessionRef.current;
    if (!current) throw new Error("Room session is no longer available.");
    return actInRoom({
      data: { code: current.code, role: current.role, credential: current.credential, action },
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const performAction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (action: any) => {
      const current = sessionRef.current;
      if (!current) return;
      try {
        if (action.action === "end" || action.action === "leave") {
          await actInRoom({
            data: { code: current.code, role: current.role, credential: current.credential, action },
          });
          clearRoom(action.action === "end" ? "Room closed." : undefined);
        } else {
          const updated = await actInRoom({
            data: { code: current.code, role: current.role, credential: current.credential, action },
          });
          if (updated && typeof updated === "object" && "ended" in updated && updated.ended) {
            clearRoom("The host ended this quiz.");
          } else if (updated && typeof updated === "object" && "serverNow" in updated) {
            setGame(updated as RoomSnapshot);
            setClockOffset(updated.serverNow - Date.now());
            setError("");
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That action could not be completed.");
      }
    },
    [clearRoom]
  );

  useEffect(() => {
    if (!session) return;
    void refreshRoom(true);
    const heartbeat = window.setInterval(() => {
      void sendAction({ action: "heartbeat" })
        .then((snapshot) => {
          if (snapshot && typeof snapshot === "object" && "serverNow" in snapshot) {
            setGame(snapshot as RoomSnapshot);
            setClockOffset(snapshot.serverNow - Date.now());
            setError("");
          }
        })
        .catch((caught: unknown) => {
          const message = caught instanceof Error ? caught.message : "Connection lost.";
          if (/ended|session.*valid/i.test(message)) clearRoom(message);
          else setError("Reconnecting to the room…");
        });
    }, 4_000);
    return () => window.clearInterval(heartbeat);
  }, [clearRoom, refreshRoom, sendAction, session]);

  useEffect(() => {
    if (game?.phase !== "question") return;
    const interval = window.setInterval(() => setClock(Date.now()), 200);
    const tick =
      session?.role === "host"
        ? window.setInterval(() => {
            void performAction({ action: "tick" });
          }, 700)
        : null;
    return () => {
      window.clearInterval(interval);
      if (tick !== null) window.clearInterval(tick);
    };
  }, [game?.phase, performAction, session?.role]);

  const addQuiz = useCallback(() => {
    const quiz: LocalQuiz = { id: crypto.randomUUID(), title: "", updated: Date.now(), questions: [makeQuestion()] };
    const next = [quiz, ...quizzes];
    setQuizzes(next);
    persistQuizzes(next);
    setEditing(quiz);
    setScreen("editor");
  }, [quizzes]);

  const saveEditing = useCallback(
    (quiz: LocalQuiz) => {
      const next = quizzes.some((item) => item.id === quiz.id)
        ? quizzes.map((item) => (item.id === quiz.id ? quiz : item))
        : [quiz, ...quizzes];
      setQuizzes(next);
      persistQuizzes(next);
    },
    [quizzes]
  );

  const updateQuestion = (index: number, updater: (question: LocalQuestion) => LocalQuestion) => {
    if (!editing) return;
    const nextQuestions = editing.questions.map((question, current) => (current === index ? updater(question) : question));
    const next = { ...editing, updated: Date.now(), questions: nextQuestions } as LocalQuiz;
    setEditing(next);
    saveEditing(next);
  };

  const startHosting = useCallback(
    async (quiz: LocalQuiz) => {
      const validated = validateQuiz(quiz);
      if (!validated) {
        toast.error("Each question needs text, two or more answers, and one correct answer.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const result = await createRoom({ data: { quiz: validated } });
        const nextSession: Session = { role: "host", code: result.code, credential: result.hostKey };
        persistSession(nextSession);
        setGame(result.snapshot as RoomSnapshot);
        setClockOffset((result.snapshot as RoomSnapshot).serverNow - Date.now());
        setScreen("game");
        setEditing(null);
        setError("");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not start the room.");
      } finally {
        setBusy(false);
      }
    },
    [persistSession]
  );

  const join = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const code = roomCode.replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) {
        setError("Enter the six-digit room code.");
        return;
      }
      if (!name.trim()) {
        setError("Enter a name to join.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const previous = (() => {
          try {
            return JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as
              | (Session & { token?: string })
              | null;
          } catch {
            return null;
          }
        })();
        const playerToken =
          previous?.role === "player" && previous.code === code ? previous.credential ?? previous.token : undefined;
        const result = await joinRoom({ data: { code, name, ...(playerToken ? { playerToken } : {}) } });
        const nextSession: Session = { role: "player", code, credential: result.token, name: name.trim() };
        persistSession(nextSession);
        setGame(result.snapshot as RoomSnapshot);
        setClockOffset((result.snapshot as RoomSnapshot).serverNow - Date.now());
        setScreen("game");
        try {
          window.localStorage.setItem(NAME_STORAGE_KEY, name.trim());
        } catch {
          /* ignore */
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not join the room.");
      } finally {
        setBusy(false);
      }
    },
    [name, persistSession, roomCode]
  );

  const onHome = useCallback(() => {
    setScreen("home");
    setGame(null);
    setEditing(null);
  }, []);

  const downloadCsv = (snapshot: RoomSnapshot) => {
    const rows = [
      ["Rank", "Name", "Score", "Correct answers", "Questions", "Accuracy"],
      ...(snapshot.players ?? []).map((player) => [
        player.rank,
        player.name,
        player.score,
        player.correct,
        snapshot.total,
        `${snapshot.total ? Math.round((player.correct / snapshot.total) * 100) : 0}%`,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(snapshot.title || "quiz").replace(/[^\w-]+/g, "-").toLowerCase()}-results.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyInvite = () => copyText(`${window.location.origin}/?room=${game?.code}`, "Invite link copied");

  const importBulk = () => {
    if (!editing) return;
    const parsed = parseBulk(bulkText);
    if (!parsed.questions.length) return;
    const firstQuestion = editing.questions[0];
    const starterEmpty =
      editing.questions.length === 1 &&
      !!firstQuestion &&
      !firstQuestion.text.trim() &&
      firstQuestion.options.every((option) => !option.trim());
    const next: LocalQuiz = {
      ...editing,
      updated: Date.now(),
      questions: [...(starterEmpty ? [] : editing.questions), ...parsed.questions],
    };
    setEditing(next);
    saveEditing(next);
    setBulkOpen(false);
    setBulkText("");
    toast.success(`Added ${parsed.questions.length} ${parsed.questions.length === 1 ? "question" : "questions"}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hostAction = (action: any) => {
    void performAction(action);
  };

  const renderHome = () => (
    <>
      <AppHeader onBackToDozi={onBackToDozi} />
      <main className="page-shell">
        <section className="intro-band">
          <div>
            <div className="eyebrow">QUIZ NIGHT, LIVE</div>
            <h1>
              Bring everyone
              <br />
              <span>into the moment.</span>
            </h1>
            <p>One room code. Your questions. A leaderboard that changes with every answer.</p>
          </div>
          <div className="intro-stamp">
            <span>LIVE</span>
            <strong>Y</strong>
            <i />
          </div>
        </section>

        <div className="home-columns">
          <section className="join-section">
            <div className="section-label">
              <span>01</span>
              <span>JOIN A ROOM</span>
            </div>
            <h2>Got a code?</h2>
            <form className="join-form" onSubmit={join}>
              <label className="field">
                <span>Six-digit room code</span>
                <Input
                  aria-label="Room code"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={7}
                  value={roomCode.length > 3 ? `${roomCode.slice(0, 3)} ${roomCode.slice(3)}` : roomCode}
                  onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000 000"
                  className="field-input code-input"
                />
              </label>
              <label className="field">
                <span>Your name</span>
                <Input
                  aria-label="Your name"
                  autoComplete="off"
                  maxLength={20}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Shown on the leaderboard"
                  className="field-input"
                />
              </label>
              {error && screen === "home" && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy} size="lg" className="action-button">
                {busy ? "Joining…" : <>Join quiz <span aria-hidden>→</span></>}
              </Button>
            </form>
            <div className="join-note">
              <span className="status-dot" /> Rooms fit up to {ROOM_PLAYER_LIMIT} players
            </div>
          </section>

          <section className="library-section">
            <div className="library-heading">
              <div>
                <div className="section-label">
                  <span>02</span>
                  <span>HOST A ROOM</span>
                </div>
                <h2>Your quiz library</h2>
              </div>
              <Button variant="outline" size="sm" onClick={addQuiz}>
                <Plus size={16} /> New quiz
              </Button>
            </div>
            <p className="section-caption">Saved on this browser</p>
            <div className="quiz-list">
              {quizzes.map((quiz) => (
                <article className="quiz-row" key={quiz.id}>
                  <div className="quiz-index">{String(quiz.questions.length).padStart(2, "0")}</div>
                  <div className="quiz-info">
                    <strong>{quiz.title || "Untitled quiz"}</strong>
                    <span>
                      {quiz.questions.length} questions · edited{" "}
                      {new Date(quiz.updated).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="quiz-actions">
                    <Button size="sm" onClick={() => void startHosting(quiz)} disabled={busy}>
                      Host live
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${quiz.title || "quiz"}`}
                      onClick={() => {
                        setEditing(quiz);
                        setScreen("editor");
                      }}
                    >
                      <ChevronDown className="edit-chevron" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${quiz.title || "quiz"}`}
                      onClick={() => {
                        if (confirmedDelete === quiz.id) {
                          const next = quizzes.filter((item) => item.id !== quiz.id);
                          setQuizzes(next);
                          persistQuizzes(next);
                          setConfirmedDelete(null);
                        } else {
                          setConfirmedDelete(quiz.id);
                          window.setTimeout(
                            () => setConfirmedDelete((current) => (current === quiz.id ? null : current)),
                            4000
                          );
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                    {confirmedDelete === quiz.id && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const next = quizzes.filter((item) => item.id !== quiz.id);
                          setQuizzes(next);
                          persistQuizzes(next);
                          setConfirmedDelete(null);
                        }}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <Button
              className="sample-link"
              variant="ghost"
              onClick={() => {
                const next = [
                  {
                    ...SAMPLE_QUIZ,
                    id: crypto.randomUUID(),
                    updated: Date.now(),
                    questions: SAMPLE_QUIZ.questions.map((question) => ({ ...question, id: crypto.randomUUID() })),
                  },
                  ...quizzes,
                ];
                setQuizzes(next);
                persistQuizzes(next);
              }}
            >
              + Add another sample quiz
            </Button>
          </section>
        </div>
        {error && (
          <p className="form-error home-general-error" role="alert">
            {error}
          </p>
        )}
      </main>
      <footer className="page-footer">
        <span>YAPDASH / LIVE QUIZ ROOMS</span>
        <span>MADE FOR THE ROOM YOU’RE IN</span>
      </footer>
    </>
  );

  const renderEditor = () => {
    if (!editing) return null;
    return (
      <>
        <AppHeader
          title="Quiz editor"
          onHome={() => {
            saveEditing(editing);
            setEditing(null);
            setScreen("home");
          }}
          onBackToDozi={onBackToDozi}
          right={
            <span className="saved-indicator">
              <Check size={14} /> saved
            </span>
          }
        />
        <main className="editor-shell">
          <div className="editor-topline">
            <Button
              variant="ghost"
              onClick={() => {
                saveEditing(editing);
                setEditing(null);
                setScreen("home");
              }}
            >
              ← Quizzes
            </Button>
            <span className="eyebrow">BUILD YOUR SET</span>
            <span className="question-count">{editing.questions.length} QUESTIONS</span>
          </div>
          <Input
            aria-label="Quiz title"
            maxLength={80}
            placeholder="Untitled quiz"
            value={editing.title}
            className="title-editor"
            onChange={(event) => {
              const next: LocalQuiz = { ...editing, title: event.target.value, updated: Date.now() };
              setEditing(next);
              saveEditing(next);
            }}
          />
          <div className="question-stack">
            {editing.questions.map((question, index) => {
              const moveQuestion = (target: number) => {
                const next = [...editing.questions];
                const selected = next[index];
                const displaced = next[target];
                if (!selected || !displaced) return;
                next[index] = displaced;
                next[target] = selected;
                const updated: LocalQuiz = { ...editing, questions: next, updated: Date.now() };
                setEditing(updated);
                saveEditing(updated);
              };

              return (
                <div key={question.id} className="question-editor-card">
                  <div className="question-header">
                    <span className="q-number">Q{index + 1}</span>
                    <div className="q-reorder">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveQuestion(index - 1)}
                      >
                        <ChevronUp size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === editing.questions.length - 1}
                        onClick={() => moveQuestion(index + 1)}
                      >
                        <ChevronDown size={16} />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="delete-q-button"
                      disabled={editing.questions.length <= 1}
                      onClick={() => {
                        const next = editing.questions.filter((_, i) => i !== index);
                        const updated: LocalQuiz = { ...editing, questions: next, updated: Date.now() };
                        setEditing(updated);
                        saveEditing(updated);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Type your question here…"
                    value={question.text}
                    className="question-text-input"
                    rows={2}
                    onChange={(e) =>
                      updateQuestion(index, (q) => ({ ...q, text: e.target.value }))
                    }
                  />

                  <div className="options-grid">
                    {question.options.map((opt, optIndex) => (
                      <div key={optIndex} className="option-field">
                        <button
                          type="button"
                          className={`correct-toggle ${question.correct === optIndex ? "is-correct" : ""}`}
                          onClick={() =>
                            updateQuestion(index, (q) => ({
                              ...q,
                              correct: q.correct === optIndex ? -1 : optIndex,
                            }))
                          }
                          title="Mark as correct answer"
                        >
                          {LETTERS[optIndex]}
                        </button>
                        <Input
                          placeholder={`Option ${LETTERS[optIndex]}`}
                          value={opt}
                          onChange={(e) =>
                            updateQuestion(index, (q) => {
                              const opts = [...q.options];
                              opts[optIndex] = e.target.value;
                              return { ...q, options: opts };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="editor-bottom-bar flex items-center justify-between gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                const next: LocalQuiz = {
                  ...editing,
                  questions: [...editing.questions, makeQuestion()],
                  updated: Date.now(),
                };
                setEditing(next);
                saveEditing(next);
              }}
            >
              <Plus size={16} /> Add Question
            </Button>

            <Button
              className="action-button"
              onClick={() => void startHosting(editing)}
            >
              Host this quiz live →
            </Button>
          </div>
        </main>
      </>
    );
  };

  const renderHost = (snapshot: RoomSnapshot) => {
    const players = standings(snapshot.players ?? []);
    const question = snapshot.question;
    const endControl = (
      <Button variant="ghost" size="sm" onClick={() => hostAction({ action: "end" })}>
        End quiz
      </Button>
    );

    if (snapshot.phase === "lobby") {
      return (
        <>
          <AppHeader title={snapshot.title} code={snapshot.code} onBackToDozi={onBackToDozi} right={endControl} />
          <main className="host-lobby-shell">
            <div className="lobby-hero">
              <span className="eyebrow">ROOM CODE</span>
              <h1 className="code-display">
                {snapshot.code.slice(0, 3)} {snapshot.code.slice(3)}
              </h1>
              <p>Players join at yapdash with this six-digit code</p>
              <Button variant="outline" size="sm" onClick={copyInvite} className="mt-2">
                <Copy size={14} /> Copy Room Code
              </Button>
            </div>

            <div className="lobby-players-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Joined Players ({players.length})
                </span>
                <span className="status-dot active" />
              </div>

              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Waiting for players to join with code <strong>{snapshot.code}</strong>…
                </p>
              ) : (
                <div className="player-chips-grid">
                  {players.map((p: any) => (
                    <div key={p.id} className="player-chip">
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                className="action-button"
                disabled={players.length === 0}
                onClick={() => hostAction({ action: "start" })}
              >
                Start Quiz ({players.length} ready) →
              </Button>
            </div>
          </main>
        </>
      );
    }

    if (snapshot.phase === "question" && question) {
      return (
        <>
          <AppHeader title={snapshot.title} code={snapshot.code} onBackToDozi={onBackToDozi} right={endControl} />
          <main className="game-shell">
            <div className="stage-line">
              <span>QUESTION {snapshot.qIndex + 1} / {snapshot.total}</span>
              <span>{snapshot.answered ?? 0} / {snapshot.playerCount} ANSWERED</span>
            </div>
            <div className={`countdown-clock ${timeRemaining <= 5 ? "urgent" : ""}`}>
              {timeRemaining}
              <small>SEC</small>
            </div>
            <div className="timer-track">
              <i style={{ transform: `scaleX(${timerFill})` }} />
            </div>
            <h1 className="game-question">{question.text}</h1>
            <div className="host-options-grid">
              {question.options.map((opt, idx) => (
                <div key={idx} className="host-option-card">
                  <span className="opt-letter">{LETTERS[idx]}</span>
                  <span className="opt-text">{opt}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => hostAction({ action: "skip" })}>
                Skip timer / Reveal
              </Button>
            </div>
          </main>
        </>
      );
    }

    if (snapshot.phase === "reveal" && question) {
      return (
        <>
          <AppHeader title={snapshot.title} code={snapshot.code} onBackToDozi={onBackToDozi} right={endControl} />
          <main className="game-shell">
            <div className="stage-line">
              <span>QUESTION {snapshot.qIndex + 1} / {snapshot.total} REVEAL</span>
            </div>
            <h1 className="game-question">{question.text}</h1>
            <div className="host-options-grid">
              {question.options.map((opt, idx) => {
                const isCorrect = idx === question.correct;
                const count = snapshot.counts ? snapshot.counts[idx] || 0 : 0;
                return (
                  <div
                    key={idx}
                    className={`host-option-card ${isCorrect ? "is-correct-card" : "is-wrong-card"}`}
                  >
                    <span className="opt-letter">{LETTERS[idx]}</span>
                    <span className="opt-text">{opt}</span>
                    <span className="opt-count">{count} votes</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center">
              <Button size="lg" className="action-button" onClick={() => hostAction({ action: "next" })}>
                {snapshot.qIndex + 1 >= snapshot.total ? "Show Final Results" : "Next Question"} →
              </Button>
            </div>
          </main>
        </>
      );
    }

    // Final phase
    return (
      <>
        <AppHeader title={snapshot.title} code={snapshot.code} onBackToDozi={onBackToDozi} right={endControl} />
        <main className="game-shell">
          <div className="game-kicker">THE QUIZ IS IN</div>
          <h1 className="game-title">Final Results</h1>
          <div className="podium">
            {[players[1], players[0], players[2]].map((player, index) => (
              <div className={`podium-place place-${index + 1}`} key={player?.id ?? index}>
                {player ? (
                  <>
                    <strong>{player.name}</strong>
                    <span>{player.score.toLocaleString()} pts</span>
                    <b>{player.rank}</b>
                  </>
                ) : (
                  <b>—</b>
                )}
              </div>
            ))}
          </div>

          <section className="standings-section">
            <div className="section-label">
              <span>FINAL STANDINGS</span>
              <span>{players.length} PLAYERS</span>
            </div>
            <div className="standings-table">
              <div className="standings-head">
                <span>RANK</span>
                <span>PLAYER</span>
                <span>SCORE</span>
                <span>ACCURACY</span>
              </div>
              {players.map((player: any) => (
                <div className="standings-row" key={player.id}>
                  <span>{player.rank}</span>
                  <strong>{player.name}</strong>
                  <span>{player.score.toLocaleString()}</span>
                  <span>
                    {snapshot.total ? Math.round((player.correct / snapshot.total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="editor-actions results-actions mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => downloadCsv(snapshot)}>
              <Download className="mr-1.5 h-4 w-4" /> Download CSV
            </Button>
            <Button onClick={() => hostAction({ action: "restart" })}>
              Play again with the same players
            </Button>
            <Button variant="ghost" onClick={() => hostAction({ action: "end" })}>
              Close room
            </Button>
          </div>
        </main>
      </>
    );
  };

  const renderPlayer = (snapshot: RoomSnapshot) => {
    const question = snapshot.question;
    const me = snapshot.me;
    if (!me) return null;
    const leave = () => hostAction({ action: "leave" });

    if (snapshot.phase === "lobby") {
      return (
        <>
          <AppHeader
            code={snapshot.code}
            onBackToDozi={onBackToDozi}
            right={
              <Button variant="ghost" size="sm" onClick={leave}>
                Leave
              </Button>
            }
          />
          <main className="player-shell">
            <div className="player-scoreline">
              <span>{me.name}</span>
              <strong>{me.score.toLocaleString()} pts</strong>
            </div>
            <div className="player-wait-card">
              <div className="game-kicker">YOU’RE IN</div>
              <h1>{snapshot.title}</h1>
              <p>
                {snapshot.playerCount} players · {snapshot.total} questions
              </p>
              <div className="waiting-line">
                <span className="status-dot" />
                {snapshot.hostOnline ? "Waiting for the host to start" : "Waiting for the host to reconnect"}
                <span className="waiting-wave">···</span>
              </div>
            </div>
          </main>
        </>
      );
    }

    if (snapshot.phase === "question" && question) {
      return (
        <>
          <AppHeader
            code={snapshot.code}
            onBackToDozi={onBackToDozi}
            right={
              <Button variant="ghost" size="sm" onClick={leave}>
                Leave
              </Button>
            }
          />
          <main className="player-shell">
            <div className="player-scoreline">
              <span>{me.name}</span>
              <strong>{me.score.toLocaleString()} pts</strong>
            </div>
            <div className="stage-line">
              <span>
                QUESTION {snapshot.qIndex + 1} / {snapshot.total}
              </span>
              <span>{snapshot.playerCount} PLAYERS</span>
            </div>
            <div className={`player-countdown ${timeRemaining <= 5 ? "urgent" : ""}`}>
              {timeRemaining}
              <small>SEC</small>
            </div>
            <div className="timer-track">
              <i style={{ transform: `scaleX(${timerFill})` }} />
            </div>
            <h1 className="player-question">{question.text}</h1>
            <div className="player-options">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={snapshot.myChoice != null || busy}
                  className={`player-option ${snapshot.myChoice === index ? "chosen" : ""} ${
                    snapshot.myChoice != null && snapshot.myChoice !== index ? "faded" : ""
                  }`}
                  onClick={() => {
                    if (snapshot.myChoice == null) {
                      hostAction({ action: "answer", questionIndex: snapshot.qIndex, choice: index });
                    }
                  }}
                >
                  <span>{LETTERS[index]}</span>
                  {option}
                </button>
              ))}
            </div>
            {snapshot.myChoice != null && (
              <p className="answer-locked">
                <Check size={16} /> Answer locked in. Waiting for the others.
              </p>
            )}
          </main>
        </>
      );
    }

    if (snapshot.phase === "reveal" && question) {
      const last = snapshot.last ?? { q: snapshot.qIndex, choice: null, correct: false, points: 0, bonus: 0 };
      return (
        <>
          <AppHeader
            code={snapshot.code}
            onBackToDozi={onBackToDozi}
            right={
              <Button variant="ghost" size="sm" onClick={leave}>
                Leave
              </Button>
            }
          />
          <main className="player-shell">
            <div className="player-scoreline">
              <span>{me.name}</span>
              <strong>{me.score.toLocaleString()} pts</strong>
            </div>
            <div className={`player-result ${last.correct ? "right" : "wrong"}`}>
              <strong>
                {last.correct ? "Correct" : last.choice == null ? "Time’s up" : "Not quite"}
              </strong>
              {last.correct ? (
                <span>
                  +{last.points.toLocaleString()} pts{" "}
                  {last.bonus ? `· includes ${last.bonus} streak bonus` : ""}
                </span>
              ) : (
                <span>The right answer is highlighted below.</span>
              )}
            </div>
            <div className="player-options result-options">
              {question.options.map((option, index) => (
                <div
                  className={`player-option static ${
                    index === question.correct
                      ? "right-answer"
                      : index === last.choice
                      ? "wrong-answer"
                      : "faded"
                  }`}
                  key={index}
                >
                  <span>{LETTERS[index]}</span>
                  {option}
                </div>
              ))}
            </div>
            <div className="standing-card">
              <strong>
                {me.rank}
                {me.rank === 1 ? "st" : me.rank === 2 ? "nd" : me.rank === 3 ? "rd" : "th"}
              </strong>
              <span>{me.score.toLocaleString()} points</span>
            </div>
          </main>
        </>
      );
    }

    return (
      <>
        <AppHeader
          code={snapshot.code}
          onBackToDozi={onBackToDozi}
          right={
            <Button variant="ghost" size="sm" onClick={leave}>
              Leave
            </Button>
          }
        />
        <main className="player-shell">
          <section className="player-final">
            <span className="eyebrow">FINAL RESULT</span>
            <strong>
              {me.rank}
              {me.rank === 1 ? "st" : me.rank === 2 ? "nd" : me.rank === 3 ? "rd" : "th"}
            </strong>
            <span>of {snapshot.playerCount} players</span>
            <dl>
              <div>
                <dt>Score</dt>
                <dd>{me.score.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Correct</dt>
                <dd>
                  {me.correct} / {snapshot.total} (
                  {snapshot.total ? Math.round((me.correct / snapshot.total) * 100) : 0}%)
                </dd>
              </div>
            </dl>
          </section>
          <Button variant="outline" onClick={leave} className="mt-4">
            Leave room
          </Button>
        </main>
      </>
    );
  };

  const renderGame = () => {
    if (!session || !game) {
      return (
        <>
          <AppHeader onBackToDozi={onBackToDozi} />
          <main className="connecting-state">
            <div className="loading-mark">
              <Radio />
            </div>
            <h1>Connecting to room…</h1>
            <p>Checking your saved room pass.</p>
            {error && (
              <Button variant="outline" onClick={() => clearRoom()}>
                Back to quizzes
              </Button>
            )}
          </main>
        </>
      );
    }
    return session.role === "host" ? renderHost(game) : renderPlayer(game);
  };

  return (
    <div className="yapdash-app" data-theme="yapdash">
      {screen === "editor" ? renderEditor() : screen === "game" ? renderGame() : renderHome()}
      {error && screen !== "home" && (
        <div className="floating-error" role="alert">
          {error}
        </div>
      )}
      {toastText && (
        <div className="toast-note" role="status">
          {toastText}
        </div>
      )}
    </div>
  );
}
