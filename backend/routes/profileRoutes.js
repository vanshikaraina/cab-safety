import express from "express";
import auth from "../middleware/authMiddleware.js";

import {
  getProfile,
  updateProfile,
  changePassword,
  updateEmergencyContacts,
  triggerSOS
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/", auth, getProfile);
router.put("/update", auth, updateProfile);
router.put("/change-password", auth, changePassword);
router.put("/emergency-contacts", auth, updateEmergencyContacts);
router.post("/sos", auth, triggerSOS);

export default router;