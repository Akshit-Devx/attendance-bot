/**
 * Parse a message to extract date range information
 */
export const parseMessageForDateRange = (message) => {
  const text = message.toLowerCase();

  // Check for keywords
  if (text.includes("today")) {
    return getTodayRange();
  }

  if (text.includes("tomorrow")) {
    return getTomorrowRange();
  }

  if (text.includes("yesterday")) {
    return getYesterdayRange();
  }

  // Check for date range (e.g., "from 4th March to 10th March")
  const dateRangeResult = parseExplicitDateRange(text);
  if (dateRangeResult.startDate) {
    return dateRangeResult;
  }

  return { startDate: null, endDate: null, dateText: null };
};

/**
 * Get date range for today
 */
function getTodayRange() {
  const today = new Date();
  const startDate = new Date(today.setHours(0, 0, 0, 0));
  const endDate = new Date(today.setHours(23, 59, 59, 999));
  return {
    startDate,
    endDate,
    dateText: "for Today",
  };
}

/**
 * Get date range for tomorrow
 */
function getTomorrowRange() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = new Date(tomorrow.setHours(0, 0, 0, 0));
  const endDate = new Date(tomorrow.setHours(23, 59, 59, 999));
  return {
    startDate,
    endDate,
    dateText: "for Tomorrow",
  };
}

/**
 * Get date range for yesterday
 */
function getYesterdayRange() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startDate = new Date(yesterday.setHours(0, 0, 0, 0));
  const endDate = new Date(yesterday.setHours(23, 59, 59, 999));
  return {
    startDate,
    endDate,
    dateText: "for Yesterday",
  };
}

/**
 * Parse explicit date range from text like "from 4th March to 10th March"
 */
function parseExplicitDateRange(text) {
  const dateRangeRegex = /from\s+(\d+(?:st|nd|rd|th)?\s+\w+)\s+to\s+(\d+(?:st|nd|rd|th)?\s+\w+)/i;
  const dateRangeMatch = text.match(dateRangeRegex);

  if (dateRangeMatch) {
    try {
      // Remove ordinals (st, nd, rd, th) for better parsing
      const startDateStr = dateRangeMatch[1].replace(/(st|nd|rd|th)/g, "");
      const endDateStr = dateRangeMatch[2].replace(/(st|nd|rd|th)/g, "");

      // Assuming current year if not specified
      const currentYear = new Date().getFullYear();

      const startDate = new Date(`${startDateStr} ${currentYear}`);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(`${endDateStr} ${currentYear}`);
      endDate.setHours(23, 59, 59, 999);

      // Validate dates are valid
      if (isNaN(startDate) || isNaN(endDate)) {
        throw new Error("Invalid date format");
      }

      return {
        startDate,
        endDate,
        dateText: `from ${dateRangeMatch[1]} to ${dateRangeMatch[2]}`,
      };
    } catch (error) {
      console.error("Error parsing date range:", error);
    }
  }

  return { startDate: null, endDate: null, dateText: null };
}
