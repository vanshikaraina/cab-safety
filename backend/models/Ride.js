import mongoose from "mongoose";

const rideSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },

  startLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },

  endLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },

  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },

  destinationName: { type: String, default: "" },
  vehicleType:     { type: String, default: "" },

  // planned values set at ride start
  distance:        { type: String, default: "0" },
  expectedTime:    { type: Number, default: 0 },

  // actual values filled when ride stops
  actualDistance:  { type: Number, default: null },
  actualTime:      { type: Number, default: null },

  status: {
    type: String,
    enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
    default: "ACTIVE"
  },

  startTime: { type: Date, default: Date.now },
  endTime:   { type: Date }

}, { timestamps: true });

const Ride = mongoose.model("Ride", rideSchema);

export default Ride;