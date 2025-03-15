import { getAttendanceStats, getUserAttendanceForDate } from "../services/attendance/index.js";
import { getDateRangeAttendance, parseMessageForDateRange } from "../services/report/index.js";
import { getHelpMessage, sendSlackMessage } from "../services/slack/index.js";

/**
 * Handle help command
 */
export const handleHelpCommand = async (event) => {
  console.log("🆘 Help command received");
  try {
    const helpMessage = getHelpMessage();
    await sendSlackMessage(event.channel, helpMessage);
    console.log("✅ Help message sent");
    return true;
  } catch (error) {
    console.error("❌ Failed to send help message:", error.message);
    return false;
  }
};

/**
 * Handle report command
 */
export const handleReportCommand = async (event) => {
  console.log("📊 Report command received");

  // Parse the date range from the message
  const { startDate, endDate, dateText } = parseMessageForDateRange(event.text);

  if (startDate && endDate) {
    // Format the date range for display
    const today = new Date();
    const isForToday =
      startDate.getDate() === today.getDate() &&
      startDate.getMonth() === today.getMonth() &&
      startDate.getFullYear() === today.getFullYear() &&
      endDate.getDate() === today.getDate() &&
      endDate.getMonth() === today.getMonth() &&
      endDate.getFullYear() === today.getFullYear();

    // Generate title based on date range
    let title = isForToday ? "*Today's Attendance Report*\n" : `*Attendance Report ${dateText}*\n`;

    // Get attendance report for the date range
    const report = await getDateRangeAttendance(startDate, endDate);
    await sendSlackMessage(event.channel, `${title}${report}`);
    return true;
  } else {
    await sendSlackMessage(
      event.channel,
      "I couldn't understand the date range. Please try something like `@attendance report today` or `@attendance report from 4th March to 10th March`."
    );
    return false;
  }
};

/**
 * Handle user stats command
 */
export const handleUserStatsCommand = async (event, mentionedUserId) => {
  console.log("mentionedUserMatch>>", mentionedUserId);

  // Check if the request includes a date specification
  const { startDate, endDate, dateText } = parseMessageForDateRange(event.text);

  if (startDate && endDate) {
    // User attendance for specific date range
    console.log(`🗓️ Getting attendance for user ${mentionedUserId} for date range ${dateText}`);
    const report = await getUserAttendanceForDate(mentionedUserId, startDate, endDate);
    await sendSlackMessage(event.channel, report);
  } else {
    // Regular user stats (default to current month)
    console.log(`📊 Getting current month attendance stats for user ${mentionedUserId}`);
    // Use the current month and year
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const attendanceStats = await getAttendanceStats(mentionedUserId, currentMonth, currentYear);
    await sendSlackMessage(event.channel, attendanceStats);
  }
  return true;
};
