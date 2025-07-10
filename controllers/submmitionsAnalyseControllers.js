import Submisstion from "../models/Submisstion.js";
import Paper from "../models/Paper.js";

export const getStudentIncorrectSummary = async (req, res) => {
  const { studentId } = req.params;

  try {
    const submissions = await Submisstion.find({ studentId }).sort({ paperId: -1 });

    let totalIncorrect = 0;
    let totalReviewed = 0;
    let totalPendingReview = 0;

    const categorizedBySubmission = []; // final array

    for (const submission of submissions) {
      const paper = await Paper.findById(submission.paperId);
      if (!paper) continue;

      const categoryMap = {}; // for this submission

      for (const ans of submission.answers) {
        if (ans.isCorrect) continue;

        totalIncorrect++;
        if (ans.reviewed) totalReviewed++;
        else totalPendingReview++;

        const question = paper.questions.find(
          (q) => q._id.toString() === ans.questionId.toString()
        );

        if (!question) continue;

        const category = question.category || "Uncategorized";

        const entry = {
          paperTitle: paper.title,
          question: {
            _id: question._id,
            questionImage: question.questionImage,
            answerReviewImage: question.answerReviewImage,
            correctAnswer: question.correctAnswer,
          },
          selectedAnswer: ans.selectedAnswer,
          reviewed: ans.reviewed,
        };

        if (!categoryMap[category]) {
          categoryMap[category] = [];
        }

        categoryMap[category].push(entry);
      }

      if (Object.keys(categoryMap).length > 0) {
        categorizedBySubmission.push({
          submissionId: submission._id,
          paperTitle: paper.title,
          categories: categoryMap,
        });
      }
    }

    res.status(200).json({
      totalIncorrect,
      reviewed: totalReviewed,
      pendingReview: totalPendingReview,
      submissions: categorizedBySubmission,
    });
  } catch (error) {
    console.error("Error in student incorrect summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

