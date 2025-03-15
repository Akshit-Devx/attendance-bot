import { getSlackClient, isTokenAvailable } from "./client.js";
import { logSlackError } from "./errorHandling.js";

// Cache for user information to reduce API calls
const userInfoCache = new Map();

/**
 * Fetch user information from Slack
 */
export const getUserInfo = async (userId) => {
  try {
    // Check cache first
    if (userInfoCache.has(userId)) {
      return userInfoCache.get(userId);
    }

    // Make API call with validation
    if (!isTokenAvailable()) {
      console.error("❌ SLACK_BOT_TOKEN is missing in environment variables");
      return "Unknown User";
    }

    const client = getSlackClient();
    const userInfo = await client.users.info({ user: userId });
    const userName = userInfo.user.real_name || userInfo.user.name;

    // Cache the user info for future use
    userInfoCache.set(userId, userName);

    return userName;
  } catch (error) {
    console.error("❌ Error fetching Slack user info:", error.message);
    logSlackError(error);
    return "Unknown User";
  }
};

/**
 * Clear the user info cache
 */
export const clearUserCache = () => {
  userInfoCache.clear();
};
