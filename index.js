require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { WebClient } = require("@slack/web-api");
const crypto = require("crypto");
const mongoose = require("mongoose");

const app = express();
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

// Define a Mongoose Schema
const messageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  channelId: { type: String, required: true },
  message: { type: String, required: true }, // Always holds the latest message
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
      "OTHER",
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  messageId: { type: String, required: true, unique: true },
});
const Message = mongoose.model("Message", messageSchema);

// Middleware to verify Slack requests
app.use(bodyParser.json());

app.use((req, res, next) => {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const body = JSON.stringify(req.body);

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest("hex")}`;

  if (signature !== computedSignature) {
    return res.status(400).send("Invalid request signature");
  }
  next();
});

// Function to determine category based on text
const determineCategory = (text) => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("wfh")) return "WFH";
  if (lowerText.includes("leave")) return "FULL_DAY_LEAVE";
  if (lowerText.includes("half day")) return "HALF_DAY_LEAVE";
  if (lowerText.includes("late")) return "LATE_TO_OFFICE";
  if (lowerText.includes("early")) return "LEAVING_EARLY";
  return "OTHER";
};

// Slack Event Endpoint
app.post("/slack/events", async (req, res) => {
  console.log("request received", req.body);
  const { type, event } = req.body;

  // Slack URL verification challenge
  if (type === "url_verification") {
    return res.status(200).send({ challenge: req.body.challenge });
  }

  // Handle new messages
  if (event && event.type === "message" && !event.bot_id) {
    console.log(`📝 New message from ${event.user}: ${event.text}`);

    try {
      const userInfo = await slackClient.users.info({ user: event.user });
      const userName = userInfo.user.real_name || userInfo.user.name;

      const detectedCategory = determineCategory(event.text);

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

  // Handle edited messages
  if (event && event.subtype === "message_changed") {
    console.log(`✏️ Message Edited: ${event.message.text}`);

    try {
      const existingMessage = await Message.findOne({
        messageId: event.message.ts,
      });

      if (existingMessage) {
        // Move old message to updatedMessages array
        existingMessage.updatedMessages.push({
          text: existingMessage.message,
          updatedAt: new Date(),
        });

        // Update latest message and category
        existingMessage.message = event.message.text;
        existingMessage.category = determineCategory(event.message.text);
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
