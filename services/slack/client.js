import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

dotenv.config();

let slackClient = null;

/**
 * Get or create the Slack client
 */
export const getSlackClient = () => {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;

    if (!token) {
      console.error("❌ SLACK_BOT_TOKEN is missing in environment variables");
    }

    slackClient = new WebClient(token);
  }

  return slackClient;
};
