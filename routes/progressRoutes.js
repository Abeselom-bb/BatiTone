import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import { summary } from "../controllers/progressController.js";
const r = Router();
r.get("/summary", requireAuth, summary);
export default r;
