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
