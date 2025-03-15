import Message from "../../models/messageModel.js";
import { formatDateRange, isToday } from "../../utils/dateUtils.js";
import { getUserInfo } from "../slack/users.js";

/**
 * Get user's attendance for specific date(s)
 */
export const getUserAttendanceForDate = async (userId, startDate, endDate) => {
  try {
    // Get user name
    let userName = await fetchUserName(userId);

    // Format date range for display
    const dateRangeText = formatDateRangeText(startDate, endDate);

    // Fetch user records for the date range
    const records = await fetchUserAttendanceRecords(userId, startDate, endDate);

    // If no attendance records found
    if (records.length === 0) {
      return `*Attendance Report for ${userName} - ${dateRangeText}*\n\nNo attendance records found for this date range.`;
    }

    // Build and return formatted report
    return buildUserReport(userName, dateRangeText, records);
  } catch (error) {
    console.error("❌ Error fetching user attendance for date:", error);
    return `Error fetching attendance data for this user.`;
  }
};

/**
 * Format the date range text for the report
 */
function formatDateRangeText(startDate, endDate) {
  return isToday(startDate) && isToday(endDate) ? "Today" : formatDateRange(startDate, endDate);
}

/**
 * Get user name from database or API
 */
async function fetchUserName(userId) {
  try {
    const userInfo = await getUserInfo(userId);
    return userInfo;
  } catch (error) {
    console.error("Could not get user info", error);
    return "Unknown User";
  }
}

/**
 * Fetch user's attendance records for a date range
 */
async function fetchUserAttendanceRecords(userId, startDate, endDate) {
  // Get single-day records
  const singleDayRecords = await Message.find({
    userId: userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
    category: {
      $in: ["WFH", "FULL_DAY_LEAVE", "HALF_DAY_LEAVE", "LATE_TO_OFFICE", "LEAVING_EARLY", "OOO"],
    },
  }).sort({ timestamp: -1 });

  // Get multi-day records that overlap with this range
  const multiDayRecords = await Message.find({
    userId: userId,
    category: "MULTI_DAY_LEAVE",
    $or: [
      // Leave starts before/during the range and ends during/after the range
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
  }).sort({ timestamp: -1 });

  return [...singleDayRecords, ...multiDayRecords];
}

/**
 * Build a detailed attendance report for a user
 */
function buildUserReport(userName, dateRangeText, records) {
  // Build report header
  let report = `*Attendance Report for ${userName} - ${dateRangeText}*\n\n`;

  // Group records by category
  const categories = {
    WFH: [],
    FULL_DAY_LEAVE: [],
    HALF_DAY_LEAVE: [],
    LATE_TO_OFFICE: [],
    LEAVING_EARLY: [],
    OOO: [],
    MULTI_DAY_LEAVE: [],
  };

  // Add records to their respective categories
  records.forEach((record) => {
    if (categories[record.category]) {
      categories[record.category].push(record);
    }
  });

  // Add each category's data to the report
  for (const [category, categoryRecords] of Object.entries(categories)) {
    if (categoryRecords.length === 0) continue;

    // Add category title
    report += `*${formatCategoryTitle(category)}:*\n`;

    // Add each record's details
    categoryRecords.forEach((record) => {
      report += formatRecordEntry(record, category);
    });

    report += "\n";
  }

  return report;
}

/**
 * Format a category code into a readable title
 */
function formatCategoryTitle(category) {
  switch (category) {
    case "WFH":
      return "Working From Home";
    case "FULL_DAY_LEAVE":
      return "Full Day Leave";
    case "HALF_DAY_LEAVE":
      return "Half Day Leave";
    case "LATE_TO_OFFICE":
      return "Late Arrival";
    case "LEAVING_EARLY":
      return "Early Departure";
    case "OOO":
      return "Out of Office";
    case "MULTI_DAY_LEAVE":
      return "Multi-Day Leave";
    default:
      return category;
  }
}

/**
 * Format a single record entry for the report
 */
function formatRecordEntry(record, category) {
  // Special format for multi-day leaves
  if (category === "MULTI_DAY_LEAVE" && record.leaveStartDate && record.leaveEndDate) {
    const start = record.leaveStartDate.toLocaleDateString();
    const end = record.leaveEndDate.toLocaleDateString();
    return `• Leave from ${start} to ${end}: "${record.message}"\n`;
  }

  // Standard format for other categories
  const time = record.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = record.timestamp.toLocaleDateString();
  return `• ${date} at ${time}: "${record.message}"\n`;
}
