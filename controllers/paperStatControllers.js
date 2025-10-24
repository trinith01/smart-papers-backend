// controllers/paperStatsController.mjs
import mongoose from "mongoose";
import Paper from "../models/Paper.js";

import paperStats from "../models/paperStats.js";
import Submisstion from "../models/Submisstion.js";

/**
 * POST /paper-stats/:paperId
 * PUT /paper-stats/:paperId/rebuild 
 * 
 * Build or rebuild stats for a paperId.
 * 
 * If a paperStats document already exists for the given paperId:
 * - All attributes (QuestionResults, instituteStats) will be completely replaced with new values
 * - The updatedAt timestamp will be automatically updated
 * 
 * Query Parameters:
 * - force=true: Force rebuild even if stats already exist (same behavior as default, but logged differently)
 * 
 * Behavior:
 * - Uses findOneAndUpdate with upsert:true to handle both create and update scenarios
 * - Completely replaces arrays (QuestionResults, instituteStats) with newly calculated values
 * - Handles duplicate key errors gracefully with retry logic
 * - Returns summary of what was processed and the action taken
 */
export const buildPaperStats = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { force } = req.query; // Check for force rebuild parameter
    
    if (!mongoose.isValidObjectId(paperId)) {
      return res.status(400).json({ error: "Invalid paperId" });
    }

    const paper = await Paper.findById(paperId).lean();
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    // -------- Per-question incorrect counts --------
    const perQuestion = await Submisstion.aggregate([
      {
        $match: {
          paperId: new mongoose.Types.ObjectId(paperId),
          status: "done",
        },
      },
      { $unwind: "$answers" },
      { $match: { "answers.isCorrect": false } },
      {
        $group: {
          _id: "$answers.questionId",
          totalIncorrect: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          questionId: "$_id",
          totalIncorrect: 1,
        },
      },
    ]);

    // Ensure every question appears (even if 0 incorrect)
    const incorrectMap = new Map(
      perQuestion.map((q) => [String(q.questionId), q.totalIncorrect])
    );
    const questionResults = paper.questions.map((q) => ({
      questionId: q._id,
      totalIncorrect: incorrectMap.get(String(q._id)) || 0,
    }));

    // -------- Per-institute stats (avg/max/min/total & top students) --------
    // effectiveScore := use stored score OR compute (# of correct answers) if score missing
    const perInstitute = await Submisstion.aggregate([
      {
        $match: {
          paperId: new mongoose.Types.ObjectId(paperId),
          status: "done",
        },
      },
      {
        $addFields: {
          effectiveScore: {
            $ifNull: [
              "$score",
              {
                $size: {
                  $filter: {
                    input: "$answers",
                    as: "a",
                    cond: { $eq: ["$$a.isCorrect", true] },
                  },
                },
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$instituteId",
          totalStudents: { $sum: 1 },
          avg: { $avg: "$effectiveScore" },
          max: { $max: "$effectiveScore" },
          min: { $min: "$effectiveScore" },
        },
      },
      {
        $project: {
          _id: 0,
          instituteId: "$_id",
          averageMarks: { $round: ["$avg", 2] },
          totalStudents: 1,
          maxMarks: "$max",
          minMarks: "$min",
        },
      },
    ]);

    // For each institute, collect top 5 submissions by effectiveScore
    // (Do a quick per-institute query)
    const instituteStats = [];
    for (const inst of perInstitute) {
      const topSubs = await Submisstion.aggregate([
        {
          $match: {
            paperId: new mongoose.Types.ObjectId(paperId),
            status: "done",
            instituteId: inst.instituteId,
          },
        },
        {
          $addFields: {
            effectiveScore: {
              $ifNull: [
                "$score",
                {
                  $size: {
                    $filter: {
                      input: "$answers",
                      as: "a",
                      cond: { $eq: ["$$a.isCorrect", true] },
                    },
                  },
                },
              ],
            },
          },
        },
        { $sort: { effectiveScore: -1, submittedAt: 1, _id: 1 } },
        { $limit: 5 },
        { $project: { _id: 1 } },
      ]);

      instituteStats.push({
        instituteId: inst.instituteId,
        averageMarks: inst.averageMarks,
        totalStudents: inst.totalStudents,
        maxMarks: inst.maxMarks,
        minMarks: inst.minMarks,
        topStudents: topSubs.map((s) => s._id),
      });
    }

    // -------- Check if PaperStats already exists --------
    const existingStats = await paperStats.findOne({ paperId }).lean();
    
    if (existingStats) {
      if (force === 'true') {
        console.log(`[buildPaperStats] Force rebuilding existing stats for paperId: ${paperId}`);
      } else {
        console.log(`[buildPaperStats] Updating existing stats for paperId: ${paperId}`);
      }
    } else {
      console.log(`[buildPaperStats] Creating new stats for paperId: ${paperId}`);
    }
    
    // Log some basic info about what we're about to process
    console.log(`[buildPaperStats] Paper has ${paper.questions?.length || 0} questions`);
    
    // Get total submission count for this paper
    const totalSubmissions = await Submisstion.countDocuments({
      paperId: new mongoose.Types.ObjectId(paperId),
      status: "done",
    });
    console.log(`[buildPaperStats] Found ${totalSubmissions} completed submissions to analyze`);
    
    if (totalSubmissions === 0) {
      console.log(`[buildPaperStats] No completed submissions found for paperId: ${paperId}`);
      // Still create stats but with empty results
    }

    // -------- Upsert PaperStats - Replace all attributes with new values --------
    const updated = await paperStats
      .findOneAndUpdate(
        { paperId },
        {
          $set: {
            paperId,
            QuestionResults: questionResults, // <-- array [{questionId, totalIncorrect}]
            instituteStats, // <-- array per institute
            updatedAt: new Date() // Add timestamp for when stats were last updated
          }
        },
        { 
          upsert: true, 
          new: true, 
          setDefaultsOnInsert: true,
          runValidators: true // Ensure schema validation runs
        }
      )
      .populate({
        path: "instituteStats.topStudents",
        select: "studentId score submittedAt",
        model: "Submission",
      })
      .lean();

    console.log(`[buildPaperStats] Successfully ${existingStats ? 'updated' : 'created'} stats for paperId: ${paperId}`);
    
    const actionType = existingStats 
      ? (force === 'true' ? 'force rebuilt' : 'updated') 
      : 'created';
    
    return res.status(200).json({ 
      ok: true, 
      data: updated,
      message: `Paper stats ${actionType} successfully`,
      summary: {
        paperId: paperId,
        questionsAnalyzed: questionResults.length,
        institutesFound: instituteStats.length,
        totalSubmissions: totalSubmissions,
        actionTaken: actionType,
        wasExisting: !!existingStats
      }
    });
  } catch (err) {
    console.error("[buildPaperStats] error:", err);
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      console.error("[buildPaperStats] Duplicate key error, attempting retry with findOneAndUpdate");
      try {
        // Retry with a direct update
        const retryUpdate = await paperStats.findOneAndUpdate(
          { paperId },
          {
            $set: {
              QuestionResults: questionResults,
              instituteStats,
            }
          },
          { new: true, runValidators: true }
        ).populate({
          path: "instituteStats.topStudents",
          select: "studentId score submittedAt",
          model: "Submission",
        }).lean();
        
        return res.status(200).json({ 
          ok: true, 
          data: retryUpdate,
          message: 'Paper stats updated successfully (after retry)'
        });
      } catch (retryErr) {
        console.error("[buildPaperStats] Retry failed:", retryErr);
        return res.status(500).json({ 
          error: "Failed to update paper stats", 
          details: String(retryErr) 
        });
      }
    }
    
    return res
      .status(500)
      .json({ error: "Internal error", details: String(err) });
  }
};

