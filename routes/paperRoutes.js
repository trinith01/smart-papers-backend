import { createPaper , getAllPapers  , getAvailablePapers , getPapersByAuthor} from "../controllers/paperControllers.js";
import express from 'express';
const paperRouter = express.Router();

// POST /papers
paperRouter.post('/', createPaper);
paperRouter.get('/', getAllPapers);
paperRouter.get('/available', getAvailablePapers);
paperRouter.get('/author/:authorId', getPapersByAuthor);


export default paperRouter;