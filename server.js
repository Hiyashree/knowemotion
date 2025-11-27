const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('docs'));
 // Serve static files from "public" folder

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/docs/index.html');
});

let entries = [];

// Sentiment analysis route
app.post("/analyze", async (req, res) => {
  const text = req.body.text;
  console.log("Analyzing text:", text); // Log incoming request

  try {
    const response = await fetch("https://router.huggingface.co/v1/inference/SamLowe/roberta-base-go-emotions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text })
    });

    const result = await response.json();

    // ✅ Model still loading or error from HF
    if (result.error) {
      console.error("Hugging Face model error:", result.error);
      return res.status(503).json({ error: "The model is still loading or unavailable. Please try again in a moment." });
    }

    const emotions = result[0];

    // ✅ Validate expected format
    if (!Array.isArray(emotions)) {
      console.error("Unexpected API format:", result);
      throw new Error("Unexpected API response format");
    }

    const topEmotion = emotions.reduce((a, b) => (a.score > b.score ? a : b)).label;

    const quotes = {
      joy: "Let your smile change the world.",
      sadness: "It's okay to feel down — tomorrow is a new day 💙",
      anger: "Breathe. You are in control of your peace.",
      fear: "You’ve survived 100% of your worst days so far. You’ve got this.",
      surprise: "Life has twists — enjoy the unexpected 🌈",
      love: "You are loved, even when it’s quiet 🤍"
    };

    const responseData = {
      mood: topEmotion,
      quote: quotes[topEmotion.toLowerCase()] || "Stay strong, beautiful soul ✨"
    };

    entries.push({
      text,
      mood: topEmotion,
      quote: responseData.quote,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Something went wrong with emotion analysis." });
  }
});

// Get all stored entries (optional frontend usage)
app.get('/entries', (req, res) => {
  res.json(entries);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});



