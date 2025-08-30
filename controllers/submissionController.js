import Submission from '../models/Submisstion.js';
import Paper from '../models/Paper.js';

const API_BASE_URL = process.env.API_BASE_URL;

// Returns [{ paperId, averageMarks, studentMarks }] for all papers attempted by the student
export const getStudentPaperScoresWithAverages = async (req, res) => {
  try {
    const { studentId } = req.params; // expects { studentId }

    // Find all submissions by the student
    const studentSubmissions = await Submission.find({ studentId });

    // Get all unique paperIds attempted by the student
    const paperIds = [...new Set(studentSubmissions.map(sub => sub.paperId.toString()))];

    // For each paper, get all submissions and calculate average percentage
    const results = await Promise.all(paperIds.map(async (paperId) => {
      // All submissions for this paper
      const allSubs = await Submission.find({ paperId });
      // Get paper details
      const paper = await Paper.findById(paperId);
      const totalQuestions = paper && paper.questions ? paper.questions.length : 1;
      const paperTitle = paper ? paper.title : null;
      const paperDate = paper ? paper.createdAt : null;

      // Calculate each student's percentage for this paper
      const studentPercentages = allSubs.map(s => {
        const score = s.score || 0;
        return (score / totalQuestions) * 100;
      });
      // Average percentage for all students who wrote this paper
      const averageMarksPercentage = studentPercentages.length
        ? (studentPercentages.reduce((a, b) => a + b, 0) / studentPercentages.length).toFixed(2)
        : 0;

      // Student's marks for this paper
      const studentSub = studentSubmissions.find(s => s.paperId.toString() === paperId);
      const studentMarks = studentSub ? (studentSub.score || 0) : 0;
      const studentMarksPercentage = ((studentMarks / totalQuestions) * 100).toFixed(2);

      return {
        paperId,
        paperTitle,
        paperDate,
        averageMarks:averageMarksPercentage,
        studentMarks:studentMarksPercentage
      };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



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
    const submission = new Submission({
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
    const doneSubmissions = await Submission.find(query, "paperId");
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
    const submissions = await Submission.find({ studentId }).sort({ paperId: -1 });
    const result = [];
    for (const submission of submissions) {
      // Fetch the related paper
      const paper = await Paper.findById(submission.paperId);
      const totalQuestions = paper && paper.questions ? paper.questions.length : 1;
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
      // Calculate score percentage
      const score = submission.score || 0;
      const scorePercentage = ((score / totalQuestions) * 100).toFixed(2);

      // Calculate rank for this submission among all submissions for the same paper
      const allSubsForPaper = await Submission.find({ paperId: submission.paperId });
      // Sort scores descending
      const sortedScores = allSubsForPaper
        .map(s => s.score || 0)
        .sort((a, b) => b - a);
      // Find rank (1-based)
      const rank = sortedScores.indexOf(score) + 1;

      result.push({
        ...submission.toObject(),
        answers: answersWithQuestions,
        paperTitle: paper ? paper.title : null,
        category: paper ? paper.category : null,
        score:scorePercentage,
        totalQuestions,
        rank
      });
    }
    res.status(200).json({ submissions: result });
  } catch (error) {
    console.error("Error fetching student submissions with questions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
