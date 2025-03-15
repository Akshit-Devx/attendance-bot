import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

dotenv.config();

const verifySlackToken = async () => {
  console.log("🔍 Verifying Slack Bot Token...");

  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    console.error("❌ ERROR: SLACK_BOT_TOKEN environment variable is missing!");
    console.error("Please add your Slack Bot Token to the .env file");
    process.exit(1);
  }

  try {
    const client = new WebClient(token);

    // Test the auth
    const authTest = await client.auth.test();
    console.log("✅ Slack authentication successful!");
    console.log(`Bot name: ${authTest.user}`);
    console.log(`Bot ID: ${authTest.user_id}`);
    console.log(`Team: ${authTest.team}`);

    // Check if SLACK_BOT_ID matches the actual bot ID
    if (process.env.SLACK_BOT_ID && process.env.SLACK_BOT_ID !== authTest.user_id) {
      console.warn("⚠️ Warning: SLACK_BOT_ID in .env doesn't match actual bot ID");
      console.warn(`Env: ${process.env.SLACK_BOT_ID}, Actual: ${authTest.user_id}`);
    }

    console.log("\n🔐 Checking bot permissions...");
    try {
      // Check if the bot can post messages
      const conversationsListResult = await client.conversations.list({ limit: 1 });
      if (conversationsListResult.channels && conversationsListResult.channels.length > 0) {
        console.log("✅ Bot can list channels");
      }
    } catch (error) {
      console.error("❌ Bot doesn't have permission to list channels");
      console.error("Please ensure the bot has 'channels:read' scope");
    }

    console.log("\n✅ Verification complete");
  } catch (error) {
    console.error("❌ Slack token verification failed:", error.message);

    if (error.data?.error === "not_authed" || error.data?.error === "invalid_auth") {
      console.error("\n🔑 The token appears to be invalid or has been revoked.");
      console.error(
        "Please generate a new token from your Slack App settings at https://api.slack.com/apps"
      );
    } else if (error.data?.error === "token_revoked") {
      console.error("\n🔑 The token has been revoked.");
      console.error("Please generate a new token from your Slack App settings.");
    }

    console.error("\nRequired bot token scopes:");
    console.error("- channels:history (to read channel messages)");
    console.error("- channels:read (to get channel info)");
    console.error("- chat:write (to send messages)");
    console.error("- users:read (to get user info)");

    process.exit(1);
  }
};

// Run the verification if executed directly
if (process.argv[1].endsWith("verifySlackToken.js")) {
  verifySlackToken().catch(console.error);
}

export default verifySlackToken;
