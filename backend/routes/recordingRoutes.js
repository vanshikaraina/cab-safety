import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  uploadRecording,
  getRecordings,
  deleteRecording
} from "../controllers/recordingController.js";

const router = express.Router();


// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".webm");
  }
});

const upload = multer({ storage });


// Upload audio recording
router.post(
  "/upload",
  authMiddleware,
  upload.single("audio"),
  uploadRecording
);


// Get recordings for logged-in user
router.get(
  "/",
  authMiddleware,
  getRecordings
);


// Delete recording
router.delete(
  "/:id",
  authMiddleware,
  deleteRecording
);


export default router;