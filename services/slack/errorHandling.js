/**
 * Log detailed Slack error information
 */
export const logSlackError = (error) => {
  if (!error.data) {
    return;
  }

  if (error.data.error === "not_authed") {
    console.error("Authentication failed. Check your SLACK_BOT_TOKEN.");
  } else if (error.data.error === "channel_not_found") {
    console.error(`Channel not found: ${error.data?.channel || "unknown"}`);
  } else if (error.data.error === "missing_scope") {
    console.error("Bot token missing required scopes. Need 'chat:write' permission.");
    if (error.data?.response_metadata?.acceptedScopes) {
      console.error("Required scopes:", error.data.response_metadata.acceptedScopes);
    }
  } else if (error.data.error === "user_not_found") {
    console.error("User not found error.");
  } else if (error.data.error === "rate_limited") {
    console.error(`Rate limited. Retry after: ${error.data.retry_after || "unknown"} seconds`);
  } else {
    console.error(`Slack API Error: ${error.data.error}`);
  }
};
