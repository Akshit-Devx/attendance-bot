import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

dotenv.config();

const verifySlackConfig = async () => {
  console.log("🔍 Verifying Slack configuration...");

  // Check for environment variables
  const token = process.env.SLACK_BOT_TOKEN;
  const botId = process.env.SLACK_BOT_ID;

  if (!token) {
    console.warn("⚠️ SLACK_BOT_TOKEN is not set in environment variables");
    return false;
  }

  if (!botId) {
    console.warn("⚠️ SLACK_BOT_ID is not set in environment variables");
    return false;
  }

  // Using provided SLACK_BOT_ID
  console.log(`Using configured Bot ID: ${botId}`);

  // Try simple API call to validate token
  try {
    const client = new WebClient(token);
    await client.auth.test();
    console.log("✅ Slack authentication successful!");
    return true;
  } catch (error) {
    console.error("❌ Slack authentication failed:", error.message);
    return false;
  }
};

export default verifySlackConfig;
