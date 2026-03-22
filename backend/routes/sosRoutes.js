// routes/sosRoutes.js
import express from "express";
import User from "../models/User.js";
import SOSEvent from "../models/SOSEvent.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();
// GET /api/sos/log — fetch SOS history for logged-in user
router.get("/log", auth, async (req, res) => {
  try {
    const events = await SOSEvent.find({ user: req.userId }) // ✅ fixed
      .sort({ triggeredAt: -1 })
      .limit(50)
      .lean();
    res.json(events);
  } catch (err) {
    console.error("SOS log fetch error:", err);
    res.status(500).json({ message: "Could not fetch SOS log." });
  }
});

// POST /api/sos/log — save a new SOS event
router.post("/log", auth, async (req, res) => {
  try {
    const { type, lat, lng, locationLabel, contactsAlerted, rideId } = req.body;
    const event = await SOSEvent.create({
      user:            req.userId, // ✅ fixed
      type:            type || "manual",
      location:        { lat: lat || null, lng: lng || null },
      locationLabel:   locationLabel || null,
      contactsAlerted: contactsAlerted || [],
      rideId:          rideId || null,
      triggeredAt:     new Date(),
    });
    res.status(201).json(event);
  } catch (err) {
    console.error("SOS log create error:", err);
    res.status(500).json({ message: "Could not save SOS event." });
  }
});

// DELETE /api/sos/log — clear all SOS history for the user
router.delete("/log", auth, async (req, res) => {
  try {
    await SOSEvent.deleteMany({ user: req.userId }); // ✅ fixed
    res.json({ message: "SOS history cleared." });
  } catch (err) {
    console.error("SOS log delete error:", err);
    res.status(500).json({ message: "Could not clear SOS log." });
  }
});

export default router;