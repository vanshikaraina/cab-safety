// models/SOSEvent.js
import mongoose from "mongoose";

const SOSEventSchema = new mongoose.Schema({
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    index:    true,
  },
type: {
  type:    String,
  enum:    ["manual", "auto", "stopped", "dismissed", "shake", "volume", "crash", "countdown", "fake_call"],
  default: "manual",
},
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  locationLabel:   { type: String,   default: null },
  contactsAlerted: { type: [String], default: []   },
  rideId: {
    type:    mongoose.Schema.Types.ObjectId,
    ref:     "Ride",
    default: null,
  },
  triggeredAt: { type: Date, default: Date.now },
});

// Auto-delete events older than 90 days
SOSEventSchema.index(
  { triggeredAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

export default mongoose.model("SOSEvent", SOSEventSchema);