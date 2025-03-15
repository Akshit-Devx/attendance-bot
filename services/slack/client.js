import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

let slackClient = null;

/**
 * Initialize and get the Slack client
 */
export const getSlackClient = () => {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;

    if (!token) {
      console.error("❌ SLACK_BOT_TOKEN environment variable is missing");
      console.error("Please add your Slack Bot Token to the .env file");
    }

    slackClient = new WebClient(token);
  }

  return slackClient;
};

/**
 * Check if token is available
 */
export const isTokenAvailable = () => {
  return !!process.env.SLACK_BOT_TOKEN;
};
