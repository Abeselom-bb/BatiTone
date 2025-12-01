// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";   // so we can fetch fresh user

// Ensure JWT_SECRET is configured at startup
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing");
}

export default async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user to check verification flag
    const user = await User.findById(payload.id).lean();
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
/*
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your e-mail first" });
    }
*/
    // Attach minimal user info to request
    req.user = { id: user._id, role: user.role };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
