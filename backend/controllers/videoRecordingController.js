import VideoRecording from "../models/VideoRecording.js";

export const uploadVideoRecording = async (req, res) => {

  try {

    const { date, startTime, endTime, duration } = req.body;

    const recording = new VideoRecording({
      userId: req.userId,
      fileUrl: req.file.path,
      date,
      startTime,
      endTime,
      duration
    });

    await recording.save();

    res.json({ message: "Video recording saved" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const getVideoRecordings = async (req, res) => {

  try {

    const recordings = await VideoRecording
      .find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.json(recordings);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const deleteVideoRecording = async (req, res) => {

  try {

    const recording = await VideoRecording.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!recording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    res.json({ message: "Recording deleted" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};