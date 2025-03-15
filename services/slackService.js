import { WebClient } from "@slack/web-api";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Fetch user information from Slack
 */
export const getUserInfo = async (userId) => {
  try {
    const userInfo = await slackClient.users.info({ user: userId });
    return userInfo.user.real_name || userInfo.user.name;
  } catch (error) {
    console.error("❌ Error fetching Slack user info:", error);
    return "Unknown User";
  }
};

/**
 * Send a message to a Slack channel
 */
export const sendSlackMessage = async (channel, text) => {
  try {
    await slackClient.chat.postMessage({ channel, text });
  } catch (error) {
    console.error("❌ Error sending Slack message:", error);
  }
};

/**
 * Get help message for the Attendance Bot
 */
export const getHelpMessage = () => {
  return `
*🤖 Attendance Bot Help*

I'm your friendly Attendance Bot! I automatically track attendance-related messages in this channel.

*Commands:*
• \`@attendance help\` - Display this help message
• \`@attendance @user\` - Get overall attendance stats for a specific user
• \`@attendance @user today\` - Get user's attendance for today
• \`@attendance @user yesterday\` - Get user's attendance for yesterday 
• \`@attendance @user from 4th March to 10th March\` - Get user's attendance for a date range
• \`@attendance report today\` - Get today's attendance report for all users
• \`@attendance report yesterday\` - Get yesterday's attendance report
• \`@attendance report tomorrow\` - Get tomorrow's attendance report
• \`@attendance report from 4th March to 10th March\` - Get attendance report for a specific date range

*Supported attendance types:*
• *WFH:* "Working from home today", "WFH", "Remote work today", etc.
• *Full Day Leave:* "On leave today", "Taking the day off", "Sick leave today", etc.
• *Half Day Leave:* "Taking half day", "Working partial day", etc.
• *Late Arrival:* "Coming in late", "Will be there by [time]", etc.
• *Early Departure:* "Leaving early today", "Need to leave at [time]", etc.
• *Out of Office:* "OOO", "Out of office", "Unavailable today", etc.
• *Multi-Day Leave:* "On leave from 2nd to 6th March", "Taking leave next week", etc.

*Examples of recognized leave messages:*
• "Taking leave today (not feeling well)."
• "Family emergency, on leave today."
• "On leave from 2nd March to 6th March due to family commitments."
• "I'll be on leave next week for vacation."
• "Taking annual leave from Monday to Wednesday."
• "Working half-day today, leaving early at [time]."

Simply post your status in the channel, and I'll automatically categorize and track it!
`;
};
