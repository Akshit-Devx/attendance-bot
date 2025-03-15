/**
 * Extract mentioned user ID from message text
 */
export const extractMentionedUserId = (mentionedUserMatches) => {
  if (!mentionedUserMatches || mentionedUserMatches.length < 2) {
    return null;
  }
  return mentionedUserMatches[1].replace(/[<>@]/g, "");
};

/**
 * Check if message is a command
 */
export const isCommand = (text, botId) => {
  return text.includes(`<@${botId}>`);
};

/**
 * Check if message is a help command
 */
export const isHelpCommand = (text) => {
  return text.toLowerCase().includes("help");
};

/**
 * Check if message is a report command
 */
export const isReportCommand = (text) => {
  return text.toLowerCase().includes("report");
};

/**
 * Check if message is a calendar command
 */
export const isCalendarCommand = (text) => {
  return text.toLowerCase().includes("calendar");
};

/**
 * Extract all mentioned user IDs
 */
export const getMentionedUsers = (text) => {
  const mentionPattern = /<@([A-Z0-9]+)>/g;
  return text.match(mentionPattern) || [];
};
