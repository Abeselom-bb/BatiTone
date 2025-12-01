export default function requireTeacher(req, res, next) {
  if (req.user?.role === "teacher") return next();
  return res.status(403).json({ message: "Teacher only" });
}
