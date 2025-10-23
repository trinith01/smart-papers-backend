import {createSubmission, getSubmissionStatus} from "../controllers/submissionController.js";
import { getDonePapers  , getStudentSubmissionsWithQuestions} from "../controllers/submissionController.js";
import { getStudentIncorrectSummary } from "../controllers/submmitionsAnalyseControllers.js";
import { getStudentPaperScoresWithAverages } from "../controllers/submissionController.js";

import express from 'express';

const submissionRouter = express.Router();

// POST /submissions
submissionRouter.post('/', createSubmission);
submissionRouter.get('/status/:jobId', getSubmissionStatus);
submissionRouter.get('/done/:studentId', getDonePapers);
submissionRouter.get('/questions/:studentId', getStudentSubmissionsWithQuestions);
submissionRouter.get('/incorrectSummery/:studentId', getStudentIncorrectSummary);
submissionRouter.get('/scoresWithAverages/:studentId', getStudentPaperScoresWithAverages);


export default submissionRouter;