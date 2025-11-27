const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Only load dotenv if .env file exists (for local development)
// In production (Render), environment variables are automatically available
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
  console.log("📝 Loaded .env file for local development");
}

const app = express();
// Use Render's PORT environment variable, fallback to 3000 for local development
const PORT = process.env.PORT || 3000; 
const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

// Debug: Log environment variable status (without exposing the token)
console.log("🔍 Environment Check:");
console.log("  PORT:", PORT);
console.log("  HUGGINGFACE_API_TOKEN:", HUGGINGFACE_API_TOKEN ? `Set (length: ${HUGGINGFACE_API_TOKEN.length})` : "❌ NOT SET");
console.log("  All env vars with 'HUGGING' or 'TOKEN':", Object.keys(process.env).filter(k => k.includes('HUGGING') || k.includes('TOKEN')));

// Validate API token
if (!HUGGINGFACE_API_TOKEN) {
  console.error("⚠️  WARNING: HUGGINGFACE_API_TOKEN is not set!");
  console.error("Please set it in your Render environment variables");
  console.error("In Render: Dashboard → Your Service → Environment → Add HUGGINGFACE_API_TOKEN");
}

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

  // Check if API token is set
  if (!HUGGINGFACE_API_TOKEN) {
    console.error("HUGGINGFACE_API_TOKEN is not configured");
    return res.status(500).json({ 
      error: "API token not configured. Please set HUGGINGFACE_API_TOKEN environment variable." 
    });
  }

  try {
    const modelName = "j-hartmann/emotion-english-distilroberta-base";
    
    // Use the inference API endpoint (works with valid token)
    const apiUrl = `https://api-inference.huggingface.co/models/${modelName}`;
    
    console.log("Calling Hugging Face API:", apiUrl);
    console.log("Token present:", HUGGINGFACE_API_TOKEN ? "Yes (length: " + HUGGINGFACE_API_TOKEN.length + ")" : "No");
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text })
    });

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        console.error("HTTP Error:", response.status, errorText);
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorText);
          console.error("Error JSON:", errorJson);
          errorText = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          // Not JSON, use text as is
        }
      } catch (e) {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      return res.status(response.status).json({ error: `API request failed: ${errorText}` });
    }

    const result = await response.json();
    console.log("API Response:", JSON.stringify(result, null, 2));

    // ✅ Model still loading or error from HF
    if (result.error) {
      console.error("Hugging Face model error:", result.error);
      return res.status(503).json({ error: "The model is still loading or unavailable. Please try again in a moment." });
    }

    // Handle different response formats
    let emotions;
    if (Array.isArray(result) && result.length > 0) {
      // Format: [[{label: "joy", score: 0.9}, ...]]
      emotions = Array.isArray(result[0]) ? result[0] : result;
    } else if (result[0] && Array.isArray(result[0])) {
      emotions = result[0];
    } else {
      console.error("Unexpected API format:", result);
      return res.status(500).json({ error: "Unexpected API response format. Please try again." });
    }

    // ✅ Validate expected format
    if (!Array.isArray(emotions) || emotions.length === 0) {
      console.error("Invalid emotions array:", emotions);
      return res.status(500).json({ error: "Invalid response format from emotion analysis." });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
