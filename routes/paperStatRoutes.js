import { buildPaperStats, getPaperStats } from "../controllers/paperStatControllers.js"
import express from "express";

const paperStatRouter = express.Router();

// Build/rebuild paper stats for a specific paper
// Query params: ?force=true to force rebuild even if stats exist
paperStatRouter.post("/:paperId", buildPaperStats);

// Force rebuild paper stats (alternative endpoint)
paperStatRouter.put("/:paperId/rebuild", buildPaperStats);

// Get paper stats for a specific paper
paperStatRouter.get("/:paperId", getPaperStats);

export default paperStatRouter;