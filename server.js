
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));

// Allow requests from your website.
// We will restrict this to your website's domain before launch.
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test route
app.use(express.static("."));

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20 ||
      messages.some(
        item =>
          !item ||
          !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" ||
          item.content.length > 10000
      )
    ) {
      return res.status(400).json({
        error: "Invalid messages. Please try again."
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You are Quiera AI, a helpful, friendly and accurate AI assistant.",
      input: messages.map(item => ({
        role: item.role,
        content: item.content
      }))
    });

    res.json({
      reply: response.output_text
    });
  } catch (error) {
    console.error("Quiera AI error:", error.message);

    res.status(500).json({
      error: "Quiera AI could not respond. Please try again."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Quiera AI backend running on port ${PORT}`);
});
