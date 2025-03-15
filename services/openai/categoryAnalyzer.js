import { getOpenAIClient } from "./client.js";
import { getCategoryPrompt } from "./prompts.js";

/**
 * Analyze the category of a message using OpenAI
 */
export const analyzeCategory = async (message) => {
  console.log("analyzeCategory>>", message);

  try {
    const openai = getOpenAIClient();
    if (!openai) {
      console.error("❌ OpenAI client not initialized");
      return "OTHER";
    }

    const prompt = getCategoryPrompt(message);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1, // Low temperature for consistent results
    });

    const category = response.choices[0].message.content.trim();
    console.log("✅ Detected category:", category);
    return category;
  } catch (error) {
    handleOpenAIError(error, "category analysis");
    return "OTHER";
  }
};

/**
 * Handle OpenAI API errors with detailed logging
 */
function handleOpenAIError(error, context) {
  console.error(`❌ OpenAI Error during ${context}:`, error.message);

  if (error.response) {
    console.error(`Status: ${error.response.status}`);
    console.error(`Error type: ${error.response.data.error.type}`);
  }

  // Check for rate limiting
  if (error.message.includes("rate_limit")) {
    console.error(
      "⚠️ Rate limit exceeded. Consider implementing retry logic or increasing rate limits."
    );
  }

  // Check for invalid API key
  if (error.message.includes("auth")) {
    console.error("⚠️ Authentication error. Check your OpenAI API key.");
  }
}
