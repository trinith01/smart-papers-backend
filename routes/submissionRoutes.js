import {createSubmission} from "../controllers/submissionController.js";
import { getDonePapers  , getStudentSubmissionsWithQuestions} from "../controllers/submissionController.js";
import { getStudentIncorrectSummary } from "../controllers/submmitionsAnalyseControllers.js";

import express from 'express';

const submissionRouter = express.Router();

// POST /submissions
submissionRouter.post('/', createSubmission);
submissionRouter.get('/done/:studentId', getDonePapers);
submissionRouter.get('/questions/:studentId', getStudentSubmissionsWithQuestions);
submissionRouter.get('/incorrectSummery/:studentId', getStudentIncorrectSummary);

export default submissionRouter;