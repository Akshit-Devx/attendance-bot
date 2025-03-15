import { fetchMessages, formatReport } from "./reportUtils.js";

/**
 * Get attendance data for a specific date range
 */
export const getDateRangeAttendance = async (startDate, endDate) => {
  try {
    // Fetch relevant messages
    const { singleDayMessages, multiDayLeaves } = await fetchMessages(startDate, endDate);

    // Combine all messages for processing
    const messages = [...singleDayMessages, ...multiDayLeaves];

    // Group messages by category and user
    const categorizedUsers = groupMessagesByCategory(messages);

    // Generate report
    return formatReport(categorizedUsers);
  } catch (error) {
    console.error("❌ Error fetching date range attendance:", error);
    return "Error fetching attendance data";
  }
};

/**
 * Group messages by category and user, keeping only the most recent message per user
 */
function groupMessagesByCategory(messages) {
  const categorizedUsers = {
    WFH: new Map(),
    FULL_DAY_LEAVE: new Map(),
    HALF_DAY_LEAVE: new Map(),
    OOO: new Map(),
    MULTI_DAY_LEAVE: new Map(),
  };

  messages.forEach((msg) => {
    if (categorizedUsers.hasOwnProperty(msg.category)) {
      // Keep only the most recent message per user/category
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

  return categorizedUsers;
}
