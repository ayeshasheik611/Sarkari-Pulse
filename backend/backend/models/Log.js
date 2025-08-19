import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Log", logSchema);
