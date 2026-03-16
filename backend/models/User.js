import mongoose from "mongoose";

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  relation: { 
    type: String, 
    default: "" 
  }
});

const userSchema = new mongoose.Schema({

  firstName: {
    type: String,
    required: true
  },

  middleName: {
    type: String,
    default: ""
  },

  lastName: {
    type: String,
    required: true
  },

  age: {
    type: Number
  },

  contactNumber: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  // Profile Fields
  profilePhoto: {
    type: String,
    default: ""
  },

  vehicleType: {
    type: String,
    enum: ["bike", "scooter", "car", "other"],
    default: "bike"
  },

  nightRider: {
    type: Boolean,
    default: false
  },

  notifications: {
    type: Boolean,
    default: true
  },

  // Emergency Contacts (Max 3)
  emergencyContacts: {
    type: [emergencyContactSchema],
    validate: [
      arr => arr.length <= 5,
      "Maximum 5 emergency contacts allowed"
    ]
  }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;