import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher", // Change this to the correct model name if needed
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  videoLink: {
    type: String,
    required: true,
  },
  unitName: {
    type: String,
    required: true,
  },
  private: {
    type: Boolean,
    default: false,
  },
  thumbnail: {
    type: String,
    required: true,
  },
  videoId: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const Video = mongoose.model("Video", videoSchema);
export default Video;
