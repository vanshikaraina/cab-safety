import Recording from "../models/Recording.js";

export const uploadRecording = async (req, res) => {

  try {

    const { date, startTime, endTime, duration } = req.body;

    const recording = new Recording({
      userId: req.userId,   // from auth middleware
      fileUrl: req.file.path,
      date,
      startTime,
      endTime,
      duration
    });

    await recording.save();

    res.json({ message: "Recording saved" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


export const getRecordings = async (req, res) => {

  try {

    const recordings = await Recording
      .find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.json(recordings);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};

export const deleteRecording = async (req, res) => {

  try {

    const recording = await Recording.findOneAndDelete({
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