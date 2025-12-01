import mongoose from "mongoose";
const classroomSchema = new mongoose.Schema(
  {
    name: String,
    code: { type: String, unique: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);
export default mongoose.model("Classroom", classroomSchema);

