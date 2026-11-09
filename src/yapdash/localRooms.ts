import {
  canAnswerAt,
  canAddPlayer,
  cleanText,
  pointsForCorrectAnswer,
  standings,
  validateQuiz,
  type Quiz,
  type RoomSnapshot,
} from '@/lib/quiz-domain';

type Player = {
  id: string;
  name: string;
  token: string;
  score: number;
  correct: number;
  streak: number;
  last: { q: number; choice: number | null; correct: boolean; points: number; bonus: number } | null;
};

type StoredRoom = {
  code: string;
  hostKey: string;
  quiz: Quiz;
  phase: 'lobby' | 'question' | 'reveal' | 'final';
  players: Player[];
  qIndex: number;
  qStart: number;
  qEnd: number;
  answers: Record<string, { choice: number; at: number }>;
  counts: number[] | null;
  qStats: Array<{ text: string; correct: number; answered: number; total: number } | null>;
  lastActivity: number;
};

const ROOMS_KEY = 'yapdash.local_rooms.v1';
const activeRooms = new Map<string, StoredRoom>();

function loadRooms(): void {
  try {
    const raw = window.localStorage.getItem(ROOMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, StoredRoom>;
      Object.entries(parsed).forEach(([code, r]) => {
        activeRooms.set(code, r);
      });
    }
  } catch {
    // Ignore
  }
}

function saveRooms(): void {
  try {
    const obj: Record<string, StoredRoom> = {};
    activeRooms.forEach((r, code) => {
      obj[code] = r;
    });
    window.localStorage.setItem(ROOMS_KEY, JSON.stringify(obj));
  } catch {
    // Ignore
  }
}

// Initial load
if (typeof window !== 'undefined') {
  loadRooms();
}

function generateCode(): string {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (activeRooms.has(code));
  return code;
}

function makeSnapshot(
  room: StoredRoom,
  role: 'host' | 'player',
  player: Player | null
): RoomSnapshot {
  const currentQ = room.quiz.questions[room.qIndex] ?? null;
  const serverNow = Date.now();

  const playerRanks = standings(room.players);
  const myRankEntry = player ? playerRanks.find((p) => p.id === player.id) : null;
  const myRank = myRankEntry ? myRankEntry.rank : 1;

  let behind: number | null = null;
  if (player && myRank > 1) {
    const ahead = playerRanks.find((p) => p.rank === myRank - 1);
    if (ahead) behind = ahead.score - player.score;
  }

  const myChoice = player ? room.answers[player.id]?.choice ?? null : null;

  return {
    code: room.code,
    role,
    phase: room.phase,
    title: room.quiz.title,
    playerCount: room.players.length,
    total: room.quiz.questions.length,
    qIndex: room.qIndex,
    endsAt: room.qEnd,
    serverNow,
    hostOnline: true,
    question:
      room.phase === 'question' || room.phase === 'reveal'
        ? currentQ
          ? {
              text: currentQ.text,
              options: currentQ.options,
              correct: role === 'host' || room.phase === 'reveal' ? currentQ.correct : -1,
              time: currentQ.time,
            }
          : null
        : null,
    counts: room.counts,
    answered: Object.keys(room.answers).length,
    players:
      role === 'host'
        ? room.players.map((p) => {
            const found = playerRanks.find((r) => r.id === p.id);
            return {
              id: p.id,
              name: p.name,
              score: p.score,
              rank: found ? found.rank : 1,
              correct: p.correct,
              answered: Object.hasOwn(room.answers, p.id),
              connected: true,
            };
          })
        : undefined,
    me: player
      ? {
          id: player.id,
          name: player.name,
          score: player.score,
          correct: player.correct,
          rank: myRank,
          streak: player.streak,
        }
      : undefined,
    myChoice,
    last: player?.last ?? undefined,
    top: playerRanks.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      correct: p.correct,
      rank: p.rank,
    })),
    behind,
    breakdown:
      role === 'host' && room.phase === 'final'
        ? room.qStats.map((st) =>
            st
              ? {
                  text: st.text,
                  correct: st.correct,
                  answered: st.answered,
                  total: st.total,
                }
              : null
          )
        : undefined,
  };
}

function settleTimer(room: StoredRoom, force = false): boolean {
  if (room.phase !== 'question') return false;
  const now = Date.now();
  const allAnswered = room.players.length > 0 && Object.keys(room.answers).length >= room.players.length;

  if (force || now >= room.qEnd || allAnswered) {
    const q = room.quiz.questions[room.qIndex];
    if (!q) return false;

    room.phase = 'reveal';
    const counts = [0, 0, 0, 0];
    let correctCount = 0;

    room.players.forEach((p) => {
      const ans = room.answers[p.id];
      const choice = ans ? ans.choice : null;
      if (choice !== null && counts[choice] !== undefined) {
        counts[choice]++;
      }

      const isCorrect = choice === q.correct;
      let points = 0;
      let bonus = 0;

      if (isCorrect) {
        correctCount++;
        const elapsed = ans ? Math.max(0, ans.at - room.qStart) : q.time * 1000;
        const res = pointsForCorrectAnswer(elapsed, q.time, p.streak);
        points = res.total;
        bonus = res.bonus;
        p.score += points;
        p.correct += 1;
        p.streak += 1;
      } else {
        p.streak = 0;
      }

      p.last = {
        q: room.qIndex,
        choice,
        correct: isCorrect,
        points,
        bonus,
      };
    });

    room.counts = counts;
    room.qStats[room.qIndex] = {
      text: q.text,
      correct: correctCount,
      answered: Object.keys(room.answers).length,
      total: room.players.length,
    };
    saveRooms();
    return true;
  }
  return false;
}

