import mongoose from "mongoose";

const partSchema = new mongoose.Schema({
  name: String,
  midiUrl: String,
});

const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  origFilename: String,
  musicxmlUrl: String,
  midiUrl: String,
  parts: [partSchema],
  status: { type: String, enum: ["uploaded","processing","ready","failed"], default: "uploaded" },
  error: String
}, { timestamps: true });

export default mongoose.model("Score", scoreSchema);