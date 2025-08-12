import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionImage: { type: String, required: true },
  answerImage: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  unitName: { type: String, required: true },
  subunitName: { type: String, required: true },
}, { _id: true });

const authorQuestionSetSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  questions: [questionSchema],
}, { timestamps: true });

const QuestionBank=  mongoose.model("AuthorQuestionSet", authorQuestionSetSchema);

export default QuestionBank;
