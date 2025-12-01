import mongoose from "mongoose";
const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 }
  },
  { timestamps: true }
);
export default mongoose.model("Submission", submissionSchema);
