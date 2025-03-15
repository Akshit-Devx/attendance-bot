import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();

let openaiClient = null;

/**
 * Initialize or get the OpenAI client
 */
export const initializeOpenAI = () => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ ERROR: OPENAI_API_KEY environment variable is missing!");
      console.error("Please add your OpenAI API key to the .env file");
      return null;
    }

    try {
      openaiClient = new OpenAI({ apiKey });
      console.log("✅ OpenAI client initialized");
    } catch (error) {
      console.error("❌ Error initializing OpenAI client:", error.message);
      return null;
    }
  }

  return openaiClient;
};

/**
 * Get the OpenAI client instance
 */
export const getOpenAIClient = () => {
  if (!openaiClient) {
    return initializeOpenAI();
  }
  return openaiClient;
};
