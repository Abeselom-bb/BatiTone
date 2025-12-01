import Attempt from "../models/Attempt.js";
import { generate } from "./exerciseGen.js";
import { z } from 'zod';

const MAX_BY_TYPE = { note: 10, interval: 12, melody: 15, chord: 20, rhythm: 8 };
const MIN_LEVEL = 1;
const SESSION_TOTAL = 7;                         // 7 questions per session
const DEMOTE_WRONG_COUNT = Math.ceil(0.4 * SESSION_TOTAL); // ≥40% wrong → demote (3/7)

function norm(x){
  if (Array.isArray(x)) return x.map(v => String(v).trim().toLowerCase());
  if (typeof x === "object") return JSON.parse(JSON.stringify(x));
  return String(x).trim().toLowerCase();
}

function grade(type, target = {}, userAnswer = {}) {
  if (type === "rhythm") {
    const a = (target.units || []).join(",");
    const b = (userAnswer.units || []).join(",");
    return a === b;
  } else if (type === "chord" || type === "melody") {
    const a = norm(target.notes || []);
    const b = norm(userAnswer.notes || []);
    return JSON.stringify(a) === JSON.stringify(b);
  } else if (type === "interval" || type === "note") {
    const a = norm(target.answer || []);
    const b = norm(userAnswer.answer || []);
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

async function currentLevel(userId, type) {
  const last = await Attempt.findOne({ userId, type }).sort({ createdAt: -1 }).lean();
  return last?.level ?? 1;
}

function computeNextLevelFromHistory(recent, prevLevel, type) {
  const max = MAX_BY_TYPE[type] ?? 10;
  const last5 = recent.slice(0,5);
  const last5Correct = last5.filter(a => a.isCorrect).length;
  const acc10 = recent.length ? recent.filter(a => a.isCorrect).length / recent.length : 0;

  let streak = 0;
  for (const a of recent) { if (a.isCorrect) streak++; else break; }

  let next = prevLevel;
  if (streak >= 3 || (last5.length === 5 && last5Correct >= 4)) next = Math.min(max, prevLevel + 1);
  else if (recent.length === 10 && acc10 < 0.4)               next = Math.max(MIN_LEVEL, prevLevel - 1);
  return next;
}

// -------- routes --------
export async function newExercise(req, res) {
  const { type = "note", level } = req.query;
  const lvl = req.user?.id ? await currentLevel(req.user.id, type) : Number(level) || 1;
  const payload = generate(type, Number(lvl));
  res.json({ type, level: Number(lvl), key: "C", ...payload });
}

export async function submitAnswer(req, res) {
  const { type, level, target = {}, userAnswer = {}, playback, key, tempo, durationMs=0, sessionId } = req.body;

  const attemptedLevel = req.user?.id ? await currentLevel(req.user.id, type) : Number(level) || 1;
  const isCorrect = grade(type, target, userAnswer);

  // save attempt (includes sessionId)
  await Attempt.create({
    userId: req.user.id,
    type, level: attemptedLevel, sessionId: sessionId || null,
    target, userAnswer, isCorrect,
    playback: playback || "melodic", key: key || "C", tempo: tempo || 90, durationMs
  });

  // base next level = promotion/demotion by recent history
  const recent = await Attempt.find({ userId: req.user.id, type }).sort({ createdAt: -1 }).limit(10).lean();
  let nextLevel = computeNextLevelFromHistory(recent, attemptedLevel, type);

  // session-based demotion (≥40% wrong in 7)
  let sessionInfo = { index: 1, total: SESSION_TOTAL, willDemoteNext: false };
  if (sessionId) {
    const sess = await Attempt.find({ userId: req.user.id, type, sessionId }).sort({ createdAt: -1 }).lean();
    const n = sess.length;
    const wrong = sess.filter(a => !a.isCorrect).length;
    sessionInfo = {
      index: n,                     // answered so far (this one included)
      total: SESSION_TOTAL,
      willDemoteNext: (SESSION_TOTAL - n === 1) && (wrong + 1 >= DEMOTE_WRONG_COUNT) // next miss would demote
    };

    if (n >= SESSION_TOTAL && wrong >= DEMOTE_WRONG_COUNT) {
      nextLevel = Math.max(MIN_LEVEL, attemptedLevel - 1);  // demote 1 level
    }
  }
  console.log('>>> INSERTED attempt:', { userId: req.user.id, type, level, isCorrect });

  res.json({ isCorrect, nextLevel, session: sessionInfo });

  
}

export async function recordAttempt(req, res) {
  try {
    const {
      type,
      level = 1,
      isCorrect = false,
      target = {},
      userAnswer = {},
    } = req.body;

    if (!type) {
      return res.status(400).json({ error: "type is required" });
    }

    await Attempt.create({
      userId: req.user.id,
      type,
      level,
      isCorrect: !!isCorrect,   // <-- ensure true/false
      target,
      userAnswer,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("recordAttempt failed:", err);
    return res.status(500).json({ error: "Could not record attempt" });
  }
}


// Use Zod/Joi schemas
const schema = z.object({
  email: z.string().email(),
  level: z.number().int().min(1).max(10)
});