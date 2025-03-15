import Message from "../../models/messageModel.js";
import { getUserInfo } from "../slack/users.js";

/**
 * Get attendance statistics for a specific user, filtered by month
 * If no month is provided, defaults to current month
 */
export const getAttendanceStats = async (
  userId,
  month = new Date().getMonth(),
  year = new Date().getFullYear()
) => {
  try {
    // Create date range for the specified month
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month

    console.log(
      `📅 Fetching stats for period: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`
    );

    // Query messages within the month
    const messages = await Message.find({
      userId,
      timestamp: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    }).sort({ timestamp: -1 });

    // Query multi-day leaves that overlap with this month
    const multiDayLeaves = await Message.find({
      userId,
      category: "MULTI_DAY_LEAVE",
      $or: [
        // Leave starts before/during month and ends during/after month
        {
          leaveStartDate: { $lte: endOfMonth },
          leaveEndDate: { $gte: startOfMonth },
        },
        // Leave without specific dates but message is within month
        {
          leaveStartDate: null,
          leaveEndDate: null,
          timestamp: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      ],
    });

    // Combine all relevant messages
    const allMessages = [
      ...messages,
      ...multiDayLeaves.filter((msg) => !messages.some((m) => m.messageId === msg.messageId)),
    ];

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
    allMessages.forEach((msg) => {
      if (stats.hasOwnProperty(msg.category)) {
        stats[msg.category] += 1;
      }
    });

    // Get user name
    let userName = "Unknown User";
    if (allMessages.length > 0) {
      userName = allMessages[0].userName;
    } else {
      try {
        const userInfo = await getUserInfo(userId);
        userName = userInfo;
      } catch (error) {
        console.error("Could not get user info", error);
      }
    }

    // Get multi-day leave details (only those that overlap with the selected month)
    const multiDayLeavesFiltered = allMessages.filter(
      (msg) => msg.category === "MULTI_DAY_LEAVE" && msg.leaveStartDate && msg.leaveEndDate
    );

    // Get month name for the report title
    const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

    // Build the report
    return buildStatsReport(userName, stats, multiDayLeavesFiltered, monthName, year);
  } catch (error) {
    console.error("❌ Error fetching attendance stats:", error);
    return "Error fetching attendance data";
  }
};

/**
 * Build a formatted stats report
 */
function buildStatsReport(userName, stats, multiDayLeaves, monthName, year) {
  let report = `*Attendance Stats for ${userName} - ${monthName} ${year}*\n\n`;
  report += `• *WFH:* ${stats.WFH} days\n`;
  report += `• *Full Day Leaves:* ${stats.FULL_DAY_LEAVE} days\n`;
  report += `• *Half Day Leaves:* ${stats.HALF_DAY_LEAVE} days\n`;
  report += `• *Late Arrivals:* ${stats.LATE_TO_OFFICE} times\n`;
  report += `• *Early Departures:* ${stats.LEAVING_EARLY} times\n`;
  report += `• *Out of Office:* ${stats.OOO} days\n`;
  report += `• *Multi-Day Leaves:* ${stats.MULTI_DAY_LEAVE} instances\n`;

  // Add details of multi-day leaves if any
  if (multiDayLeaves.length > 0) {
    report += "\n*Multi-Day Leave Periods:*\n";
    multiDayLeaves.forEach((leave) => {
      const start = leave.leaveStartDate.toLocaleDateString();
      const end = leave.leaveEndDate.toLocaleDateString();
      report += `• ${start} to ${end}\n`;
    });
  }

  return report;
}
