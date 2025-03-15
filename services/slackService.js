import { WebClient } from "@slack/web-api";
import Message from "../models/messageModel.js";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export const getUserInfo = async (userId) => {
  try {
    const userInfo = await slackClient.users.info({ user: userId });
    return userInfo.user.real_name || userInfo.user.name;
  } catch (error) {
    console.error("❌ Error fetching Slack user info:", error);
    return "Unknown User";
  }
};

export const sendSlackMessage = async (channel, text) => {
  try {
    await slackClient.chat.postMessage({ channel, text });
  } catch (error) {
    console.error("❌ Error sending Slack message:", error);
  }
};

export const getAttendanceStats = async (userId) => {
  try {
    const messages = await Message.find({ userId });

    let stats = {
      WFH: 0,
      FULL_DAY_LEAVE: 0,
      HALF_DAY_LEAVE: 0,
      LATE_TO_OFFICE: 0,
      LEAVING_EARLY: 0,
      OOO: 0,
      OTHER: 0,
    };

    messages.forEach((msg) => {
      if (stats.hasOwnProperty(msg.category)) {
        stats[msg.category] += 1;
      }
    });

    return `WFH: ${stats.WFH}, Leaves: ${stats.FULL_DAY_LEAVE}, Half Day: ${stats.HALF_DAY_LEAVE}, Late: ${stats.LATE_TO_OFFICE}, Early Leaving: ${stats.LEAVING_EARLY}, OOO: ${stats.OOO}`;
  } catch (error) {
    console.error("❌ Error fetching attendance stats:", error);
    return "Error fetching attendance data";
  }
};

export const getHelpMessage = () => {
  return `
*🤖 Attendance Bot Help*

I'm your friendly Attendance Bot! I automatically track attendance-related messages in this channel.

*Commands:*
• \`@attendance help\` - Display this help message
• \`@attendance @user\` - Get attendance stats for a specific user

*Supported attendance types:*
• *WFH:* "Working from home today", "WFH", etc.
• *Full Day Leave:* "On leave today", "Taking the day off", etc.
• *Half Day Leave:* "Taking half day", "Will be there in second half", etc.
• *Late Arrival:* "Coming in late", "Will be there by 11:30", etc.
• *Early Departure:* "Leaving early today", "Need to leave at 3pm", etc.
• *Out of Office:* "OOO", "Out of office", etc.

Simply post your status in the channel, and I'll automatically categorize and track it.
`;
};
