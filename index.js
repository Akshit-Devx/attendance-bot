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
  message: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "WFH",
      "FULL DAY LEAVE",
      "HALF DAY LEAVE",
      "LATE TO OFFICE",
      "LEAVING EARLY",
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// Middleware to verify Slack requests
app.use(bodyParser.json());

app.use((req, res, next) => {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const body = JSON.stringify(req.body);
  console.log("body>>", body);

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest("hex")}`;

  if (signature !== computedSignature) {
    return res.status(400).send("Invalid request signature");
  }
  next();
});

// Slack Event Endpoint
app.post("/slack/events", async (req, res) => {
  console.log("request received", req.body);
  const { type, event } = req.body;

  // Slack URL verification challenge
  if (type === "url_verification") {
    return res.status(200).send({ challenge: req.body.challenge });
  }

  // Process messages in Slack channels
  if (event && event.type === "message" && !event.bot_id) {
    console.log(`New message from ${event.user}: ${event.text}`);

    const text = event.text.toLowerCase();

    const newMessage = new Message({
      userId: event.user,
      channelId: event.channel,
      text: text,
      timestamp: event.ts,
    });

    await newMessage.save();
    console.log("Message saved to MongoDB:", newMessage);
  }

  res.status(200).send("OK");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
