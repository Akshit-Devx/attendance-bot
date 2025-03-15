import Message from "../../models/messageModel.js";
import { formatDate } from "../../utils/dateUtils.js";

/**
 * Generate a weekly calendar view showing who's in/out each day
 */
export const generateWeeklyCalendar = async (startDate, endDate) => {
  try {
    // Get all attendance records for the date range
    const { records, dateLabels } = await fetchAttendanceRecords(startDate, endDate);

    if (records.length === 0) {
      return `No attendance records found for ${formatDate(startDate)} to ${formatDate(endDate)}.`;
    }

    // Generate the calendar view
    return formatWeeklyCalendar(records, dateLabels, startDate, endDate);
  } catch (error) {
    console.error("❌ Error generating weekly calendar:", error);
    return "Error generating calendar view";
  }
};

/**
 * Fetch attendance records for a given date range
 */
async function fetchAttendanceRecords(startDate, endDate) {
  // Find all leaves and WFH in the date range
  const singleDayRecords = await Message.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
    category: {
      $in: ["WFH", "FULL_DAY_LEAVE", "HALF_DAY_LEAVE", "OOO"],
    },
  });

  // Find multi-day leaves that overlap with the date range
  const multiDayRecords = await Message.find({
    category: "MULTI_DAY_LEAVE",
    $or: [
      // Leave starts before/during range and ends during/after range
      {
        leaveStartDate: { $lte: endDate },
        leaveEndDate: { $gte: startDate },
      },
    ],
  });

  // Create date labels for the week
  const dateLabels = generateDateLabels(startDate, endDate);

  // Combine all records and return
  return {
    records: [...singleDayRecords, ...multiDayRecords],
    dateLabels,
  };
}

/**
 * Generate date labels for the week
 */
function generateDateLabels(startDate, endDate) {
  const labels = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString("en-US", { weekday: "short" });
    const dayDate = currentDate.getDate();
    labels.push(`${dayName} ${dayDate}`);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return labels;
}

/**
 * Format the weekly calendar view
 */
function formatWeeklyCalendar(records, dateLabels, startDate, endDate) {
  // Group records by user
  const userRecords = groupRecordsByUser(records);

  // Format the report
  let calendarView = `*Weekly Attendance Calendar (${formatDate(startDate)} to ${formatDate(
    endDate
  )})*\n\n`;

  // Add header row with date labels
  const headerRow = ["User", ...dateLabels].join(" | ");
  calendarView += `${headerRow}\n`;

  // Add separator
  const separator = Array(headerRow.length).fill("-").join("");
  calendarView += `${separator}\n`;

  // Add user rows
  Object.entries(userRecords).forEach(([userName, statuses]) => {
    const statusIcons = statuses.map((status) => getStatusIcon(status));
    calendarView += `${userName} | ${statusIcons.join(" | ")}\n`;
  });

  // Add legend
  calendarView += `\n*Legend:*\n`;
  calendarView += `• 🏠 - Working From Home\n`;
  calendarView += `• ❌ - On Leave (Full Day)\n`;
  calendarView += `• 🕒 - Half Day\n`;
  calendarView += `• 🌐 - Out of Office\n`;
  calendarView += `• ✅ - In Office\n`;

  return calendarView;
}

/**
 * Group attendance records by user
 */
function groupRecordsByUser(records) {
  const userRecords = {};

  // Process each record and build a map of user status for each day
  records.forEach((record) => {
    const { userName, category, timestamp } = record;

    if (!userRecords[userName]) {
      userRecords[userName] = Array(7).fill("IN_OFFICE"); // Default: in office
    }

    // Handle multi-day leaves
    if (category === "MULTI_DAY_LEAVE" && record.leaveStartDate && record.leaveEndDate) {
      applyMultiDayLeave(userRecords, userName, record.leaveStartDate, record.leaveEndDate);
    }
    // Handle single-day records
    else {
      const dayIndex = getDayIndex(timestamp);
      if (dayIndex >= 0 && dayIndex < 7) {
        userRecords[userName][dayIndex] = category;
      }
    }
  });

  return userRecords;
}

/**
 * Apply multi-day leave to user records
 */
function applyMultiDayLeave(userRecords, userName, startDate, endDate) {
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayIndex = getDayIndex(currentDate);
    if (dayIndex >= 0 && dayIndex < 7) {
      userRecords[userName][dayIndex] = "FULL_DAY_LEAVE";
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

/**
 * Get day index (0-6) from a date
 */
function getDayIndex(date) {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - baseDate.getDay()); // Set to Sunday of current week
  baseDate.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return Math.floor((targetDate - baseDate) / (24 * 60 * 60 * 1000));
}

/**
 * Get status icon for calendar view
 */
function getStatusIcon(status) {
  switch (status) {
    case "WFH":
      return "🏠";
    case "FULL_DAY_LEAVE":
      return "❌";
    case "HALF_DAY_LEAVE":
      return "🕒";
    case "OOO":
      return "🌐";
    case "MULTI_DAY_LEAVE":
      return "❌";
    default:
      return "✅";
  }
}

/**
 * Get the start and end dates for the current week
 */
export const getCurrentWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Set to previous Monday
  const monday = new Date(today);
  monday.setDate(monday.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  // Set to coming Friday
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  return { startDate: monday, endDate: friday };
};
