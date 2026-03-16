import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// =====================
// SIGNUP
// =====================
export const signupUser = async (req, res) => {

  try {

    let {
      firstName,
      middleName,
      lastName,
      age,
      contactNumber,
      email,
      password
    } = req.body;

    // normalize email
    email = email.trim().toLowerCase();

    // validation
    if (!firstName || !lastName || !contactNumber || !email || !password) {
      return res.status(400).json({
        message: "Please fill all required fields"
      });
    }

    // check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user
    const newUser = new User({
      firstName,
      middleName,
      lastName,
      age,
      contactNumber,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully"
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({
      message: "Server error"
    });

  }

};


// =====================
// LOGIN
// =====================
export const loginUser = async (req, res) => {

  try {

    let { email, password } = req.body;

    email = email.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // create JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({
      message: "Server error"
    });

  }

};