import express from "express";
import { signupUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// USER SIGNUP
router.post("/signup", signupUser);

// USER LOGIN
router.post("/login", loginUser);

export default router;