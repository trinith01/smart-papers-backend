import Paper from '../models/Paper.js';
import Submission from '../models/Submisstion.js';
import Student from '../models/Student.js';

//getTeacherPapers
//Get all papers authored by teacher
export const getTeacherPapers = async (req, res) => {
  try {
    const teacherId = req.params.userId;

    //const teacherId = "686bf23c950708f20e62b600";
    //Use user ID from query param or header for manual testing
    //const teacherId = req.query.userId || req.headers["x-user-id"];

    if (!teacherId) {
      return res.status(400).json({ message: "Missing user ID" });
    }

    const papers = await Paper.find({ author: teacherId }).select('title subject availability');
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching papers', error });
  }
};

//getPaperOverview
//Get stats: avg, high/low score, etc.
export const getPaperOverview = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { instituteId } = req.query;

    let submissions = await Submission.find({ paperId });
    if (!submissions.length)
      return res.json({ avgScore: 0, max: 0, min: 0, total: 0, difficulty: "Moderate" });

    if (instituteId) {
      const studentIds = submissions.map(s => s.studentId);
      const students = await Student.find({ _id: { $in: studentIds } });

      const allowedStudentIds = students
        .filter(s => s.followedTeachers[0]?.institute === instituteId)
        .map(s => s._id.toString());

      submissions = submissions.filter(sub => allowedStudentIds.includes(sub.studentId.toString()));

      if (!submissions.length)
        return res.json({ avgScore: 0, max: 0, min: 0, total: 0, difficulty: "Moderate" });
    }

    const scores = submissions.map(s => s.score);
    const total = submissions.length;
    const avg = scores.reduce((a, b) => a + b, 0) / total;
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    let difficulty = 'Moderate';
    const percent = (avg / (submissions[0]?.answers?.length || 1)) * 100;
    if (percent < 40) difficulty = 'Hard';
    else if (percent > 70) difficulty = 'Easy';

    res.json({ avgScore: avg, max, min, total, difficulty });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching paper overview', error });
  }
};


