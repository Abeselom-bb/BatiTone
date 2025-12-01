// controllers/progressController.js
import Attempt from "../models/Attempt.js";
import { logger } from "../utils/logger.js";

export async function summary(req, res) {
  try {
    const userId = req.user.id;

    // 1) Get all attempts for this user
    const attempts = await Attempt.find({ userId }).lean();

    // 2) Aggregate by type
    const byType = {};
    let total = 0;
    let correctTotal = 0;

    for (const a of attempts) {
      const t = a.type;
      if (!byType[t]) byType[t] = { total: 0, correct: 0 };
      byType[t].total++;
      if (a.isCorrect) {
        byType[t].correct++;
        correctTotal++;
      }
      total++;
    }

    // compute per-type accuracy
    for (const t in byType) {
      const d = byType[t];
      d.accuracy = Math.round((d.correct / (d.total || 1)) * 100);
    }

    // 3) Infer current level per type (last attempt’s level or 1)
    const types = ["note", "interval", "melody", "chord", "rhythm"];
    const levels = {};
    for (const t of types) {
      const last = await Attempt.findOne({ userId, type: t })
        .sort({ createdAt: -1 })
        .lean();
      levels[t] = last?.level || 1;
    }

    const accuracy = total
      ? Math.round((correctTotal / total) * 100)
      : 0;

    logger.info("Progress summary OK", { userId, total, accuracy });

    return res.json({ total, accuracy, byType, levels });
  } catch (err) {
    logger.error("Progress summary failed", {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal error"
          : err.message,
    });
  }
}
