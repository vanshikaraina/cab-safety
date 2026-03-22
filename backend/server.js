import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import rideRoutes from "./routes/rideRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import recordingRoutes from "./routes/recordingRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import callAiRoutes from "./routes/callAiRoutes.js";

dotenv.config();

const app = express();

// connect database
connectDB();

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/callai", callAiRoutes);

// serve uploaded audio
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Cab Safety Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});