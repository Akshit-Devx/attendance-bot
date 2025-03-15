import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/database.js";
import slackRoutes from "./routes/slackRoutes.js";
import verifySlackConfig from "./utils/verifySlackConfig.js";

// Load environment variables - do this first
dotenv.config();

// Initialize express
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/slack", slackRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Attendance Bot API is running!");
});

const PORT = process.env.PORT || 3000;

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Verify Slack configuration (don't stop if it fails)
    await verifySlackConfig();

    // Display configuration info
    console.log("📝 Bot Configuration:");
    console.log(`• SLACK_BOT_ID: ${process.env.SLACK_BOT_ID}`);
    console.log(`• Using OpenAI: ${process.env.OPENAI_API_KEY ? "Yes" : "No"}`);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
