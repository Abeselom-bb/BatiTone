import { customAlphabet } from "nanoid";
import Classroom from "../models/Classroom.js";
import Enrollment from "../models/Enrollment.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Attempt from "../models/Attempt.js";
import { z } from 'zod';

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export async function createClass(req, res) {
  const c = await Classroom.create({ name: req.body.name || "Class", code: nano(), teacherId: req.user.id });
  res.json(c);
}

export async function enroll(req, res) {
  const { code } = req.body;
  const cls = await Classroom.findOne({ code });
  if (!cls) return res.status(404).json({ message: "Class not found" });
  await Enrollment.findOneAndUpdate({ classId: cls._id, userId: req.user.id }, {}, { upsert: true, new: true });
  res.json({ ok: true, classId: cls._id });
}

export async function createAssignment(req, res) {
  const a = await Assignment.create({
    classId: req.body.classId,
    title: req.body.title,
    type: req.body.type,
    level: req.body.level || 1,
    count: req.body.count || 10,
    deadline: req.body.deadline ? new Date(req.body.deadline) : null
  });
  res.json(a);
}

export async function report(req, res) {
  const { classId } = req.query;
  const members = await Enrollment.find({ classId }).populate("userId","name email role");
  const users = members.map(m => m.userId?._id).filter(Boolean);
  const data = await Attempt.aggregate([
    { $match: { userId: { $in: users } } },
    { $group: { _id: { user: "$userId", type: "$type" }, total: { $sum: 1 }, correct: { $sum: { $cond: ["$isCorrect",1,0] } } } }
  ]);
  const byUser = {};
  data.forEach(d=>{
    const u = String(d._id.user);
    byUser[u] ||= {};
    byUser[u][d._id.type] = { total: d.total, correct: d.correct, accuracy: Math.round((d.correct/d.total)*100) };
  });
  res.json({ members: members.map(m=>({ id: m.userId._id, name: m.userId.name, email: m.userId.email })), byUser });
}

export async function submitAssignmentProgress(req, res) {
  const { assignmentId, attempts=0, correct=0 } = req.body;
  const sub = await Submission.findOneAndUpdate(
    { assignmentId, userId: req.user.id },
    { $inc: { attempts, correct } },
    { upsert: true, new: true }
  );
  res.json(sub);
}

// Use Zod/Joi schemas
const schema = z.object({
  email: z.string().email(),
  level: z.number().int().min(1).max(10)
});