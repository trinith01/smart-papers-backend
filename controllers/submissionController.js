import Submisstion from "../models/Submisstion.js";
import Paper from "../models/Paper.js";

const API_BASE_URL = process.env.API_BASE_URL;

export const createSubmission = async (req, res) => {
  try {
    const { studentId, paperId, answers } = req.body;
    console.log("reqesut submition from frontend", req.body);

    // Validate inputs
    if (!studentId || !paperId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Missing required data." });
    }

    // Get the quiz (paper) with questions
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Quiz not found." });
    }
    console.log("paperf based on provided id", paper);
    // res.status(200).json({message:"submission created successfully", paper:paper})

    // Analyze answers and set reviewed: true for correct, false for incorrect
    const questionResults = [];
    let score = 0;
    for (let i = 0; i < paper.questions.length; i++) {
      const question = paper.questions[i];
      const selectedAnswer = answers[i]?.answer;
      const isCorrect = selectedAnswer === question.correctAnswer;
      if (isCorrect) score++;
      questionResults.push({
        questionId: question._id,
        selectedAnswer,
        isCorrect,
        reviewed: isCorrect, // reviewed true if correct, false if incorrect
      });
    }
    // Create submission
    const submission = new Submisstion({
      studentId,
      paperId,
      answers: questionResults,
      submittedAt: new Date(),
      status: "done",
      score,
    });
    await submission.save();
    res.status(201).json({
      message: "Submission successful",
      submissionId: submission._id,
      score,
      total: paper.questions.length,
      correctAnswers: score,
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDonePapers = async (req, res) => {
  try {
    const { studentId } = req.params;
    const query = { status: "done" };
    if (studentId) {
      query.studentId = studentId;
    }
    // Find all submissions with status 'done' (and studentId if provided)
    const doneSubmissions = await Submisstion.find(query, "paperId");
    // Extract paperIds
    const paperIds = doneSubmissions.map((sub) => sub.paperId);
    res.status(200).json({ paperIds });
  } catch (err) {
    console.error("Error fetching done papers:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getStudentSubmissionsWithQuestions = async (req, res) => {
  try {
    const { studentId } = req.params;
    // Find all submissions for the student, sorted by paperId descending (highest first)
    const submissions = await Submisstion.find({ studentId }).sort({ paperId: -1 });
    const result = [];
    for (const submission of submissions) {
      // Fetch the related paper
      const paper = await Paper.findById(submission.paperId);
      // Map answers to include the full question object
      const answersWithQuestions = submission.answers.map((ans) => {
        const question = paper?.questions?.find(
          (q) => q._id.toString() === ans.questionId.toString()
        );
        if (question) {
          question.questionImage = question.questionImage ? `${API_BASE_URL}/image?id=${question.questionImage}` : null;
        }
        return {
          ...ans.toObject(),
          question: question ? question.toObject() : null,
        };
      });
      result.push({
        ...submission.toObject(),
        answers: answersWithQuestions,
        paperTitle: paper ? paper.title : null,
        category: paper ? paper.category : null,
      });
    }
    res.status(200).json({ submissions: result });
  } catch (error) {
    console.error("Error fetching student submissions with questions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
