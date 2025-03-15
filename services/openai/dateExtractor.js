import { getOpenAIClient } from "./client.js";
import { getDateRangePrompt } from "./prompts.js";

/**
 * Extract date range from a message using OpenAI
 */
export const extractDateRange = async (message) => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      console.error("❌ OpenAI client not initialized");
      return { startDate: null, endDate: null };
    }

    const prompt = getDateRangePrompt(message);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      // No response_format parameter as it's not supported by all models
    });

    return parseJsonFromResponse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error("❌ OpenAI Error extracting date range:", error.message);
    return { startDate: null, endDate: null };
  }
};

/**
 * Parse JSON from an OpenAI response text
 */
function parseJsonFromResponse(responseText) {
  // Try to extract JSON from the response
  let jsonStr = responseText;

  // Handle cases where GPT may add extra text around the JSON
  if (responseText.includes("{") && responseText.includes("}")) {
    jsonStr = responseText.substring(responseText.indexOf("{"), responseText.lastIndexOf("}") + 1);
  }

  try {
    const result = JSON.parse(jsonStr);
    console.log("✅ Extracted date range:", result);
    return result;
  } catch (parseError) {
    console.error("❌ Error parsing JSON from OpenAI response:", parseError);
    console.log("Response received:", responseText);
    return { startDate: null, endDate: null };
  }
}
