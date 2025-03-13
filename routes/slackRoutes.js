import express from "express";
import Message from "../models/messageModel.js";
import { analyzeCategory } from "../services/openai.js";
import { getUserInfo } from "../models/slackService.js";

const router = express.Router();

router.post("/events", async (req, res) => {
  console.log("📥 Slack Event Received:", req.body);
  const { type, event } = req.body;

  if (type === "url_verification") {
    return res.status(200).send({ challenge: req.body.challenge });
  }

  if (event && event.type === "message" && !event.bot_id) {
    console.log(`📝 New message from ${event.user}: ${event.text}`);

    try {
      const userName = await getUserInfo(event.user);
      const detectedCategory = await analyzeCategory(event.text);

      const newMessage = new Message({
        userId: event.user,
        userName,
        channelId: event.channel,
        message: event.text,
        category: detectedCategory,
        timestamp: new Date(parseFloat(event.ts) * 1000),
        messageId: event.ts,
      });

      await newMessage.save();
      console.log("✅ Message saved to MongoDB:", newMessage);
    } catch (error) {
      console.error("❌ Error saving message:", error);
    }
  }

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

  res.status(200).send("OK");
});

export default router;
