import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "validator";
const { isEmail } = pkg;

import User from "../models/User.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/mailer.js";

import { isDisposable } from "../utils/disposable.js";

// helper: sign auth token
function signAuthToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ---------- REGISTER (no email verification) ----------
export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    if (isDisposable(email)) {
      return res
        .status(400)
        .json({ message: "Disposable email addresses are not allowed" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

        await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role === "teacher" ? "teacher" : "student",
      // user can log in immediately
    });

    // send welcome email (non-blocking)
    try {
      await sendVerificationEmail(email.toLowerCase());
    } catch (err) {
      console.error("Error sending welcome email:", err);
    }

    return res
      .status(201)
      .json({ message: "Account created. You can log in now." });


  } catch (err) {
    console.error("register error:", err);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
}

// ---------- LOGIN ----------
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ message: "Invalid email or password" });
    }

    const token = signAuthToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
}

// ---------- FORGOT PASSWORD ----------
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // do not leak which emails exist
      return res.status(200).json({
        message: "If that email is registered, we have sent a reset link.",
      });
    }

    // short-lived token
    const resetToken = jwt.sign(
      { uid: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const base = process.env.CLIENT_URL || "http://localhost:3000";
    const resetURL = `${base}/reset-password.html?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, resetURL);

    return res.status(200).json({
      message: "If that email is registered, we have sent a reset link.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res
      .status(500)
      .json({ message: "Server error during password reset request" });
  }
}

// ---------- RESET PASSWORD ----------
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findOne({
      _id: payload.uid,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      message: "Password updated. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res
      .status(500)
      .json({ message: "Server error during password reset" });
  }
}
