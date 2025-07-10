import express from "express";
import { getStudyPlan } from "../controllers/llm.js";

const llmRouter = express.Router();

llmRouter.post("/getStudyPlan", getStudyPlan);

export default llmRouter;