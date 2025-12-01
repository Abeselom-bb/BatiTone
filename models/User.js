import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], default: "student" },
    // NEW
    isVerified: { type: Boolean, default: true },   // <─ double opt-in
    verifyToken: String,                              // short JWT
    verifyExpires: Date,
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
