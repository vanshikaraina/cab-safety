import express from "express";
import Ride from "../models/Ride.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

// ── START RIDE ─────────────────────────────────────────
router.post("/start", auth, async (req, res) => {
  try {
    const {
      lat, lng,
      destLat, destLng,
      destinationName,
      vehicleType,
      distance,
      expectedTime
    } = req.body;

    const ride = new Ride({
      userId: req.userId,
      startLocation: { lat, lng },
      endLocation: { lat: destLat, lng: destLng },
      destinationName,
      vehicleType,
      distance,
      expectedTime,
      status: "ACTIVE",
      startTime: new Date()
    });

    await ride.save();

    res.status(201).json({
      message: "Ride started successfully",
      ride
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error starting ride",
      error: err
    });
  }
});


// ── GET RIDE ───────────────────────────────────────────
router.get("/:rideId", async (req, res) => {
  try {

    const ride = await Ride.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    res.json(ride);

  } catch (err) {

    res.status(500).json({
      message: "Error fetching ride",
      error: err
    });

  }
});


// ── UPDATE LOCATION ────────────────────────────────────
router.post("/update-location", async (req, res) => {
  try {

    const { rideId, lat, lng } = req.body;

    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { currentLocation: { lat, lng } },
      { new: true }
    );

    res.json(ride);

  } catch (err) {

    res.status(500).json({
      message: "Error updating location",
      error: err
    });

  }
});


// ── STOP RIDE ──────────────────────────────────────────
router.post("/stop", async (req, res) => {
  try {

    const { rideId, actualDistance } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const endTime = new Date();

    const actualTime = ride.startTime
      ? Math.round((endTime - new Date(ride.startTime)) / 60000)
      : null;

    ride.status = "COMPLETED";
    ride.endTime = endTime;
    ride.actualTime = actualTime;

    if (actualDistance !== undefined && actualDistance !== null) {
      ride.actualDistance = parseFloat(actualDistance);
    }

    await ride.save();

    res.json({
      message: "Ride completed",
      ride
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Error stopping ride",
      error: err
    });

  }
});

export default router;