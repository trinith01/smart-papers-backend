import { Schema, model } from "mongoose";

const questionResultSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId, ref: "Paper.questions", required: true }, // Reference to the question inside the paper
  selectedAnswer: { type: Number, required: true },            // Index (0-4)
  isCorrect: { type: Boolean, required: true },                // ✅ true or ❌ false
  reviewed: { type: Boolean, default: false },                 // 🚩 whether student has reviewed this question
});

const submissionSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  instituteId: { type: Schema.Types.ObjectId, ref: "Institute", required: true },
  paperId: { type: Schema.Types.ObjectId, ref: "Paper", required: true },
  answers: [questionResultSchema], // 🔍 per-question detailed results
  status: { type: String, enum: ["in-progress", "done"], default: "in-progress" },
  submittedAt: { type: Date },
  score: { type: Number }, // optional: total score
  islandRank: { type: Number, default: null },
  districtRank: { type: Number, default: null },
});

export default model("Submission", submissionSchema);

