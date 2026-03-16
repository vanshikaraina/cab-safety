import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    fileUrl: {
      type: String,
      required: true
    },

    date: {
      type: String,
      required: true
    },

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    duration: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Recording = mongoose.model("Recording", recordingSchema);

export default Recording;