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
    const messages = await Message.find({ userId }).sort({ timestamp: -1 }).limit(30);

    let stats = {
      WFH: 0,
      FULL_DAY_LEAVE: 0,
      HALF_DAY_LEAVE: 0,
      LATE_TO_OFFICE: 0,
      LEAVING_EARLY: 0,
      OOO: 0,
      MULTI_DAY_LEAVE: 0,
      OTHER: 0,
    };

    // Count occurrences by category
    messages.forEach((msg) => {
      if (stats.hasOwnProperty(msg.category)) {
        stats[msg.category] += 1;
      }
    });

    // Get user name
    let userName = "Unknown User";
    if (messages.length > 0) {
      userName = messages[0].userName;
    } else {
      try {
        const userInfo = await getUserInfo(userId);
        userName = userInfo;
      } catch (error) {
        console.error("Could not get user info", error);
      }
    }

    // Get multi-day leave details
    const multiDayLeaves = messages.filter(
      (msg) => msg.category === "MULTI_DAY_LEAVE" && msg.leaveStartDate && msg.leaveEndDate
    );

    // Build detailed stats response
    let report = `*Attendance Stats for ${userName}*\n\n`;
    report += `• *WFH:* ${stats.WFH} days\n`;
    report += `• *Full Day Leaves:* ${stats.FULL_DAY_LEAVE} days\n`;
    report += `• *Half Day Leaves:* ${stats.HALF_DAY_LEAVE} days\n`;
    report += `• *Late Arrivals:* ${stats.LATE_TO_OFFICE} times\n`;
    report += `• *Early Departures:* ${stats.LEAVING_EARLY} times\n`;
    report += `• *Out of Office:* ${stats.OOO} days\n`;
    report += `• *Multi-Day Leaves:* ${stats.MULTI_DAY_LEAVE} instances\n`;

    // Add details of multi-day leaves if any
    if (multiDayLeaves.length > 0) {
      report += "\n*Recent Multi-Day Leave Periods:*\n";
      multiDayLeaves.slice(0, 5).forEach((leave) => {
        const start = leave.leaveStartDate.toLocaleDateString();
        const end = leave.leaveEndDate.toLocaleDateString();
        report += `• ${start} to ${end}\n`;
      });
    }

    return report;
  } catch (error) {
    console.error("❌ Error fetching attendance stats:", error);
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

    // Group messages by category and user
    const categorizedUsers = {
      WFH: new Map(),
      FULL_DAY_LEAVE: new Map(),
      HALF_DAY_LEAVE: new Map(),
      OOO: new Map(),
      MULTI_DAY_LEAVE: new Map(),
    };

    // Process each message and organize by category and user
    messages.forEach((msg) => {
      if (categorizedUsers.hasOwnProperty(msg.category)) {
        // Store only the most recent message for each user in each category
        if (
          !categorizedUsers[msg.category].has(msg.userId) ||
          categorizedUsers[msg.category].get(msg.userId).timestamp < msg.timestamp
        ) {
          categorizedUsers[msg.category].set(msg.userId, {
            userId: msg.userId,
            userName: msg.userName,
            message: msg.message,
            timestamp: msg.timestamp,
            startDate: msg.leaveStartDate,
            endDate: msg.leaveEndDate,
          });
        }
      }
    });

    // Build detailed report with individual employee info
    let report = "";

    // Add section for each category with employee names and reasons
    const categories = [
      { key: "FULL_DAY_LEAVE", title: "Full Day Leaves" },
      { key: "HALF_DAY_LEAVE", title: "Half Day Leaves" },
      { key: "WFH", title: "Working From Home" },
      { key: "OOO", title: "Out of Office" },
      { key: "MULTI_DAY_LEAVE", title: "Multi-Day Leaves" },
    ];

    for (const category of categories) {
      const users = Array.from(categorizedUsers[category.key].values());
      report += `*${category.title} (${users.length}):*\n`;

      if (users.length > 0) {
        users.forEach((user) => {
          // Format message or reason
          const reason =
            user.message.length > 50 ? user.message.substring(0, 47) + "..." : user.message;

          if (category.key === "MULTI_DAY_LEAVE" && user.startDate && user.endDate) {
            const startDateStr = user.startDate.toLocaleDateString();
            const endDateStr = user.endDate.toLocaleDateString();
            report += `• *${user.userName}*: ${startDateStr} to ${endDateStr} - ${reason}\n`;
          } else {
            report += `• *${user.userName}*: ${reason}\n`;
          }
        });
      } else {
        report += "• None\n";
      }

      report += "\n";
    }

    // Total employees with leave/WFH
    const totalAffectedUsers = new Set();
    Object.values(categorizedUsers).forEach((userMap) => {
      userMap.forEach((userData, userId) => {
        totalAffectedUsers.add(userId);
      });
    });

    report += `*Total employees with leave/WFH:* ${totalAffectedUsers.size}`;

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