export async function createRoom(args: { data: { quiz: Quiz } }) {
  loadRooms();
  const valid = validateQuiz(args.data.quiz);
  if (!valid) throw new Error('Invalid quiz');

  const code = generateCode();
  const hostKey = crypto.randomUUID();

  const room: StoredRoom = {
    code,
    hostKey,
    quiz: valid,
    phase: 'lobby',
    players: [],
    qIndex: -1,
    qStart: 0,
    qEnd: 0,
    answers: {},
    counts: null,
    qStats: [],
    lastActivity: Date.now(),
  };

  activeRooms.set(code, room);
  saveRooms();

  return {
    code,
    hostKey,
    snapshot: makeSnapshot(room, 'host', null),
  };
}

export async function joinRoom(args: { data: { code: string; name: string; playerToken?: string } }) {
  loadRooms();
  const code = args.data.code.replace(/\D/g, '').slice(0, 6);
  const name = cleanText(args.data.name, 20);
  if (!name) throw new Error('Enter a name to join.');

  const room = activeRooms.get(code);
  if (!room) throw new Error('Quiz room not found. Check the code.');

  let player = args.data.playerToken
    ? room.players.find((p) => p.token === args.data.playerToken)
    : undefined;

  if (!player) {
    if (!canAddPlayer(room.players.length)) throw new Error('This room is full.');
    const token = crypto.randomUUID();
    player = {
      id: crypto.randomUUID().slice(0, 8),
      name,
      token,
      score: 0,
      correct: 0,
      streak: 0,
      last: null,
    };
    room.players.push(player);
  } else {
    player.name = name;
  }

  room.lastActivity = Date.now();
  saveRooms();

  return {
    token: player.token,
    playerId: player.id,
    snapshot: makeSnapshot(room, 'player', player),
  };
}

export async function readRoom(args: { data: { code: string; role: 'host' | 'player'; credential: string } }) {
  loadRooms();
  const code = args.data.code.replace(/\D/g, '').slice(0, 6);
  const room = activeRooms.get(code);
  if (!room) throw new Error('Room connection lost or closed.');

  settleTimer(room);

  let player: Player | null = null;
  if (args.data.role === 'player') {
    player = room.players.find((p) => p.token === args.data.credential) || null;
    if (!player) throw new Error('Session invalid. Please rejoin.');
  }

  return makeSnapshot(room, args.data.role, player);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function actInRoom(args: { data: { code: string; role: 'host' | 'player'; credential: string; action: any } }) {
  loadRooms();
  const code = args.data.code.replace(/\D/g, '').slice(0, 6);
  const room = activeRooms.get(code);
  if (!room) throw new Error('Room no longer active.');

  const action = args.data.action;
  const now = Date.now();
  room.lastActivity = now;

  let player: Player | null = null;
  if (args.data.role === 'player') {
    player = room.players.find((p) => p.token === args.data.credential) || null;
  }

  if (action.action === 'tick') {
    settleTimer(room);
  } else if (action.action === 'heartbeat') {
    // heartbeats keep presence
    settleTimer(room);
  } else if (action.action === 'answer' && player) {
    if (room.phase === 'question' && action.questionIndex === room.qIndex && !room.answers[player.id]) {
      if (canAnswerAt(now, room.qEnd)) {
        room.answers[player.id] = { choice: action.choice, at: now };
        settleTimer(room);
      }
    }
  } else if (args.data.role === 'host') {
    if (action.action === 'start') {
      if (room.phase === 'lobby') {
        const firstQ = room.quiz.questions[0];
        if (firstQ) {
          room.phase = 'question';
          room.qIndex = 0;
          room.qStart = now;
          room.qEnd = now + firstQ.time * 1000;
          room.answers = {};
          room.counts = null;
        }
      }
    } else if (action.action === 'skip') {
      settleTimer(room, true);
    } else if (action.action === 'next') {
      if (room.phase === 'reveal') {
        const nextIdx = room.qIndex + 1;
        if (nextIdx >= room.quiz.questions.length) {
          room.phase = 'final';
        } else {
          const nextQ = room.quiz.questions[nextIdx];
          if (nextQ) {
            room.phase = 'question';
            room.qIndex = nextIdx;
            room.qStart = now;
            room.qEnd = now + nextQ.time * 1000;
            room.answers = {};
            room.counts = null;
          }
        }
      }
    } else if (action.action === 'restart') {
      room.phase = 'lobby';
      room.qIndex = -1;
      room.answers = {};
      room.counts = null;
      room.qStats = [];
      room.players.forEach((p) => {
        p.score = 0;
        p.correct = 0;
        p.streak = 0;
        p.last = null;
      });
    } else if (action.action === 'end') {
      activeRooms.delete(code);
      saveRooms();
      return { ended: true };
    }
  }

  saveRooms();
  return makeSnapshot(room, args.data.role, player);
}
