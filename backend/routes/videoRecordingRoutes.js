import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  uploadVideoRecording,
  getVideoRecordings,
  deleteVideoRecording
} from "../controllers/videoRecordingController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");  // same uploads folder is fine
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".webm");
  }
});

const upload = multer({ storage });

router.post("/upload", authMiddleware, upload.single("video"), uploadVideoRecording);
router.get("/", authMiddleware, getVideoRecordings);
router.delete("/:id", authMiddleware, deleteVideoRecording);

export default router;