/**
 * Get the prompt for category analysis
 */
export const getCategoryPrompt = (message) => {
  return `
You are a classifier for Slack messages about attendance and leave. Categorize the message into one of the following:
- WFH (Working from Home)
- FULL_DAY_LEAVE (Taking a full day leave)
- HALF_DAY_LEAVE (Taking a half-day leave)
- LATE_TO_OFFICE (Arriving late to office)
- LEAVING_EARLY (Leaving the office early)
- OOO (Out of Office)
- MULTI_DAY_LEAVE (Taking leave for multiple consecutive days)
- OTHER (If it doesn't fit any category)

**Message:** "${message}"

### **Detailed Classification Guide:**

**MULTI_DAY_LEAVE:**
- Contains phrases indicating multiple days like: "from [date] to [date]", "next week", "for the next few days", "until [date]"
- References a range of dates or multiple consecutive days of leave
- Examples: "on leave from 2nd March to 6th March", "I'll be on leave next week", "Taking leave for the rest of the week"

**FULL_DAY_LEAVE:**
- Contains phrases like: "on leave today", "taking leave", "leave today", "day off", "sick leave", "annual leave", "vacation", "out sick", "personal day"
- Mentions of medical appointments, family emergencies, being unwell, personal reasons
- References to vacation, public holidays, bereavement, maternity/paternity leave, childcare leave, study leave, casual leave
- Any mentions of being completely unavailable or offline for the entire day
- Only applies to a single day (today or a specific date), not multiple days

**HALF_DAY_LEAVE:**
- Contains phrases like: "half-day", "half day", "working partial day"
- Mentions specific timing like "leaving at [time]" or "available until [time]"
- Indicates availability for only part of the workday

**WFH:**
- Contains phrases like: "WFH", "working from home", "remote work", "working remotely"
- Indicates the person is working but not from the office location
- May mention health issues but explicitly states they are working

**LATE_TO_OFFICE:**
- Contains phrases like: "coming late", "will be there by [time]", "delayed", "running late"
- Indicates arrival to office but later than usual start time
- Specifies a time of arrival that is after normal hours

**LEAVING_EARLY:**
- Contains phrases like: "leaving early", "need to go at [time]", "ducking out early"
- Indicates departing from work before the end of normal working hours
- Specifies an early departure time

**OOO:**
- Contains phrases like: "OOO", "Out of Office", "offline", "unavailable"
- Indicates complete unavailability, often for travel or external commitments
- Usually mentions being uncontactable or unreachable

Return only the category name (WFH, FULL_DAY_LEAVE, HALF_DAY_LEAVE, LATE_TO_OFFICE, LEAVING_EARLY, OOO, MULTI_DAY_LEAVE, or OTHER), nothing else.
`;
};

/**
 * Get the prompt for date range extraction
 */
export const getDateRangePrompt = (message) => {
  return `
You are an AI assistant that extracts date ranges from leave messages. Given a message about taking leave, identify the start date and end date of the leave period.

Message: "${message}"

Rules:
1. If the message mentions specific dates like "from March 2nd to March 6th", extract these dates.
2. If the message mentions "next week", calculate this as Monday to Friday of the following week from today.
3. If the message mentions "this week", calculate this as the remaining days of the current week.
4. If the message mentions "tomorrow", set both start and end date to tomorrow.
5. If the message mentions "today", set both start and end date to today.
6. For "for X days" or "X days leave", calculate the end date as today + X days.
7. For "until Friday" or similar, calculate the date of the upcoming Friday.
8. If no clear dates are mentioned, return null for both start and end date.

Current date for reference: ${new Date().toISOString().split("T")[0]}

Return your response in this exact JSON format (as a string):
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}

If you cannot determine the dates, return:
{
  "startDate": null,
  "endDate": null
}

Important: Return ONLY the JSON string and nothing else.
`;
};