/**
 * GET /paper-stats/:paperId
 * Fetch stats for a paperId.
 */
export const getPaperStats = async (req, res) => {
  try {
    const { paperId } = req.params;
    if (!mongoose.isValidObjectId(paperId)) {
      return res.status(400).json({ error: "Invalid paperId" });
    }

    // Paper (for question indexing)
    const paper = await Paper.findById(paperId).lean();
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const qIndex = new Map(
      (paper.questions || []).map((q, i) => [
        String(q._id),
        {
          questionId: q._id,
          questionIndex: i,
          questionImage: q.questionImage,
          answerReviewImage: q.answerReviewImage,
          correctAnswer: q.correctAnswer,
          category: q.category,
          subcategory: q.subcategory ?? null,
        },
      ])
    );

    // const qIndex = new Map(
    //   (paper.questions || []).map((q, i) => [String(q._id), i])
    // );

    // Stats (for QuestionResults)
    const stats = await paperStats.findOne({ paperId }).lean();

    // If stats don't exist, check if paper has ended and return availability info
    if (!stats) {
      // Get the latest end time from all availability entries
      const latestEndTime = paper.availability && paper.availability.length > 0 
        ? Math.max(...paper.availability.map(avail => new Date(avail.endTime).getTime()))
        : null;

      if (latestEndTime) {
        const endTime = new Date(latestEndTime);
        const availableTime = new Date(latestEndTime + 300000); // Add 5 minutes (300000 ms)
        
        return res.status(200).json({
          ok: false,
          statsNotReady: true,
          data: {
            paper: {
              _id: paper._id,
              title: paper.title,
              subject: paper.subject,
              questionsCount: paper.questions?.length || 0,
            },
            paperEndTime: endTime,
            statsAvailableAt: availableTime,
            message: "The Related Rank Sheet and Leaderboard will be shown five minutes after the end time of the paper"
          }
        });
      }
      
      // If no availability info, return generic message
      return res.status(200).json({
        ok: false,
        statsNotReady: true,
        data: {
          paper: {
            _id: paper._id,
            title: paper.title,
            subject: paper.subject,
            questionsCount: paper.questions?.length || 0,
          },
          message: "Paper statistics are being processed. Please check back later."
        }
      });
    }

    const questionResultsSorted = (stats?.QuestionResults || [])
      .map((qr) => ({
        questionId: qr.questionId,
        totalIncorrect: qr.totalIncorrect,
        questionIndex: qIndex.get(String(qr.questionId)) ?? null,
      }))
      .sort((a, b) => b.totalIncorrect - a.totalIncorrect);

    // Leaderboards (overall + per-institute)
    const rows = await Submisstion.aggregate([
      {
        $match: {
          paperId: new mongoose.Types.ObjectId(paperId),
          status: "done",
        },
      },
      {
        $addFields: {
          effectiveScore: {
            $ifNull: [
              "$score",
              {
                $size: {
                  $filter: {
                    input: "$answers",
                    as: "a",
                    cond: { $eq: ["$$a.isCorrect", true] },
                  },
                },
              },
            ],
          },
        },
      },
      // Join Student
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      // Join Institute
      {
        $lookup: {
          from: "institutes",
          localField: "instituteId",
          foreignField: "_id",
          as: "institute",
        },
      },
      { $unwind: "$institute" },

      // ---- RANKS: use ONE sort field only (required by $rank/$denseRank) ----
      {
        $setWindowFields: {
          sortBy: { effectiveScore: -1 }, // single field
          output: { overallRank: { $rank: {} } }, // or $denseRank
        },
      },
      {
        $setWindowFields: {
          partitionBy: "$instituteId",
          sortBy: { effectiveScore: -1 }, // single field
          output: { instituteRank: { $rank: {} } }, // or $denseRank
        },
      },

      // Project what we need
      {
        $project: {
          _id: 0,
          studentId: "$student._id",
          studentName: "$student.name",
          instituteId: "$institute._id",
          instituteName: "$institute.name",
          score: "$effectiveScore",
          submittedAt: 1,
          overallRank: 1,
          instituteRank: 1,
        },
      },

      // Pretty output order (this DOES NOT affect rank, only display)
      { $sort: { score: -1, submittedAt: 1, studentName: 1 } },
    ]);

    // Split into overall + per-institute leaderboards
    const overallLeaderboard = rows;
    const instMap = new Map();
    for (const r of rows) {
      const key = String(r.instituteId);
      if (!instMap.has(key)) {
        instMap.set(key, {
          instituteId: r.instituteId,
          instituteName: r.instituteName,
          leaderboard: [],
        });
      }
      instMap.get(key).leaderboard.push({
        instituteRank: r.instituteRank,
        overallRank: r.overallRank,
        studentId: r.studentId,
        studentName: r.studentName,
        score: r.score,
        submittedAt: r.submittedAt,
      });
    }
    const instituteLeaderboards = Array.from(instMap.values()).map((x) => {
      x.leaderboard.sort((a, b) => a.instituteRank - b.instituteRank);
      return x;
    });

    return res.status(200).json({
      ok: true,
      data: {
        paper: {
          _id: paper._id,
          title: paper.title,
          subject: paper.subject,
          questionsCount: paper.questions?.length || 0,
        },
        questionResultsSorted, // sorted by totalIncorrect desc
        overallLeaderboard, // uses student.name and institute.name
        instituteLeaderboards, // ranks per institute
      },
    });
  } catch (err) {
    console.error("[getPaperStatsWithLeaderboards] error:", err);
    return res
      .status(500)
      .json({ error: "Internal error", details: String(err) });
  }
};
