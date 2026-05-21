import express from "express";
import axios from "axios";

const router = express.Router();

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

router.post("/overpass", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const response = await axios.post(mirror, query, {
          headers: {
            "Content-Type": "text/plain",
          },
          timeout: 15000,
        });

        return res.json(response.data);
      } catch (err) {
        const status = err.response?.status;

        if ([429, 502, 504].includes(status)) {
          continue;
        }

        console.error(err.message);
      }
    }

    return res.json({ elements: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;