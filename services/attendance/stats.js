import Message from "../../models/messageModel.js";
import { getUserInfo } from "../slack/users.js";

/**
 * Get attendance statistics for a specific user
 */
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

    // Build the report
    return buildStatsReport(userName, stats, multiDayLeaves);
  } catch (error) {
    console.error("❌ Error fetching attendance stats:", error);
    return "Error fetching attendance data";
  }
};

/**
 * Build a formatted stats report
 */
function buildStatsReport(userName, stats, multiDayLeaves) {
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
}
