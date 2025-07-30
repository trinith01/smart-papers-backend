import Video from "../models/video.js";

// 1. Add a new video
export const addVideo = async (req, res) => {
  try {
    const { author, name, videoLink, unitName, private: isPrivate, thumbnail, videoId } = req.body;

    const missingFields = [];
    if (!author) missingFields.push("author");
    if (!name) missingFields.push("name");
    if (!videoLink) missingFields.push("videoLink");
    if (!unitName) missingFields.push("unitName");
    if (!thumbnail) missingFields.push("thumbnail");
    if (!videoId) missingFields.push("videoId");

    if (missingFields.length > 0) {
      console.log("Missing fields:", missingFields.join(", "));
      return res.status(400).json({
        message: "Missing required fields",
        missingFields,
      });
    }

    const newVideo = new Video({
      author,
      name,
      videoLink,
      unitName,
      private: isPrivate,
      thumbnail,
      videoId,
    });
    console.log("New video saved succesfully")

    const savedVideo = await newVideo.save();
    res.status(201).json({ message: "Video added successfully", video: savedVideo   , success: true });
  } catch (err) {
    res.status(500).json({ message: "Error adding video", error: err.message });
  }
};


// 2. Get all videos
export const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().populate("author", "name email"); // populate with teacher name/email if needed
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ message: "Error fetching videos", error: err.message });
  }
};

// 3. Get videos by author
export const getVideosByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params;
    const videos = await Video.find({ author: authorId });
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ message: "Error fetching videos by author", error: err.message });
  }
};

// 4. Delete a video by ID
export const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const deleted = await Video.findByIdAndDelete(videoId);

    if (!deleted) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting video", error: err.message });
  }
};

// 5. (Optional) Update a video
export const updateVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const updates = req.body;

    const updatedVideo = await Video.findByIdAndUpdate(videoId, updates, { new: true });

    if (!updatedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.status(200).json(updatedVideo);
  } catch (err) {
    res.status(500).json({ message: "Error updating video", error: err.message });
  }
};
