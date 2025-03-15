import express from "express";
import Message from "../models/messageModel.js";
import { getAttendanceStats, getUserAttendanceForDate } from "../services/attendanceService.js";
import { analyzeCategory, extractDateRange } from "../services/openai.js";
import { getDateRangeAttendance, parseMessageForDateRange } from "../services/reportService.js";
import { getHelpMessage, getUserInfo, sendSlackMessage } from "../services/slackService.js";

const router = express.Router();

// Get the bot ID from environment
const BOT_ID = process.env.SLACK_BOT_ID || "U08H53KGXM5"; // Using your provided bot ID as fallback

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

      // Check if bot is mentioned - use the BOT_ID constant
      if (event.text.includes(`<@${BOT_ID}>`)) {
        console.log(`🤖 Bot mentioned: <@${BOT_ID}>`);

        // Check if it's a help command
        if (event.text.toLowerCase().includes("help")) {
          console.log("🆘 Help command received");
          try {
            const helpMessage = getHelpMessage();
            await sendSlackMessage(event.channel, helpMessage);
            console.log("✅ Help message sent");
          } catch (error) {
            console.error("❌ Failed to send help message:", error.message);
            // Continue with other processing and don't exit
          }
          return;
        }

        // Check if it's a report command
        if (event.text.toLowerCase().includes("report")) {
          console.log("📊 Report command received");

          // Parse the date range from the message
          const { startDate, endDate, dateText } = parseMessageForDateRange(event.text);

          if (startDate && endDate) {
            // Format the date range for display
            const today = new Date();
            const isForToday =
              startDate.getDate() === today.getDate() &&
              startDate.getMonth() === today.getMonth() &&
              startDate.getFullYear() === today.getFullYear() &&
              endDate.getDate() === today.getDate() &&
              endDate.getMonth() === today.getMonth() &&
              endDate.getFullYear() === today.getFullYear();

            // Generate title based on date range
            let title = isForToday
              ? "*Today's Attendance Report*\n"
              : `*Attendance Report ${dateText}*\n`;

            // Get attendance report for the date range
            const report = await getDateRangeAttendance(startDate, endDate);
            await sendSlackMessage(event.channel, `${title}${report}`);
            return;
          } else {
            await sendSlackMessage(
              event.channel,
              "I couldn't understand the date range. Please try something like `@attendance report today` or `@attendance report from 4th March to 10th March`."
            );
            return;
          }
        }

        // Handle user-specific attendance query
        const mentionedUserMatch = event.text.match(/<@(\w+)>/g);
        console.log("mentionedUserMatch>>", mentionedUserMatch);

        if (mentionedUserMatch && mentionedUserMatch.length > 1) {
          const mentionedUserId = mentionedUserMatch[1].replace(/[<>@]/g, "");

          // Check if the request includes a date specification
          const { startDate, endDate, dateText } = parseMessageForDateRange(event.text);

          if (startDate && endDate) {
            // User attendance for specific date range
            console.log(
              `🗓️ Getting attendance for user ${mentionedUserId} for date range ${dateText}`
            );
            const report = await getUserAttendanceForDate(mentionedUserId, startDate, endDate);
            await sendSlackMessage(event.channel, report);
          } else {
            // Regular user stats (all time)
            console.log(`📊 Getting general attendance stats for user ${mentionedUserId}`);
            const attendanceStats = await getAttendanceStats(mentionedUserId);
            await sendSlackMessage(event.channel, attendanceStats);
          }
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

      // Handle multi-day leave messages
      if (detectedCategory === "MULTI_DAY_LEAVE") {
        console.log("📅 Multi-day leave detected, extracting date range...");
        const dateRange = await extractDateRange(event.text);

        if (dateRange.startDate && dateRange.endDate) {
          newMessage.leaveStartDate = new Date(dateRange.startDate);
          newMessage.leaveEndDate = new Date(dateRange.endDate);
          console.log(`📆 Leave dates extracted: ${dateRange.startDate} to ${dateRange.endDate}`);
        }
      }

      await newMessage.save();
      console.log("✅ Message saved to MongoDB:", newMessage);

      // Send confirmation in thread (optional)
      if (detectedCategory !== "OTHER") {
        const categoryMessages = {
          WFH: "I've recorded that you're working from home today.",
          FULL_DAY_LEAVE: "I've recorded your full day leave.",
          HALF_DAY_LEAVE: "I've recorded your half-day leave.",
          LATE_TO_OFFICE: "I've noted that you'll be arriving late.",
          LEAVING_EARLY: "I've noted that you'll be leaving early today.",
          OOO: "I've marked you as out of office.",
          MULTI_DAY_LEAVE:
            newMessage.leaveStartDate && newMessage.leaveEndDate
              ? `I've recorded your leave from ${newMessage.leaveStartDate.toLocaleDateString()} to ${newMessage.leaveEndDate.toLocaleDateString()}.`
              : "I've recorded your multi-day leave.",
        };

        // Uncomment this if you want confirmation messages in threads
        // await slackClient.chat.postMessage({
        //   channel: event.channel,
        //   thread_ts: event.ts,
        //   text: categoryMessages[detectedCategory] || "I've recorded your message.",
        //   unfurl_links: false,
        // });
      }
    } catch (error) {
      console.error("❌ Error processing message:", error);
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
