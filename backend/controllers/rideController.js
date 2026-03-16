//rideController.js
const Ride = require("../models/Ride");

/*
START RIDE
Creates a new ride and marks it ACTIVE
*/

exports.startRide = async (req, res) => {

  try {

    const {
      lat,
      lng,
      destLat,
      destLng,
      destinationName,
      vehicleType,
      distance,
      expectedTime
    } = req.body;

    const newRide = new Ride({

      startLocation: {
        lat,
        lng
      },

      endLocation: {
        lat: destLat,
        lng: destLng
      },

      destinationName,

      vehicleType,

      distance,

      expectedTime,

      status: "ACTIVE",

      startTime: new Date()

    });

    await newRide.save();

    res.status(201).json({
      message: "Ride started successfully",
      ride: newRide
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error starting ride",
      error
    });

  }

};


/*
STOP RIDE
Marks ride as completed
*/

exports.stopRide = async (req, res) => {

  try {

    const { rideId } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {

      return res.status(404).json({
        message: "Ride not found"
      });

    }

    ride.status = "COMPLETED";
    ride.endTime = new Date();

    await ride.save();

    res.json({
      message: "Ride completed",
      ride
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error stopping ride",
      error
    });

  }

};