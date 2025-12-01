import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises"; // Use the promises API for async file operations
import { spawn } from "child-process-promise";
import { randomUUID } from "crypto";
import { logger } from '../utils/logger.js'; // Import the logger
import Score from "../models/Score.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* existing XML/MIDI upload (updated with better error handling) */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No file" });

    const { originalname, filename, mimetype } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    const isXml  = [".xml", ".musicxml", ".mxl"].includes(ext) || mimetype.includes("xml");
    const isMidi = [".mid", ".midi"].includes(ext) || mimetype.includes("midi");

    if (!isXml && !isMidi)
      return res.status(400).json({ ok: false, error: "Unsupported type" });

    const doc = await Score.create({
      userId: req.user.id,
      title: originalname.replace(ext, ""),
      origFilename: originalname,
      musicxmlUrl: isXml  ? `/files/${filename}` : undefined,
      midiUrl:     isMidi ? `/files/${filename}` : undefined,
      status: "ready",
    });

    return res.json({
      ok: true,
      scoreId: doc._id,
      xmlUrl: isXml ? `/files/${filename}` : undefined,
    });
  } catch (err) {
    logger.error('XML/MIDI upload failed', { 
      userId: req.user.id, 
      error: err.message,
      stack: err.stack 
    });
    return res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

/* NEW  PDF → XML  (safer names, light validation) */
router.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ ok: false, error: "No file" });

    const { originalname, mimetype, path: tmpPath } = req.file;

    const ext = path.extname(originalname).toLowerCase();
    const isPdf = ext === ".pdf" || mimetype.includes("pdf");
    if (!isPdf) {
      await fs.unlink(tmpPath).catch(() => {});
      return res
        .status(400)
        .json({ ok: false, error: "Only PDF files are allowed" });
    }

    // random safe filenames (don’t trust originalname)
    const base    = randomUUID();
    const pdfName = `${base}.pdf`;
    const xmlName = `${base}.xml`;

    const pdfPath = path.resolve("uploads", pdfName);
    const xmlPath = path.resolve("uploads", xmlName);

    // move uploaded file to our safe name
    await fs.rename(tmpPath, pdfPath);

    await spawn(
      "wine",
      [
        "/opt/pdf-to-music-pro/PdfToMusic Pro.exe",
        "/batch",
        pdfPath,
        "/exportxml",
        xmlPath,
      ],
      { cwd: process.cwd(), capture: ["stdout", "stderr"] }
    );

    if (!await fs.exists(xmlPath)) {
      return res.status(500).json({
        ok: false,
        error: "PDF conversion failed – please upload MusicXML",
      });
    }

    const doc = await Score.create({
      userId: req.user.id,
      title: originalname.replace(/\.pdf$/i, ""),
      origFilename: originalname,
      musicxmlUrl: `/files/${xmlName}`,
      status: "ready",
    });

    return res.json({ ok: true, scoreId: doc._id, xmlUrl: `/files/${xmlName}` });
  } catch (err) {
    logger.error('PDF conversion failed', { 
      userId: req.user.id, 
      error: err.message,
      stack: err.stack 
    });
    return res
      .status(500)
      .json({ ok: false, error: "Conversion failed – try MusicXML" });
  }
});

export default router;