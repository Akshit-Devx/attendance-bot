import Message from "../models/messageModel.js";
import { formatDateRange, isToday } from "../utils/dateUtils.js";
import { getUserInfo } from "./slackService.js";

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
    return "Error fetching attendance data";
  }
};

/**
 * Get user's attendance for specific date(s)
 */
export const getUserAttendanceForDate = async (userId, startDate, endDate) => {
  try {
    // Get user name
    let userName = "Unknown User";
    try {
      const userInfo = await getUserInfo(userId);
      userName = userInfo;
    } catch (error) {
      console.error("Could not get user info", error);
    }

    // Format date range for display
    const isForToday = isToday(startDate) && isToday(endDate);
    const dateRangeText = isForToday ? "Today" : formatDateRange(startDate, endDate);

    // Find single-day attendance records within date range
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

    // Find multi-day leave records that overlap with this date range
    const multiDayRecords = await Message.find({
      userId: userId,
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
    }).sort({ timestamp: -1 });

    // Combine all records
    const allRecords = [...singleDayRecords, ...multiDayRecords];

    // If no attendance records found
    if (allRecords.length === 0) {
      return `*Attendance Report for ${userName} - ${dateRangeText}*\n\nNo attendance records found for this date range.`;
    }

    // Build report
    let report = `*Attendance Report for ${userName} - ${dateRangeText}*\n\n`;

    // Group by category
    const categories = {
      WFH: [],
      FULL_DAY_LEAVE: [],
      HALF_DAY_LEAVE: [],
      LATE_TO_OFFICE: [],
      LEAVING_EARLY: [],
      OOO: [],
      MULTI_DAY_LEAVE: [],
    };

    // Organize messages by category
    allRecords.forEach((record) => {
      if (categories[record.category]) {
        categories[record.category].push(record);
      }
    });

    // Add each category to report if it has records
    Object.keys(categories).forEach((category) => {
      const records = categories[category];
      if (records.length > 0) {
        // Convert category code to readable format
        let categoryTitle;
        switch (category) {
          case "WFH":
            categoryTitle = "Working From Home";
            break;
          case "FULL_DAY_LEAVE":
            categoryTitle = "Full Day Leave";
            break;
          case "HALF_DAY_LEAVE":
            categoryTitle = "Half Day Leave";
            break;
          case "LATE_TO_OFFICE":
            categoryTitle = "Late Arrival";
            break;
          case "LEAVING_EARLY":
            categoryTitle = "Early Departure";
            break;
          case "OOO":
            categoryTitle = "Out of Office";
            break;
          case "MULTI_DAY_LEAVE":
            categoryTitle = "Multi-Day Leave";
            break;
          default:
            categoryTitle = category;
        }

        report += `*${categoryTitle}:*\n`;

        records.forEach((record) => {
          // Format message
          const time = record.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const date = record.timestamp.toLocaleDateString();

          if (category === "MULTI_DAY_LEAVE" && record.leaveStartDate && record.leaveEndDate) {
            const start = record.leaveStartDate.toLocaleDateString();
            const end = record.leaveEndDate.toLocaleDateString();
            report += `• Leave from ${start} to ${end}: "${record.message}"\n`;
          } else {
            report += `• ${date} at ${time}: "${record.message}"\n`;
          }
        });

        report += "\n";
      }
    });

    return report;
  } catch (error) {
    console.error("❌ Error fetching user attendance for date:", error);
    return `Error fetching attendance data for this user.`;
  }
};
