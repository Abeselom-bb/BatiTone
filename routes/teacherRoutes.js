import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import requireTeacher from "../middleware/requireTeacher.js";
import { createClass, enroll, createAssignment, report, submitAssignmentProgress } from "../controllers/teacherController.js";

const r = Router();
r.post("/classrooms", requireAuth, requireTeacher, createClass);
r.post("/enroll", requireAuth, enroll); // students use code
r.post("/assignments", requireAuth, requireTeacher, createAssignment);
r.get("/reports", requireAuth, requireTeacher, report);
r.post("/submit", requireAuth, submitAssignmentProgress);
export default r;
