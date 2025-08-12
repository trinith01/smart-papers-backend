import express from "express";
import {
  addVideo,
  getAllVideos,
  getVideosByAuthor,
  deleteVideo,
  updateVideo
} from "../controllers/videoControllers.js";

const videoRouter = express.Router();

videoRouter.post("/", addVideo);                     // Add video
videoRouter.get("/", getAllVideos);                  // Get all
videoRouter.get("/author/:authorId", getVideosByAuthor); // By author
videoRouter.delete("/:videoId", deleteVideo);        // Delete
videoRouter.put("/:videoId", updateVideo);           // Update

export default videoRouter;
