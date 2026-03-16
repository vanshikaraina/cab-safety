import express from "express";
import Ride from "../models/Ride.js";
import User from "../models/User.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/dashboard
// Returns user profile + ride stats + recent rides
router.get("/", auth, async (req, res) => {
  try {

    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // All rides for this user
    const rides = await Ride.find({ userId: req.userId }).sort({ createdAt: -1 });

    const completed = rides.filter(r => r.status === "COMPLETED");
    const active    = rides.find(r => r.status === "ACTIVE") || null;

    // Total distance (sum of completed rides)
    const totalDistance = completed.reduce((sum, r) => {
      return sum + (parseFloat(r.distance) || 0);
    }, 0);

    // Total time in minutes
    const totalTime = completed.reduce((sum, r) => {
      if (r.startTime && r.endTime) {
        return sum + Math.round(
          (new Date(r.endTime) - new Date(r.startTime)) / 60000
        );
      }
      return sum + (r.expectedTime || 0);
    }, 0);

    res.json({
      user,
      stats: {
        totalRides: completed.length,
        totalDistance: totalDistance.toFixed(1),
        totalTime,
        activeRide: active ? active._id : null
      },
      recentRides: rides.slice(0, 5)
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
});

export default router;