import  express from 'express';
import {
  addQuestion,
  getAllSets,
  getSetByAuthor,
  updateQuestion,
  deleteQuestion,
  AddQuestionBank
} from "../controllers/QuestionBankController.js";

const questionBankRouter = express.Router();

questionBankRouter.post("/:questionBankId", addQuestion);
questionBankRouter.post("/", AddQuestionBank);
questionBankRouter.get("/", getAllSets);
questionBankRouter.get("/author/:authorId", getSetByAuthor);
questionBankRouter.put("/:authorId/question/:questionId", updateQuestion);
questionBankRouter.delete("/:authorId/question/:questionId", deleteQuestion);

export default questionBankRouter;
