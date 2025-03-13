import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const analyzeCategory = async (message) => {
  console.log("analyzeCategory>>", message);
  try {
    const prompt = `
You are a classifier for Slack messages. Categorize the message into one of the following:
- WFH (Working from Home)
- FULL_DAY_LEAVE (Taking a full day leave)
- HALF_DAY_LEAVE (Taking a half-day leave)
- LATE_TO_OFFICE (Arriving late to office)
- LEAVING_EARLY (Leaving the office early)
- OTHER (If it doesn't fit any category)

**Message:** "${message}"

### **Important Notes:**
- If the message contains "leave" or "on leave", classify it as FULL_DAY_LEAVE.
- If the message mentions "half day", classify it as HALF_DAY_LEAVE.
- If the message says "late" or "coming late", classify it as LATE_TO_OFFICE.
- If the message contains "early leave" or "leaving early", classify it as LEAVING_EARLY.
- If the message contains "WFH", classify it as WFH.
- If the message doesn't match any of these, classify it as OTHER.

Return only the category name, nothing else.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Ensure you're using GPT-4 for better accuracy
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1, // Lower temperature for consistent output
    });

    const category = response.choices[0].message.content.trim();
    console.log("✅ Detected category:", category);
    return category;
  } catch (error) {
    console.error("❌ OpenAI Error:", error);
    return "OTHER";
  }
};
