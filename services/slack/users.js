import { getSlackClient } from "./client.js";

/**
 * Fetch user information from Slack
 */
export const getUserInfo = async (userId) => {
  try {
    const client = getSlackClient();
    const token = process.env.SLACK_BOT_TOKEN;

    if (!token) {
      console.error("❌ SLACK_BOT_TOKEN is missing in environment variables");
      return "Unknown User";
    }

    const userInfo = await client.users.info({ user: userId });
    return userInfo.user.real_name || userInfo.user.name;
  } catch (error) {
    console.error("❌ Error fetching Slack user info:", error.message);

    // More helpful error messages
    if (error.data?.error === "not_authed" || error.data?.error === "invalid_auth") {
      console.error("Authentication failed. Check your SLACK_BOT_TOKEN.");
    } else if (error.data?.error === "user_not_found") {
      console.error(`User not found: ${userId}`);
    }

    return "Unknown User";
  }
};
