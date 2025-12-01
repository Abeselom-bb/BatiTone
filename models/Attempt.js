import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["note","interval","chord","rhythm","melody"], required: true },
    level: { type: Number, default: 1 },
    sessionId: { type: String, default: null },          // <— NEW
    target: { type: Object, default: {} },
    userAnswer: { type: Object, default: {} },
    isCorrect: { type: Boolean, default: false },
    durationMs: { type: Number, default: 0 },
    key: { type: String, default: "C" },
    tempo: { type: Number, default: 90 },
    playback: { type: String, enum: ["melodic","harmonic"], default: "melodic" }
  },
  { timestamps: true }
);

export default mongoose.model("Attempt", attemptSchema);
