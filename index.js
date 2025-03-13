import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import { WebClient } from "@slack/web-api";
import crypto from "crypto";
import mongoose from "mongoose";
import { analyzeCategory } from "./services/openai.js";

const app = express();
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define Mongoose Schema
const messageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  channelId: { type: String, required: true },
  message: { type: String, required: true }, // Latest message
  updatedMessages: [
    {
      text: { type: String, required: true },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  category: {
    type: String,
    enum: [
      "WFH",
      "FULL_DAY_LEAVE",
      "HALF_DAY_LEAVE",
      "LATE_TO_OFFICE",
      "LEAVING_EARLY",
      "OOO",
      "OTHER",
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  messageId: { type: String, required: true, unique: true },
});
const Message = mongoose.model("Message", messageSchema);

app.use(bodyParser.json());

// Slack Request Verification Middleware
app.use((req, res, next) => {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const body = JSON.stringify(req.body);
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest("hex")}`;

  if (signature !== computedSignature) {
    return res.status(400).send("❌ Invalid request signature");
  }
  next();
});

// Slack Event Endpoint
app.post("/slack/events", async (req, res) => {
  console.log("📥 Slack Event Received:", req.body);
  const { type, event } = req.body;

  if (type === "url_verification") {
    return res.status(200).send({ challenge: req.body.challenge });
  }

  if (event && event.type === "message" && !event.bot_id) {
    console.log(`📝 New message from ${event.user}: ${event.text}`);

    try {
      const userInfo = await slackClient.users.info({ user: event.user });
      const userName = userInfo.user.real_name || userInfo.user.name;

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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
