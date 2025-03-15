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

/**
 * Parse a message to extract date range information
 */
export const parseMessageForDateRange = (message) => {
  const text = message.toLowerCase();
  let startDate, endDate, dateText;

  // Check for today
  if (text.includes("today")) {
    const today = new Date();
    startDate = new Date(today.setHours(0, 0, 0, 0));
    endDate = new Date(today.setHours(23, 59, 59, 999));
    dateText = "for Today";
    return { startDate, endDate, dateText };
  }

  // Check for tomorrow
  if (text.includes("tomorrow")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDate = new Date(tomorrow.setHours(0, 0, 0, 0));
    endDate = new Date(tomorrow.setHours(23, 59, 59, 999));
    dateText = "for Tomorrow";
    return { startDate, endDate, dateText };
  }

  // Check for yesterday
  if (text.includes("yesterday")) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startDate = new Date(yesterday.setHours(0, 0, 0, 0));
    endDate = new Date(yesterday.setHours(23, 59, 59, 999));
    dateText = "for Yesterday";
    return { startDate, endDate, dateText };
  }

  // Check for date range (e.g., "from 4th March to 10th March")
  const dateRangeRegex = /from\s+(\d+(?:st|nd|rd|th)?\s+\w+)\s+to\s+(\d+(?:st|nd|rd|th)?\s+\w+)/i;
  const dateRangeMatch = text.match(dateRangeRegex);

  if (dateRangeMatch) {
    try {
      // Remove ordinals (st, nd, rd, th) for better parsing
      const startDateStr = dateRangeMatch[1].replace(/(st|nd|rd|th)/g, "");
      const endDateStr = dateRangeMatch[2].replace(/(st|nd|rd|th)/g, "");

      // Assuming current year if not specified
      const currentYear = new Date().getFullYear();

      startDate = new Date(`${startDateStr} ${currentYear}`);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(`${endDateStr} ${currentYear}`);
      endDate.setHours(23, 59, 59, 999);

      dateText = `from ${dateRangeMatch[1]} to ${dateRangeMatch[2]}`;
      return { startDate, endDate, dateText };
    } catch (error) {
      console.error("Error parsing date range:", error);
    }
  }

  return { startDate: null, endDate: null, dateText: null };
};

/**
 * Get attendance data for a specific date range
 */
export const getDateRangeAttendance = async (startDate, endDate) => {
  try {
    // Query messages within the date range
    const singleDayMessages = await Message.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
      category: {
        $in: ["WFH", "FULL_DAY_LEAVE", "HALF_DAY_LEAVE", "OOO"],
      },
    }).sort({ timestamp: 1 });

    // Query multi-day leaves that overlap with the target range
    const multiDayLeaves = await Message.find({
      category: "MULTI_DAY_LEAVE",
      $or: [
        // Leave starts before or during the range and ends during or after the range
        {
          leaveStartDate: { $lte: endDate },
          leaveEndDate: { $gte: startDate },
        },
        // Leave without specific dates but message is within range
        {
          leaveStartDate: null,
          leaveEndDate: null,
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ],
    });

    // Combine all messages for processing
    const messages = [...singleDayMessages, ...multiDayLeaves];

    // Group messages by category and count unique users
    const uniqueUsersByCategory = {
      WFH: new Set(),
      FULL_DAY_LEAVE: new Set(),
      HALF_DAY_LEAVE: new Set(),
      OOO: new Set(),
      MULTI_DAY_LEAVE: new Set(),
    };

    messages.forEach((msg) => {
      if (uniqueUsersByCategory[msg.category]) {
        uniqueUsersByCategory[msg.category].add(msg.userId);
      }
    });

    // Build detailed report
    let report = "";

    // Count by category
    report += `• *Full Day Leaves:* ${uniqueUsersByCategory.FULL_DAY_LEAVE.size} employees\n`;
    report += `• *Half Day Leaves:* ${uniqueUsersByCategory.HALF_DAY_LEAVE.size} employees\n`;
    report += `• *Working From Home:* ${uniqueUsersByCategory.WFH.size} employees\n`;
    report += `• *Out of Office:* ${uniqueUsersByCategory.OOO.size} employees\n`;
    report += `• *Multi-Day Leaves:* ${uniqueUsersByCategory.MULTI_DAY_LEAVE.size} employees\n\n`;

    // Total employees with leave/WFH
    const totalAffectedUsers = new Set([
      ...uniqueUsersByCategory.FULL_DAY_LEAVE,
      ...uniqueUsersByCategory.HALF_DAY_LEAVE,
      ...uniqueUsersByCategory.WFH,
      ...uniqueUsersByCategory.OOO,
      ...uniqueUsersByCategory.MULTI_DAY_LEAVE,
    ]);

    report += `*Total employees with leave/WFH:* ${totalAffectedUsers.size}`;

    // If there are multi-day leaves, include details
    if (uniqueUsersByCategory.MULTI_DAY_LEAVE.size > 0) {
      report += "\n\n*Multi-Day Leave Details:*";

      const multiDayDetails = await Promise.all(
        multiDayLeaves.map(async (msg) => {
          const userName = msg.userName;
          const start = msg.leaveStartDate ? msg.leaveStartDate.toLocaleDateString() : "Unknown";
          const end = msg.leaveEndDate ? msg.leaveEndDate.toLocaleDateString() : "Unknown";
          return `• ${userName}: ${start} to ${end}`;
        })
      );

      report += "\n" + multiDayDetails.join("\n");
    }

    return report;
  } catch (error) {
    console.error("❌ Error fetching date range attendance:", error);
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
• \`@attendance report today\` - Get today's attendance report
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
