import Message from "../models/messageModel.js";
import { analyzeCategory, extractDateRange } from "../services/openai.js";
import { sendThreadMessage } from "../services/slack/index.js";

/**
 * Process a new message and save it to the database
 */
export const processNewMessage = async (event, userName) => {
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
  await sendConfirmationInThread(event, newMessage, detectedCategory);

  return newMessage;
};

/**
 * Process a message edit
 */
export const processMessageEdit = async (event) => {
  console.log(`✏️ Message Edited: ${event.message.text}`);

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
    return existingMessage;
  } else {
    console.log("⚠️ Edited message not found in database");
    return null;
  }
};

/**
 * Send confirmation message in thread
 */
const sendConfirmationInThread = async (event, message, category) => {
  if (category === "OTHER") return;

  const categoryMessages = {
    WFH: "I've recorded that you're working from home today.",
    FULL_DAY_LEAVE: "I've recorded your full day leave.",
    HALF_DAY_LEAVE: "I've recorded your half-day leave.",
    LATE_TO_OFFICE: "I've noted that you'll be arriving late.",
    LEAVING_EARLY: "I've noted that you'll be leaving early today.",
    OOO: "I've marked you as out of office.",
    MULTI_DAY_LEAVE:
      message.leaveStartDate && message.leaveEndDate
        ? `I've recorded your leave from ${message.leaveStartDate.toLocaleDateString()} to ${message.leaveEndDate.toLocaleDateString()}.`
        : "I've recorded your multi-day leave.",
  };

  try {
    await sendThreadMessage(
      event.channel,
      event.ts,
      categoryMessages[category] || "I've recorded your message."
    );
  } catch (error) {
    console.error("❌ Failed to send thread message:", error.message);
  }
};
