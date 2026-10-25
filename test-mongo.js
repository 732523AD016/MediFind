import "dotenv/config";
import mongoose from "mongoose";

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });
  console.log("SUCCESS: MediFind connected to MongoDB!");
  console.log("Database:", mongoose.connection.name);
  await mongoose.disconnect();
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exitCode = 1;
}
