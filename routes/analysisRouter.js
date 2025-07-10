import express from "express";
import {
  getTeacherPapers,
  getPaperOverview,
  getInstituteWiseStats,
  getCategoryAccuracyStats,
  getSubmissionTimelineStats,
  getQuestionWiseStats,
  getLastNPaperCategoryAnalysis 
} from "../controllers/analysisController.js";


const analysisRouter = express.Router();

// ✅TestPasses, Get all papers created by the logged-in teacher
analysisRouter.get("/papers/:userId", getTeacherPapers);

// ✅TestPasses, Get overall stats for a specific paper
analysisRouter.get("/paper/:paperId/overview", getPaperOverview);

// ✅TestPasses, Get institute-wise performance for a paper
analysisRouter.get("/paper/:paperId/institute", getInstituteWiseStats);

// ✅TestPasses, Get category-wise accuracy for a paper
analysisRouter.get("/paper/:paperId/category-accuracy", getCategoryAccuracyStats);

// ✅TestPasses, Get submission timeline (date-wise count)
analysisRouter.get("/paper/:paperId/timeline", getSubmissionTimelineStats);

// ✅TestPasses, Get question wise analyse per a paper
analysisRouter.get("/paper/:paperId/question-wise", getQuestionWiseStats);

// ✅TestPasses, Get categorywise analyze for past N papers
analysisRouter.get("/paper/recent-category-analysis/:teacherId", getLastNPaperCategoryAnalysis);
export default analysisRouter;