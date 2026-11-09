export const ROOM_PLAYER_LIMIT = 100;
export const QUIZ_QUESTION_LIMIT = 100;
export const ROOM_IDLE_MS = 3 * 60 * 60 * 1000;
export const ANSWER_GRACE_MS = 400;

export function canAddPlayer(currentPlayers: number) {
  return Number.isSafeInteger(currentPlayers) && currentPlayers >= 0 && currentPlayers < ROOM_PLAYER_LIMIT;
}

export function canAnswerAt(now: number, deadline: number) {
  return now <= deadline + ANSWER_GRACE_MS;
}

export type QuizQuestion = {
  text: string;
  options: string[];
  correct: number;
  time: number;
};

export type Quiz = { title: string; questions: QuizQuestion[] };

export type RoomSnapshot = {
  role: "host" | "player";
  code: string;
  phase: "lobby" | "question" | "reveal" | "final";
  title: string;
  total: number;
  qIndex: number;
  serverNow: number;
  endsAt: number;
  question?: QuizQuestion | null;
  players?: Array<{ id: string; name: string; score: number; correct: number; rank: number; connected: boolean; answered: boolean }>;
  connectedCount?: number;
  answered?: number;
  counts?: number[] | null;
  top?: Array<{ id: string; name: string; score: number; correct: number; rank: number }>;
  breakdown?: Array<{ text: string; correct: number; answered: number; total: number } | null>;
  hostOnline?: boolean;
  playerCount?: number;
  me?: { id: string; name: string; score: number; rank: number; correct: number; streak: number };
  myChoice?: number | null;
  last?: { q: number; choice: number | null; correct: boolean; points: number; bonus: number };
  behind?: number | null;
};

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return Array.from(
    value
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, max)
    .join("");
}

export function validateQuiz(value: unknown): Quiz | null {
  if (!value || typeof value !== "object") return null;
  const source = value as { title?: unknown; questions?: unknown };
  if (!Array.isArray(source.questions) || source.questions.length < 1 || source.questions.length > QUIZ_QUESTION_LIMIT) return null;
  const questions: QuizQuestion[] = [];
  for (const item of source.questions) {
    if (!item || typeof item !== "object") return null;
    const raw = item as { text?: unknown; options?: unknown; correct?: unknown; time?: unknown };
    if (!Array.isArray(raw.options)) return null;
    const text = cleanText(raw.text, 300);
    const options = raw.options.map((option) => cleanText(option, 120));
    const correct = Number(raw.correct);
    const rawTime = Number(raw.time);
    const time = Math.min(120, Math.max(5, Math.round(Number.isFinite(rawTime) ? rawTime : 20)));
    if (!text || options.length < 2 || options.length > 4 || options.some((option) => !option)) return null;
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
    questions.push({ text, options, correct, time });
  }
  return { title: cleanText(source.title, 80) || "Untitled quiz", questions };
}

export function pointsForCorrectAnswer(elapsedMs: number, timeLimitSeconds: number, streak: number) {
  const remaining = 1 - elapsedMs / (timeLimitSeconds * 1000);
  const base = Math.round(500 + 500 * Math.max(0, Math.min(1, remaining)));
  const bonus = Math.min(Math.max(0, streak - 1) * 50, 250);
  return { base, bonus, total: base + bonus };
}

export function standings<T extends { id: string; name: string; score: number; correct: number }>(players: T[]) {
  const rows = [...players].sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name));
  let rank = 0;
  let previousScore: number | null = null;
  let previousCorrect: number | null = null;
  return rows.map((player, index) => {
    if (player.score !== previousScore || player.correct !== previousCorrect) {
      rank = index + 1;
      previousScore = player.score;
      previousCorrect = player.correct;
    }
    return { ...player, rank };
  });
}

export function csvCell(value: unknown) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}