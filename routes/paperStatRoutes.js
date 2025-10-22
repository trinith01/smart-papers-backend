import { buildPaperStats,getPaperStats } from "../controllers/paperStatControllers.js"
import express from "express";

const paperStatRouter = express.Router();

paperStatRouter.post("/:paperId", buildPaperStats);
paperStatRouter.get("/:paperId", getPaperStats);


export default paperStatRouter;