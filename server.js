// server.js (ESM)

// Load .env FIRST
import "dotenv/config";

import express from "express";
import morgan from "morgan";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import exerciseRoutes from "./routes/exerciseRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import scoresRouter from "./routes/scores.js";
import auth from "./middleware/auth.js";

// Connect to database
await connectDB();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(morgan("dev"));
app.use(express.json());

// Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(join(__dirname, "public")));
app.use("/files", express.static(resolve("uploads"))); // uploaded files folder

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/scores", auth, scoresRouter); // protected route

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
