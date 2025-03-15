import express from "express";
import Message from "../models/messageModel.js";
import { analyzeCategory } from "../services/openai.js";
import {
  getAttendanceStats,
  getUserInfo,
  sendSlackMessage,
} from "../services/slackService.js";

const router = express.Router();

router.post("/events", async (req, res) => {
  console.log("📥 Slack Event Received:", req.body);

  // Acknowledge the request immediately to prevent Slack retries
  res.status(200).send("OK");

  const { type, event } = req.body;

  if (type === "url_verification") {
    return res.status(200).send({ challenge: req.body.challenge });
  }

  // Ensure the event is a new user message (not a bot message)
  if (event && event.type === "message" && !event.bot_id) {
    console.log(`📝 New message from ${event.user}: ${event.text}`);

    try {
      // Prevent duplicate processing by checking if the message already exists
      const existingMessage = await Message.findOne({ messageId: event.ts });
      if (existingMessage) {
        console.log("⚠️ Message already processed, skipping...");
        return;
      }

      const userName = await getUserInfo(event.user);

      // Check if bot is mentioned
      if (event.text.includes(`<@${process.env.SLACK_BOT_ID}>`)) {
        const mentionedUserMatch = event.text.match(/<@(\w+)>/g);
        console.log("mentionedUserMatch>>", mentionedUserMatch);

        if (mentionedUserMatch && mentionedUserMatch.length > 1) {
          const mentionedUserId = mentionedUserMatch[1].replace(/[<>@]/g, "");
          const attendanceStats = await getAttendanceStats(mentionedUserId);

          await sendSlackMessage(
            event.channel,
            `<@${mentionedUserId}>'s Attendance: ${attendanceStats}`
          );

          return;
        }
      }

      // Detect category and store the message
      const detectedCategory = await analyzeCategory(event.text);

      const newMessage = new Message({
        userId: event.user,
        userName,
        channelId: event.channel,
        message: event.text,
        category: detectedCategory,
        timestamp: new Date(parseFloat(event.ts) * 1000),
        messageId: event.ts, // Store messageId to prevent reprocessing
      });

      await newMessage.save();
      console.log("✅ Message saved to MongoDB:", newMessage);
    } catch (error) {
      console.error("❌ Error saving message:", error);
    }
  }

  // Handle message edits
  if (event && event.subtype === "message_changed") {
    console.log(`✏️ Message Edited: ${event.message.text}`);

    try {
      const existingMessage = await Message.findOne({
        messageId: event.message.ts,
      });

      if (existingMessage) {
        existingMessage.updatedMessages.push({
          text: existingMessage.message,
          updatedAt: new Date(),
        });

        existingMessage.message = event.message.text;
        existingMessage.category = await analyzeCategory(event.message.text);
        existingMessage.lastUpdated = new Date();

        await existingMessage.save();
        console.log("🔄 Message updated in MongoDB:", existingMessage);
      } else {
        console.log("⚠️ Edited message not found in database");
      }
    } catch (error) {
      console.error("❌ Error updating message:", error);
    }
  }
});

export default router;
