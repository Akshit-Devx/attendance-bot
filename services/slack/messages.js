import { getSlackClient } from "./client.js";

/**
 * Send a message to a Slack channel
 */
export const sendSlackMessage = async (channel, text) => {
  try {
    const client = getSlackClient();
    const token = process.env.SLACK_BOT_TOKEN;

    if (!token) {
      console.error("❌ SLACK_BOT_TOKEN is missing in environment variables");
      return null;
    }

    // Log the channel ID for debugging
    console.log(`Attempting to send message to channel: ${channel}`);

    const result = await client.chat.postMessage({
      channel,
      text,
      unfurl_links: false,
    });

    console.log("✅ Message sent successfully");
    return result;
  } catch (error) {
    console.error("❌ Error sending Slack message:", error.message);
    logSlackError(error);
    return null;
  }
};

/**
 * Send a message as a reply in a thread
 */
export const sendThreadMessage = async (channel, thread_ts, text) => {
  try {
    const client = getSlackClient();
    const token = process.env.SLACK_BOT_TOKEN;

    if (!token) {
      console.error("❌ SLACK_BOT_TOKEN is missing in environment variables");
      return null;
    }

    console.log(`Attempting to send thread message in channel: ${channel}`);

    const result = await client.chat.postMessage({
      channel,
      thread_ts,
      text,
      unfurl_links: false,
    });

    console.log("✅ Thread message sent successfully");
    return result;
  } catch (error) {
    console.error("❌ Error sending thread message:", error.message);
    logSlackError(error);
    return null;
  }
};

/**
 * Log detailed Slack error information
 */
function logSlackError(error) {
  if (error.data?.error === "not_authed") {
    console.error("Authentication failed. Check your SLACK_BOT_TOKEN.");
  } else if (error.data?.error === "channel_not_found") {
    console.error(`Channel not found: ${error.data?.channel || "unknown"}`);
  } else if (error.data?.error === "missing_scope") {
    console.error("Bot token missing required scopes. Need 'chat:write' permission.");
    console.error("Required scopes:", error.data?.response_metadata?.acceptedScopes || "unknown");
  }
}

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
