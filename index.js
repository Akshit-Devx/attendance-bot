import express from "express";
import bodyParser from "body-parser";
import connectDB from "./config/database.js";
import verifySlackRequest from "./middlewares/slackAuth.js";
import slackRoutes from "./routes/slackRoutes.js";
import "./config/dotenv.js"; // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.use(bodyParser.json());
app.use(verifySlackRequest);
app.use("/slack", slackRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
