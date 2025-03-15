/**
 * Format a date as YYYY-MM-DD string
 */
export const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

/**
 * Get the date for today with time set to midnight
 */
export const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Get the date for tomorrow with time set to midnight
 */
export const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

/**
 * Get the date for yesterday with time set to midnight
 */
export const getYesterday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
};

/**
 * Parse a date string like "4 March" and return a Date object
 */
export const parseDateString = (dateStr, year = new Date().getFullYear()) => {
  try {
    // Remove ordinals (st, nd, rd, th) for better parsing
    const cleanDateStr = dateStr.replace(/(st|nd|rd|th)/g, "");
    const date = new Date(`${cleanDateStr} ${year}`);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return date;
  } catch (error) {
    console.error(`Error parsing date string "${dateStr}":`, error);
    return null;
  }
};

/**
 * Format a date range in a human-readable way
 */
export const formatDateRange = (startDate, endDate) => {
  // If dates are the same, just show one date
  if (startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString();
  }

  // Otherwise show the range
  return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
};

/**
 * Check if a date is today
 */
export const isToday = (date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};