//getInstituteWiseStats
//Stats grouped by institute
export const getInstituteWiseStats = async (req, res) => {
  try {
    const { paperId } = req.params;

    const submissions = await Submission.find({ paperId });
    const studentIds = submissions.map(s => s.studentId);

    const students = await Student.find({ _id: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => studentMap[s._id] = s.followedTeachers[0]?.institute);

    const instituteStats = {};

    submissions.forEach(sub => {
      const inst = studentMap[sub.studentId];
      if (!inst) return;

      if (!instituteStats[inst]) instituteStats[inst] = { count: 0, totalScore: 0 };
      instituteStats[inst].count += 1;
      instituteStats[inst].totalScore += sub.score;
    });

    const result = Object.entries(instituteStats).map(([instituteId, stat]) => ({
      instituteId,
      attempts: stat.count,
      avgScore: (stat.totalScore / stat.count).toFixed(2)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching institute stats', error });
  }
};

//getCategoryAccuracyStats
//Accuracy per question category
export const getCategoryAccuracyStats = async (req, res) => {
  try {
    const { paperId } = req.params;
    const instituteFilter = req.query.instituteId || null;

    const paper = await Paper.findById(paperId);
    const questionCategoryMap = {};
    paper.questions.forEach(q => {
      questionCategoryMap[q._id.toString()] = q.category;
    });

    const submissions = await Submission.find({ paperId });
    const studentIds = submissions.map(s => s.studentId);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentInstituteMap = {};
    students.forEach(s => {
      studentInstituteMap[s._id.toString()] = s.followedTeachers[0]?.institute;
    });

    const stats = {};

    submissions.forEach(sub => {
      const studentInstitute = studentInstituteMap[sub.studentId?.toString()];
      if (instituteFilter && studentInstitute !== instituteFilter) return;

      sub.answers.forEach(ans => {
        const qId = ans.questionId?.toString();
        const cat = questionCategoryMap[qId];
        if (!cat) return;

        if (!stats[cat]) stats[cat] = { correct: 0, total: 0 };
        stats[cat].total += 1;
        if (ans.isCorrect) stats[cat].correct += 1;
      });
    });

    const result = Object.entries(stats).map(([category, val]) => ({
      category,
      accuracy: ((val.correct / val.total) * 100).toFixed(2)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category accuracy', error });
  }
};


//getSubmissionTimelineStats
//Count of submissions over time
export const getSubmissionTimelineStats = async (req, res) => {
  try {
    const { paperId } = req.params;
    const instituteFilter = req.query.instituteId || null;

    const submissions = await Submission.find({ paperId }).sort({ submittedAt: 1 });

    const studentIds = submissions.map(s => s.studentId);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentInstituteMap = {};
    students.forEach(s => {
      studentInstituteMap[s._id.toString()] = s.followedTeachers[0]?.institute;
    });

    const timeline = {};

    submissions.forEach(sub => {
      const studentInstitute = studentInstituteMap[sub.studentId?.toString()];
      if (instituteFilter && studentInstitute !== instituteFilter) return;

      const date = new Date(sub.submittedAt).toISOString().split('T')[0];
      if (!timeline[date]) timeline[date] = 0;
      timeline[date]++;
    });

    const result = Object.entries(timeline).map(([date, count]) => ({ date, count }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission timeline', error });
  }
};



//getQuestionWiseStats
// Logic:
// Get the paper → fetch its questions
// Get all submissions for that paper
// For each answer, map it to its question
// Tally totals & corrects per question
export const getQuestionWiseStats = async (req, res) => {
  try {
    const { paperId } = req.params;
    const instituteFilter = req.query.instituteId || null;

    const paper = await Paper.findById(paperId);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    const questionStats = {};
    paper.questions.forEach((q, index) => {
      questionStats[q._id.toString()] = {
        index: index + 1,
        category: q.category,
        correct: 0,
        total: 0,
      };
    });

    const submissions = await Submission.find({ paperId });

    const studentIds = submissions.map(s => s.studentId);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentInstituteMap = {};
    students.forEach(s => {
      studentInstituteMap[s._id.toString()] = s.followedTeachers[0]?.institute;
    });

    submissions.forEach(sub => {
      const studentInstitute = studentInstituteMap[sub.studentId?.toString()];
      if (instituteFilter && studentInstitute !== instituteFilter) return;

      sub.answers.forEach(ans => {
        const qid = ans.questionId?.toString();
        if (!questionStats[qid]) return;

        questionStats[qid].total += 1;
        if (ans.isCorrect) questionStats[qid].correct += 1;
      });
    });

    const result = Object.entries(questionStats).map(([id, data]) => ({
      questionId: id,
      index: data.index, // original order in paper
      category: data.category,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? ((data.correct / data.total) * 100).toFixed(2) : "0.00"
    }));

    // Sort by accuracy ascending (weakest first)
    result.sort((a, b) => parseFloat(a.accuracy) - parseFloat(b.accuracy));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to get question-wise stats", error: err });
  }
};


//getLastNPaperCategoryAnalysis

// Goal: Last N Papers → Category-Wise Weakness Analysis
// For example:
// If you choose last 10 papers → fetch their submissions → compute category-wise accuracy across all those → highlight weak categories.


export const getLastNPaperCategoryAnalysis = async (req, res) => {
  try {
    // Get teacherId from route params
    const { teacherId } = req.params;
    if (!teacherId) {
      return res.status(400).json({ message: "Missing teacherId parameter" });
    }

    const limit = parseInt(req.query.limit) || 10;

    // Fetch papers authored by the given teacherId
    const papers = await Paper.find({ author: teacherId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const paperIds = papers.map((p) => p._id);
    const questionCategoryMap = {};

    // Map questionId → category
    papers.forEach((paper) => {
      paper.questions.forEach((q) => {
        questionCategoryMap[q._id.toString()] = q.category;
      });
    });

    const submissions = await Submission.find({ paperId: { $in: paperIds } });
    const stats = {};

    // Analyze answers by category
    submissions.forEach((sub) => {
      sub.answers.forEach((ans) => {
        const qId = ans.questionId?.toString();
        const cat = questionCategoryMap[qId];
        if (!cat) return;

        if (!stats[cat]) stats[cat] = { correct: 0, total: 0 };

        stats[cat].total += 1;
        if (ans.isCorrect) stats[cat].correct += 1;
      });
    });

    // Final result, sorted by weakest categories
    const result = Object.entries(stats)
      .map(([category, val]) => ({
        category,
        total: val.total,
        correct: val.correct,
        accuracy:
          val.total > 0
            ? ((val.correct / val.total) * 100).toFixed(2)
            : "0.00",
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    res.json(result);
  } catch (err) {
    console.error("🔥 Analysis Error:", err);
    res.status(500).json({
      message: "Error getting last N paper category analysis",
      error: err.message || err,
    });
  }
};