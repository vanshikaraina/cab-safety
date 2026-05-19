import mongoose from "mongoose";

const videoRecordingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileUrl: { type: String, required: true },
  date: String,
  startTime: String,
  endTime: String,
  duration: Number,
}, { timestamps: true });

export default mongoose.model("VideoRecording", videoRecordingSchema);