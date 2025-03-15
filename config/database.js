import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);

    // Provide more specific guidance based on error type
    if (err.name === "MongooseServerSelectionError") {
      console.error(
        "⚠️  IP Whitelist Issue: Make sure your current IP address is added to your MongoDB Atlas cluster's IP whitelist"
      );
      console.error("👉 Steps to fix:");
      console.error("   1. Log in to MongoDB Atlas");
      console.error("   2. Go to Network Access");
      console.error("   3. Click 'Add IP Address' and add your current IP");
      console.error(
        "   4. Alternative: Add '0.0.0.0/0' to allow access from anywhere (not recommended for production)"
      );
    }

    process.exit(1);
  }
};

export default connectDB;
