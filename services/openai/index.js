import { analyzeCategory } from "./categoryAnalyzer.js";
import { initializeOpenAI } from "./client.js";
import { extractDateRange } from "./dateExtractor.js";

// Initialize the OpenAI client
initializeOpenAI();

export { analyzeCategory, extractDateRange };
