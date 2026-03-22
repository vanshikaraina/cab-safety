// routes/callaiRoutes.js
import express from "express";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { messages, system } = req.body;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages
    })
  });

  const data = await response.json();
  res.json(data);
});

export default router;