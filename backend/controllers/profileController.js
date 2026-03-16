import User from "../models/User.js";
import bcrypt from "bcryptjs";
import axios from "axios";


// ── GET PROFILE ─────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {

    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
};


// ── UPDATE PROFILE ──────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {

    const {
      firstName, middleName, lastName, age,
      contactNumber, vehicleType, nightRider,
      notifications, profilePhoto
    } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.userId,
      {
        firstName,
        middleName,
        lastName,
        age,
        contactNumber,
        vehicleType,
        nightRider,
        notifications,
        profilePhoto
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Profile updated",
      user: updated
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
};


// ── CHANGE PASSWORD ─────────────────────────────────────
export const changePassword = async (req, res) => {
  try {

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect"
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({
      message: "Password changed successfully"
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
};


// ── UPDATE EMERGENCY CONTACTS ───────────────────────────
export const updateEmergencyContacts = async (req, res) => {
  try {

    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length > 3) {
      return res.status(400).json({
        message: "Provide an array of up to 3 contacts"
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { emergencyContacts: contacts },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Emergency contacts updated",
      user: updated
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
};



// ── SEND SMS VIA FAST2SMS ───────────────────────────────
async function sendSMS(phoneNumbers, message) {

  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.warn("FAST2SMS_API_KEY not set in .env — SMS skipped");
    return { success: false, reason: "No API key" };
  }

  const cleanedNumbers = phoneNumbers
    .map(p => p.replace(/\D/g, ""))
    .map(p => {
      if (p.startsWith("91") && p.length === 12) return p.slice(2);
      if (p.startsWith("0")) return p.slice(1);
      return p;
    })
    .filter(p => p.length === 10)
    .join(",");

  if (!cleanedNumbers) {
    return { success: false, reason: "No valid numbers" };
  }

  try {

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message,
        numbers: cleanedNumbers,
        flash: 0
      },
      {
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log("Fast2SMS response:", response.data);

    return { success: true, data: response.data };

  } catch (err) {

    console.error("Fast2SMS error:", err.response?.data || err.message);

    return {
      success: false,
      reason: err.message
    };

  }
}

// ── SOS ─────────────────────────────────────────────────
export const triggerSOS = async (req, res) => {
  try {

    const { lat, lng, rideId } = req.body;

    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({
        message: "No emergency contacts set. Please add contacts in Profile."
      });
    }

    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const userName = `${user.firstName} ${user.lastName}`;

    const smsMessage =
      `🚨 SOS ALERT from ${userName}! I may be in danger.\nLocation: ${mapsLink}`;

    const phoneNumbers = user.emergencyContacts.map(c => c.phone);

    console.log("🚨 SOS TRIGGERED");
    console.log("Contacts:", phoneNumbers);
    console.log("Location:", mapsLink);

    const smsResult = await sendSMS(phoneNumbers, smsMessage);

    res.json({
      message: "SOS triggered",
      smsSent: smsResult.success,
      contacts: user.emergencyContacts,
      location: { lat, lng, mapsLink },
      rideId: rideId || null,
      userName
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
};