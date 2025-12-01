import mongoose from "mongoose";
const assignmentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
    title: String,
    type: { type: String, enum: ["note","interval","chord","rhythm","melody"] },
    level: { type: Number, default: 1 },
    count: { type: Number, default: 10 },
    deadline: Date
  },
  { timestamps: true }
);
export default mongoose.model("Assignment", assignmentSchema);
