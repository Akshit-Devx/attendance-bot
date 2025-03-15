import Message from "../../models/messageModel.js";

/**
 * Fetch messages from database within the specified date range
 */
export async function fetchMessages(startDate, endDate) {
  // Query single-day messages within date range
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
      // Leave starts before/during range and ends during/after range
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

  return { singleDayMessages, multiDayLeaves };
}

/**
 * Format attendance report from categorized users data
 */
export function formatReport(categorizedUsers) {
  let report = "";

  // Category order and titles
  const categoryConfig = [
    { key: "FULL_DAY_LEAVE", title: "Full Day Leaves" },
    { key: "HALF_DAY_LEAVE", title: "Half Day Leaves" },
    { key: "WFH", title: "Working From Home" },
    { key: "OOO", title: "Out of Office" },
    { key: "MULTI_DAY_LEAVE", title: "Multi-Day Leaves" },
  ];

  // Generate sections for each category
  for (const category of categoryConfig) {
    const users = Array.from(categorizedUsers[category.key].values());
    report += `*${category.title} (${users.length}):*\n`;

    if (users.length > 0) {
      for (const user of users) {
        report += formatUserEntry(user, category.key);
      }
    } else {
      report += "• None\n";
    }

    report += "\n";
  }

  // Add summary of affected users
  const totalAffectedUsers = countUniqueUsers(categorizedUsers);
  report += `*Total employees with leave/WFH:* ${totalAffectedUsers}`;

  return report;
}

/**
 * Format a single user entry for the report
 */
function formatUserEntry(user, category) {
  // Truncate long messages
  const reason = user.message.length > 50 ? user.message.substring(0, 47) + "..." : user.message;

  // Special formatting for multi-day leaves
  if (category === "MULTI_DAY_LEAVE" && user.startDate && user.endDate) {
    const startDateStr = user.startDate.toLocaleDateString();
    const endDateStr = user.endDate.toLocaleDateString();
    return `• *${user.userName}*: ${startDateStr} to ${endDateStr} - ${reason}\n`;
  }

  // Standard formatting for other categories
  return `• *${user.userName}*: ${reason}\n`;
}

/**
 * Count unique users across all categories
 */
function countUniqueUsers(categorizedUsers) {
  const totalAffectedUsers = new Set();

  Object.values(categorizedUsers).forEach((userMap) => {
    userMap.forEach((userData, userId) => {
      totalAffectedUsers.add(userId);
    });
  });

  return totalAffectedUsers.size;
}
