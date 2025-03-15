import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  channelId: { type: String, required: true },
  message: { type: String, required: true },
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
      "MULTI_DAY_LEAVE",
      "OTHER",
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  messageId: { type: String, required: true, unique: true },
  // New fields for date ranges
  leaveStartDate: { type: Date },
  leaveEndDate: { type: Date },
});

const Message = mongoose.model("Message-1", messageSchema);
export default Message;
