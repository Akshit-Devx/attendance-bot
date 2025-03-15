import {
  generateWeeklyCalendar,
  getCurrentWeekDates,
} from "../services/calendar/calendarService.js";
import { parseMessageForDateRange } from "../services/report/index.js";
import { sendSlackMessage } from "../services/slack/index.js";

/**
 * Handle calendar command
 */
export const handleCalendarCommand = async (event) => {
  console.log("📅 Calendar command received");

  try {
    // Check if a specific date range is mentioned
    const { startDate, endDate } = parseMessageForDateRange(event.text);

    let calendarDates;
    let titleText;

    // If "this week" is mentioned or no specific dates
    if (event.text.toLowerCase().includes("this week") || (!startDate && !endDate)) {
      calendarDates = getCurrentWeekDates();
      titleText = "for this week";
    }
    // If specific dates are provided
    else if (startDate && endDate) {
      calendarDates = { startDate, endDate };
      titleText = `from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    }
    // Default to current week
    else {
      calendarDates = getCurrentWeekDates();
      titleText = "for this week";
    }

    // Generate and send the calendar
    const calendar = await generateWeeklyCalendar(calendarDates.startDate, calendarDates.endDate);
    await sendSlackMessage(event.channel, calendar);

    return true;
  } catch (error) {
    console.error("❌ Error handling calendar command:", error);
    await sendSlackMessage(
      event.channel,
      "Sorry, I couldn't generate the calendar view. Please try again later."
    );
    return false;
  }
};
