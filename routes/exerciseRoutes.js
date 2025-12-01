import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import {
  newExercise,
  submitAnswer,
  recordAttempt,        // <-- NEW
} from "../controllers/exerciseController.js";

const r = Router();

r.get("/new", requireAuth, newExercise);
r.post("/answer", requireAuth, submitAnswer);

// practice-page attempts (simple log, no level logic)
r.post("/attempt", requireAuth, recordAttempt);  // <-- NEW

export default r;
