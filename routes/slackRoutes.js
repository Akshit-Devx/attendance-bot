import express from "express";
import { handleCalendarCommand } from "../controllers/calendarController.js";
import {
  handleHelpCommand,
  handleReportCommand,
  handleUserStatsCommand,
} from "../controllers/commandController.js";
import {
  extractMentionedUserId,
  getMentionedUsers,
  isCalendarCommand,
  isCommand,
  isHelpCommand,
  isReportCommand,
} from "../controllers/eventParser.js";
import { processMessageEdit, processNewMessage } from "../controllers/messageController.js";
import Message from "../models/messageModel.js";
import { getUserInfo } from "../services/slack/index.js";

const router = express.Router();

// Get the bot ID from environment
const BOT_ID = process.env.SLACK_BOT_ID || "U08H53KGXM5"; // Using your provided bot ID as fallback

router.post("/events", async (req, res) => {
  console.log("📥 Slack Event Received");

  // Acknowledge the request immediately to prevent Slack retries
  res.status(200).send("OK");

  try {
    const { type, event } = req.body;

    // Handle URL verification challenge
    if (type === "url_verification") {
      return res.status(200).send({ challenge: req.body.challenge });
    }

    // Handle message events
    if (event && event.type === "message") {
      // Skip bot messages
      if (event.bot_id) return;

      console.log(`📝 New message from ${event.user}: ${event.text}`);

      // Handle message subtype (like message_changed)
      if (event.subtype === "message_changed") {
        await processMessageEdit(event);
        return;
      }

      // Process regular new messages
      await handleNewMessage(event);
    }
  } catch (error) {
    console.error("❌ Error processing Slack event:", error);
  }
});

/**
 * Handle new messages
 */
async function handleNewMessage(event) {
  try {
    // Prevent duplicate processing
    const existingMessage = await Message.findOne({ messageId: event.ts });
    if (existingMessage) {
      console.log("⚠️ Message already processed, skipping...");
      return;
    }

    const userName = await getUserInfo(event.user);

    // Check if the message is a command directed to the bot
    if (isCommand(event.text, BOT_ID)) {
      console.log(`🤖 Bot mentioned: <@${BOT_ID}>`);

      // Check for help command
      if (isHelpCommand(event.text)) {
        await handleHelpCommand(event);
        return;
      }

      // Check for report command
      if (isReportCommand(event.text)) {
        await handleReportCommand(event);
        return;
      }

      // Check for calendar command
      if (isCalendarCommand(event.text)) {
        await handleCalendarCommand(event);
        return;
      }

      // Check for user stats command
      const mentionedUsers = getMentionedUsers(event.text);
      if (mentionedUsers.length > 1) {
        const mentionedUserId = extractMentionedUserId(mentionedUsers);
        if (mentionedUserId) {
          await handleUserStatsCommand(event, mentionedUserId);
          return;
        }
      }
    }

    // If not a command, process as a regular attendance message
    await processNewMessage(event, userName);
  } catch (error) {
    console.error("❌ Error handling message:", error);
  }
}

export default router;
