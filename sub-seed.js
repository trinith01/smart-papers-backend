#!/usr/bin/env node
import dotenv from "dotenv";
import mongoose from "mongoose";
import Paper from "./models/Paper.js";
import Student from "./models/Student.js";
import Submisstion from "./models/Submisstion.js"; // assuming your model file is spelled this way
dotenv.config();

/**
 * Seeds 50 submissions for RP01 with a mix of correctness and statuses.
 * Cohorts:
 *  - 0..14   (15) => all-correct
 *  - 15..34  (20) => mostly-correct (~70%)
 *  - 35..44  (10) => random 0..4
 *  - 45..49   (5) => in-progress (partial answers, no score)
 */

// ===== CONFIG =====
const MONGODB_URI =
  process.env.MONGODB_URI


const PAPER_ID = "688e249f786955788cd002e7"; // RP01

// ===== UTILS =====
async function connectDB() {
  console.log(`[seed-rp01] Connecting to: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 7000 });
  console.log("[seed-rp01] MongoDB connected");
}

function instituteFromStudent(student) {
  if (
    student.followedTeachers &&
    student.followedTeachers.length > 0 &&
    student.followedTeachers[0].institute
  ) {
    return student.followedTeachers[0].institute;
  }
  throw new Error(
    `Student ${student.email || student._id} has no followedTeachers[0].institute`
  );
}

function rand0to4() {
  return Math.floor(Math.random() * 5);
}

/**
 * Build answers for ONE student, according to a mode.
 * Assumes paper.questions[].correctAnswer is already 0..4 (zero-based).
 * Modes: "correct" | "mostly-correct" | "random" | "partial"
 */
function buildAnswersForStudent(paper, mode = "random") {
  const totalQ = paper.questions.length;

  // Helper to clamp correctAnswer into [0..4] just in case
  const fix = (n) => Math.min(4, Math.max(0, Number.isFinite(n) ? n : 0));

  if (mode === "partial") {
    // in-progress: answer only the first ~1/3 of questions
    const take = Math.max(3, Math.floor(totalQ / 3));
    const answers = paper.questions.slice(0, take).map((q) => {
      const ca = fix(q.correctAnswer);
      const sel = rand0to4();
      return {
        questionId: q._id,
        selectedAnswer: sel,
        isCorrect: sel === ca,
        reviewed: false,
      };
    });
    return { answers, score: undefined, status: "in-progress" };
  }

  const answers = paper.questions.map((q) => {
    const ca = fix(q.correctAnswer);

    let sel;
    if (mode === "correct") {
      sel = ca;
    } else if (mode === "mostly-correct") {
      if (Math.random() < 0.7) {
        sel = ca;
      } else {
        // pick any wrong option
        const wrongs = [0, 1, 2, 3, 4].filter((x) => x !== ca);
        sel = wrongs[Math.floor(Math.random() * wrongs.length)];
      }
    } else {
      // random
      sel = rand0to4();
    }

    return {
      questionId: q._id,
      selectedAnswer: sel,
      isCorrect: sel === ca,
      reviewed: false,
    };
  });

  const score = answers.reduce((s, a) => s + (a.isCorrect ? 1 : 0), 0);
  return { answers, score, status: "done" };
}

// ===== MAIN =====
async function run() {
  try {
    await connectDB();

    // 1) Load paper
    const paper = await Paper.findById(PAPER_ID).lean();
    if (!paper) throw new Error(`Paper not found: ${PAPER_ID}`);
    if (!paper.questions?.length) throw new Error(`Paper has no questions`);
    console.log(
      `[seed-rp01] Paper: ${paper.title || PAPER_ID}, questions: ${paper.questions.length}`
    );

    // 2) Take first 50 students currently in DB
    const students = await Student.find({}).sort({ _id: 1 }).limit(50).lean();
    if (students.length === 0)
      throw new Error("No students found in Student collection.");
    console.log(`[seed-rp01] Students found: ${students.length} (seeding up to 50)`);

    // 3) Cleanup existing submissions for this paper by these students (idempotent)
    const studentIds = students.map((s) => s._id);
    const cleanup = await Submisstion.deleteMany({
      paperId: paper._id,
      studentId: { $in: studentIds },
    });
    if (cleanup.deletedCount) {
      console.log(`[seed-rp01] Cleaned existing submissions: ${cleanup.deletedCount}`);
    }

    // 4) Build per-student docs (DIFFERENT answers per student)
    const now = Date.now();
    const docs = students.map((s, i) => {
      let mode = "random";
      if (i < 15) mode = "correct";
      else if (i < 35) mode = "mostly-correct";
      else if (i < 45) mode = "random";
      else mode = "partial"; // last 5 in-progress

      const { answers, score, status } = buildAnswersForStudent(paper, mode);

      return {
        studentId: s._id, // if you truly need a User ref, map here
        instituteId: instituteFromStudent(s),
        paperId: paper._id,
        answers,
        status, // "done" or "in-progress"
        submittedAt: status === "done" ? new Date(now - i * 60_000) : undefined,
        score,
        islandRank: null,
        districtRank: null,
      };
    });

    // 5) Insert
    const inserted = await Submisstion.insertMany(docs, { ordered: true });

    // Summary
    const doneCount = inserted.filter((x) => x.status === "done").length;
    const ipCount = inserted.length - doneCount;

    console.log("\n=== RP01 MIXED SUBMISSIONS SEEDED ===");
    console.log(`Total submissions created: ${inserted.length}`);
    console.log(` - done: ${doneCount}`);
    console.log(` - in-progress: ${ipCount}`);
    console.log(`Questions per paper: ${paper.questions.length}`);
    console.log(
      `Cohorts => 15 all-correct, 20 mostly-correct, 10 random, 5 in-progress`
    );

    await mongoose.disconnect();
    console.log("\nDone. Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding submissions failed:", err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

run();
